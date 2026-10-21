import { isApiUrl, resolveApiUrl } from './apiConfig';
import { handleSessionExpired, notifyBlockedResponse, notifyForbidden } from '../auth/authEvents';
import { getTokenForRequest, isAuthEndpoint, recoverFromUnauthorized } from '../auth/refreshSession';
import { getAccessToken } from '../auth/tokenStore';

function sendWithToken(url, init, token) {
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }
  return fetch(url, { ...init, headers });
}

/**
 * Drop-in replacement for fetch() for backend calls: resolves paths against VITE_API_BASE_URL,
 * attaches the Bearer token, refreshes once on 401 and reports 403s. Returns the native Response.
 * Non-API URLs (blob:, data:, third-party hosts) are passed to fetch() untouched.
 */
export async function apiFetch(input, init = {}) {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : null;
  if (rawUrl === null || !isApiUrl(rawUrl)) {
    return fetch(input, init);
  }

  const url = resolveApiUrl(rawUrl);
  const authEndpoint = isAuthEndpoint(url);

  const token = authEndpoint ? getAccessToken() : await getTokenForRequest();
  let response = await sendWithToken(url, init, token);

  if (response.status === 401 && !authEndpoint) {
    const retryToken = await recoverFromUnauthorized(token);
    if (retryToken) {
      response = await sendWithToken(url, init, retryToken);
      if (response.status === 401) {
        handleSessionExpired();
      }
    }
  } else if (response.status === 401 && authEndpoint) {
    handleSessionExpired();
  }

  if (response.status === 403) {
    const body = await response.clone().json().catch(() => null);
    notifyForbidden(body?.message);
  } else if (response.status === 409 || response.status === 429) {
    const body = await response.clone().json().catch(() => null);
    notifyBlockedResponse(response.status, body);
  }

  return response;
}

export default apiFetch;
