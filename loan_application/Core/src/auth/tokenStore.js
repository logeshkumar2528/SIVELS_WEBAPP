export const ACCESS_TOKEN_KEY = 'authToken';
export const ACCESS_TOKEN_EXPIRES_AT_KEY = 'authTokenExpiresAt';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const REFRESH_TOKEN_EXPIRES_AT_KEY = 'refreshTokenExpiresAt';

export const TOKEN_KEYS = [
  ACCESS_TOKEN_KEY,
  ACCESS_TOKEN_EXPIRES_AT_KEY,
  REFRESH_TOKEN_KEY,
  REFRESH_TOKEN_EXPIRES_AT_KEY,
];

// Only login/session keys. Wizard drafts and review state must survive logout.
export const SESSION_KEYS = [
  'sivels_currentUser',
  'sivels_permissions',
  'sivels_roles',
  'agentData',
  'agentId',
  'rmData',
  'rmId',
  'amsData',
  'amsId',
  'customerData',
  'customerId',
  'masterData',
  'backOfficeData',
  'backOfficeId',
  'backOfficeAuth',
  'creditManagerData',
  'creditManagerId',
  'creditManagerAuth',
];

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined || value === '') {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, String(value));
    }
  } catch {
    // Storage unavailable (private mode / quota); the session simply won't persist.
  }
}

/**
 * Persists the tokens from a verify-otp or auth/refresh response.
 * A response without `refreshToken` (customer login) clears any stale refresh token.
 */
export function saveTokens(response) {
  const token = response?.token;
  if (!token) return false;

  write(ACCESS_TOKEN_KEY, token);
  write(ACCESS_TOKEN_EXPIRES_AT_KEY, response.expiresAt);
  write(REFRESH_TOKEN_KEY, response.refreshToken);
  write(REFRESH_TOKEN_EXPIRES_AT_KEY, response.refreshToken ? response.refreshTokenExpiresAt : null);
  return true;
}

export function getAccessToken() {
  return read(ACCESS_TOKEN_KEY) || null;
}

export function getRefreshToken() {
  return read(REFRESH_TOKEN_KEY) || null;
}

function readTimestamp(key) {
  const raw = read(key);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

export function getAccessTokenExpiresAt() {
  return readTimestamp(ACCESS_TOKEN_EXPIRES_AT_KEY);
}

export function getRefreshTokenExpiresAt() {
  return readTimestamp(REFRESH_TOKEN_EXPIRES_AT_KEY);
}

export function isAccessTokenExpiringSoon(thresholdMs = 60_000, now = Date.now()) {
  const expiresAt = getAccessTokenExpiresAt();
  return expiresAt !== null && expiresAt - now < thresholdMs;
}

export function hasSession() {
  return Boolean(getAccessToken() || getRefreshToken());
}

export function clearSession() {
  [...TOKEN_KEYS, ...SESSION_KEYS].forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });
}
