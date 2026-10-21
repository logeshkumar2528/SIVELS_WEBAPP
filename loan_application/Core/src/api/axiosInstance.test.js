import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from './axiosInstance';
import { FORBIDDEN_EVENT, navigation, resetAuthEventsForTests } from '../auth/authEvents';
import { resetRefreshStateForTests } from '../auth/refreshSession';
import { getAccessToken, getRefreshToken, saveTokens } from '../auth/tokenStore';

const future = (ms) => new Date(Date.now() + ms).toISOString();

function authHeader(config) {
  const headers = config.headers;
  return typeof headers?.get === 'function' ? headers.get('Authorization') : headers?.Authorization;
}

function respond(config, status, data = {}) {
  const response = { data, status, statusText: String(status), headers: {}, config, request: {} };
  if (status >= 200 && status < 300) return Promise.resolve(response);
  return Promise.reject(new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, {}, response));
}

function refreshResponse(n) {
  return new Response(
    JSON.stringify({
      token: `access-${n}`,
      expiresAt: future(30 * 60_000),
      refreshToken: `refresh-${n}`,
      refreshTokenExpiresAt: future(7 * 24 * 3600_000),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

describe('axiosInstance auth interceptors', () => {
  let adapter;
  let fetchMock;
  let replaceSpy;
  let originalAdapter;

  beforeEach(() => {
    localStorage.clear();
    resetRefreshStateForTests();
    resetAuthEventsForTests();
    saveTokens({
      token: 'access-1',
      expiresAt: future(30 * 60_000),
      refreshToken: 'refresh-1',
      refreshTokenExpiresAt: future(7 * 24 * 3600_000),
    });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    replaceSpy = vi.spyOn(navigation, 'replace').mockImplementation(() => {});
    adapter = vi.fn();
    originalAdapter = axiosInstance.defaults.adapter;
    axiosInstance.defaults.adapter = adapter;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    axiosInstance.defaults.adapter = originalAdapter;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('attaches the Bearer token to every request', async () => {
    adapter.mockImplementation((config) => respond(config, 200, { ok: true }));

    await axiosInstance.get('/RMMaster');

    expect(authHeader(adapter.mock.calls[0][0])).toBe('Bearer access-1');
  });

  it('refreshes once for concurrent 401s and replays every queued request', async () => {
    adapter.mockImplementation((config) =>
      authHeader(config) === 'Bearer access-2'
        ? respond(config, 200, { url: config.url })
        : respond(config, 401)
    );
    fetchMock.mockResolvedValueOnce(refreshResponse(2));

    const results = await Promise.all([
      axiosInstance.get('/one'),
      axiosInstance.get('/two'),
      axiosInstance.post('/three', { a: 1 }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.data.url)).toEqual(['/one', '/two', '/three']);
    expect(getAccessToken()).toBe('access-2');
    expect(getRefreshToken()).toBe('refresh-2');
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('clears the session and redirects to /login when refresh fails', async () => {
    adapter.mockImplementation((config) => respond(config, 401));
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));

    await expect(axiosInstance.get('/AgentMaster')).rejects.toBeInstanceOf(AxiosError);

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(replaceSpy).toHaveBeenCalledWith('/login');
  });

  it('logs out when the retried request is still unauthorized', async () => {
    adapter.mockImplementation((config) => respond(config, 401));
    fetchMock.mockResolvedValueOnce(refreshResponse(2));

    await expect(axiosInstance.get('/AgentMaster')).rejects.toBeInstanceOf(AxiosError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(replaceSpy).toHaveBeenCalledWith('/login');
  });

  it('does not refresh on a 401 from the OTP endpoints', async () => {
    adapter.mockImplementation((config) => respond(config, 401, { message: 'Invalid OTP' }));

    await expect(
      axiosInstance.post('/MobileOtp/verify-mobile-otp', { mobileNumber: '9999999999', otp: '000000' })
    ).rejects.toBeInstanceOf(AxiosError);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it('shows the permission notice on 403 without logging out', async () => {
    adapter.mockImplementation((config) => respond(config, 403));
    const listener = vi.fn();
    window.addEventListener(FORBIDDEN_EVENT, listener);

    await expect(axiosInstance.get('/AadhaarKyc/details/1')).rejects.toBeInstanceOf(AxiosError);

    window.removeEventListener(FORBIDDEN_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('access-1');
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('sends FormData uploads unchanged with the Bearer token', async () => {
    adapter.mockImplementation((config) => respond(config, 200));
    const form = new FormData();
    form.append('file', new Blob(['x']), 'x.txt');

    await axiosInstance.post('/upload', form);

    const config = adapter.mock.calls[0][0];
    expect(config.data).toBe(form);
    expect(authHeader(config)).toBe('Bearer access-1');
  });
});
