import { resolveApiUrl } from '../api/apiConfig';
import { handleSessionExpired } from './authEvents';
import { storeRoleDetails } from './permissions';
import {
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpiringSoon,
  saveTokens,
} from './tokenStore';

export const PROACTIVE_REFRESH_MS = 60_000;
const REFRESH_LOCK_NAME = 'sivels-auth-refresh';
const AUTH_ENDPOINT_PATTERN = /\/(MobileOtp\/|auth\/(refresh|logout)(\/|\?|$))/i;

export class SessionExpiredError extends Error {
  constructor(message = 'Session expired') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export function isAuthEndpoint(url) {
  return AUTH_ENDPOINT_PATTERN.test(String(url || ''));
}

let inflight = null;

// Refresh tokens are single-use: two tabs refreshing with the same token would revoke the
// whole session, so refreshes are serialised across tabs when the browser supports it.
function withRefreshLock(task) {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (locks && typeof locks.request === 'function') {
    return locks.request(REFRESH_LOCK_NAME, task);
  }
  return task();
}

async function requestNewTokens(refreshToken) {
  const response = await fetch(resolveApiUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new SessionExpiredError();
  }
  if (!response.ok) {
    throw new Error(`Token refresh failed (${response.status})`);
  }

  const data = await response.json().catch(() => null);
  if (!saveTokens(data)) {
    throw new SessionExpiredError();
  }
  storeRoleDetails(data);
  return data.token;
}

function runRefresh(staleAccessToken) {
  return withRefreshLock(async () => {
    const current = getAccessToken();
    if (current && current !== staleAccessToken && !isAccessTokenExpiringSoon(PROACTIVE_REFRESH_MS)) {
      return current;
    }
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new SessionExpiredError();
    }
    return requestNewTokens(refreshToken);
  });
}

/**
 * Exchanges the stored refresh token for a new token pair. Concurrent callers share a single
 * request. Rejects with SessionExpiredError when the user has to log in again.
 */
export function refreshAccessToken(staleAccessToken = getAccessToken()) {
  if (!inflight) {
    inflight = runRefresh(staleAccessToken).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/** Access token to attach to an outgoing API request, refreshed first when missing or about to expire. */
export async function getTokenForRequest() {
  const token = getAccessToken();
  const needsRefresh = !token || isAccessTokenExpiringSoon(PROACTIVE_REFRESH_MS);
  if (!needsRefresh || !getRefreshToken()) {
    return token;
  }
  try {
    return await refreshAccessToken(token);
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      handleSessionExpired();
      return null;
    }
    return token;
  }
}

/**
 * Called after a 401. Returns the token to retry with, or null when the request should fail
 * (the session has already been cleared if it can no longer be refreshed).
 */
export async function recoverFromUnauthorized(sentToken) {
  const current = getAccessToken();
  if (current && current !== sentToken) {
    return current;
  }
  try {
    return await refreshAccessToken(sentToken);
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      handleSessionExpired();
    }
    return null;
  }
}

export function resetRefreshStateForTests() {
  inflight = null;
}
