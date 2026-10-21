import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './apiFetch';
import { API_BASE_URL } from './apiConfig';
import { FORBIDDEN_EVENT, navigation, resetAuthEventsForTests } from '../auth/authEvents';
import { resetRefreshStateForTests } from '../auth/refreshSession';
import { getAccessToken, saveTokens } from '../auth/tokenStore';

const future = (ms) => new Date(Date.now() + ms).toISOString();

function refreshResponse(n) {
  return new Response(
    JSON.stringify({ token: `access-${n}`, expiresAt: future(30 * 60_000), refreshToken: `refresh-${n}` }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

const bearerOf = (init) => new Headers(init?.headers).get('Authorization');

describe('apiFetch', () => {
  let fetchMock;
  let replaceSpy;

  beforeEach(() => {
    localStorage.clear();
    resetRefreshStateForTests();
    resetAuthEventsForTests();
    saveTokens({ token: 'access-1', expiresAt: future(30 * 60_000), refreshToken: 'refresh-1' });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    replaceSpy = vi.spyOn(navigation, 'replace').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('resolves paths against the API base URL and sends the Bearer token', async () => {
    fetchMock.mockResolvedValueOnce(new Response('[]', { status: 200 }));

    const response = await apiFetch('/RMMaster', { headers: { Accept: 'application/json' } });

    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/RMMaster`);
    expect(bearerOf(init)).toBe('Bearer access-1');
    expect(new Headers(init.headers).get('Accept')).toBe('application/json');
  });

  it('rebases the legacy hardcoded API host onto VITE_API_BASE_URL', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await apiFetch('https://fusiontecsoftware.com/sivels/api/ApplicationKYCDocuments/5');

    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/ApplicationKYCDocuments/5`);
  });

  it('keeps FormData bodies without a Content-Type header', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const form = new FormData();
    form.append('file', new Blob(['x']), 'x.txt');

    await apiFetch('/upload', { method: 'POST', body: form });

    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe(form);
    expect(new Headers(init.headers).get('Content-Type')).toBeNull();
  });

  it('refreshes on 401 and retries the request once with the new token', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(refreshResponse(2))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

    const response = await apiFetch('/LoanApplication/1');

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/refresh$/);
    expect(bearerOf(fetchMock.mock.calls[2][1])).toBe('Bearer access-2');
    expect(getAccessToken()).toBe('access-2');
  });

  it('passes blob: URLs and third-party hosts through untouched, without a token', async () => {
    fetchMock.mockResolvedValue(new Response('x', { status: 200 }));

    await apiFetch('blob:http://localhost/abc');
    await apiFetch('https://api.example.com/pincode/600001');

    expect(fetchMock.mock.calls[0]).toEqual(['blob:http://localhost/abc', {}]);
    expect(fetchMock.mock.calls[1]).toEqual(['https://api.example.com/pincode/600001', {}]);
  });

  it('reports 403 without logging out', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 403 }));
    const listener = vi.fn();
    window.addEventListener(FORBIDDEN_EVENT, listener);

    const response = await apiFetch('/AadhaarKyc/details/1');

    window.removeEventListener(FORBIDDEN_EVENT, listener);
    expect(response.status).toBe(403);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('access-1');
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});
