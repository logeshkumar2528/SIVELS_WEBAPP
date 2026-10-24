import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigation, resetAuthEventsForTests } from './authEvents';
import {
  SessionExpiredError,
  getTokenForRequest,
  recoverFromUnauthorized,
  refreshAccessToken,
  resetRefreshStateForTests,
} from './refreshSession';
import { getAccessToken, getRefreshToken, saveTokens } from './tokenStore';

const future = (ms) => new Date(Date.now() + ms).toISOString();

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function refreshSuccess(n) {
  return jsonResponse(200, {
    token: `access-${n}`,
    expiresAt: future(30 * 60_000),
    refreshToken: `refresh-${n}`,
    refreshTokenExpiresAt: future(7 * 24 * 3600_000),
  });
}

describe('refreshSession', () => {
  let fetchMock;
  let replaceSpy;

  beforeEach(() => {
    localStorage.clear();
    resetRefreshStateForTests();
    resetAuthEventsForTests();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    replaceSpy = vi.spyOn(navigation, 'replace').mockImplementation(() => {});
    saveTokens({
      token: 'access-1',
      expiresAt: future(30 * 60_000),
      refreshToken: 'refresh-1',
      refreshTokenExpiresAt: future(7 * 24 * 3600_000),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends a single refresh request for concurrent callers and stores the rotated pair', async () => {
    fetchMock.mockResolvedValueOnce(refreshSuccess(2));

    const results = await Promise.all([
      refreshAccessToken('access-1'),
      refreshAccessToken('access-1'),
      refreshAccessToken('access-1'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/refresh$/);
    expect(JSON.parse(init.body)).toEqual({ refreshToken: 'refresh-1' });
    expect(results).toEqual(['access-2', 'access-2', 'access-2']);
    expect(getAccessToken()).toBe('access-2');
    expect(getRefreshToken()).toBe('refresh-2');
  });

  it('rejects with SessionExpiredError when the refresh endpoint returns 401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }));
    await expect(refreshAccessToken('access-1')).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('refreshes once before a request when the access token is missing', async () => {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    fetchMock.mockResolvedValueOnce(refreshSuccess(2));

    const [a, b] = await Promise.all([getTokenForRequest(), getTokenForRequest()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe('access-2');
    expect(b).toBe('access-2');
  });

  it('refreshes proactively when the access token expires within 60 seconds', async () => {
    localStorage.setItem('authTokenExpiresAt', future(20_000));
    sessionStorage.setItem('authTokenExpiresAt', future(20_000));
    fetchMock.mockResolvedValueOnce(refreshSuccess(2));

    expect(await getTokenForRequest()).toBe('access-2');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when the token is still valid', async () => {
    expect(await getTokenForRequest()).toBe('access-1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reuses a token that was already rotated instead of refreshing again', async () => {
    saveTokens({ token: 'access-9', expiresAt: future(30 * 60_000), refreshToken: 'refresh-9' });

    expect(await recoverFromUnauthorized('access-1')).toBe('access-9');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears the session and redirects to /login when refresh fails', async () => {
    localStorage.setItem('rmId', '20');
    localStorage.setItem('sivels-rm-onboarding-drafts-v9', 'draft');
    fetchMock.mockResolvedValueOnce(jsonResponse(401, {}));

    expect(await recoverFromUnauthorized('access-1')).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem('rmId')).toBeNull();
    expect(localStorage.getItem('sivels-rm-onboarding-drafts-v9')).toBe('draft');
    expect(replaceSpy).toHaveBeenCalledWith('/login');
  });

  it('logs out without calling refresh when there is no refresh token (customer)', async () => {
    saveTokens({ token: 'customer-token', expiresAt: future(12 * 3600_000), refreshToken: null });

    expect(await recoverFromUnauthorized('customer-token')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    expect(replaceSpy).toHaveBeenCalledWith('/login');
  });

  it('keeps the session when refresh fails because of a network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    expect(await recoverFromUnauthorized('access-1')).toBeNull();
    expect(getRefreshToken()).toBe('refresh-1');
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});
