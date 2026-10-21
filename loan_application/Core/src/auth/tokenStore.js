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

export const TAB_ROLE_KEY = 'sivels_tabRole';
export const TAB_USER_KEY = 'sivels_tabUser';
export const LOGOUT_EVENT_KEY = 'sivels_logout_event';

export const KNOWN_ROLES = [
  'AGENT',
  'RM',
  'AMS',
  'BACK_OFFICE',
  'CREDIT_MANAGER',
  'CREDIT_HEAD',
  'CUSTOMER',
  'MASTER_ADMIN',
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

export function getTabRole() {
  try {
    return (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TAB_ROLE_KEY) : null) || null;
  } catch {
    return null;
  }
}

export function setTabRole(roleCode) {
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (roleCode) {
        sessionStorage.setItem(TAB_ROLE_KEY, String(roleCode));
      } else {
        sessionStorage.removeItem(TAB_ROLE_KEY);
      }
    }
  } catch {}
}

function read(key, roleCode = null) {
  try {
    // 1. Tab-isolated sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      const tabVal = sessionStorage.getItem(key);
      if (tabVal) return tabVal;
    }

    // 2. Role-scoped localStorage
    const activeRole = roleCode || getTabRole();
    if (activeRole) {
      const roleVal = localStorage.getItem(`${key}_${activeRole}`);
      if (roleVal) return roleVal;
    }

    // 3. Fallback to global localStorage
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value, roleCode = null) {
  try {
    const activeRole = roleCode || getTabRole();

    // Tab-scoped
    if (typeof sessionStorage !== 'undefined') {
      if (value === null || value === undefined || value === '') {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, String(value));
      }
    }

    // Role-scoped
    if (activeRole) {
      const roleKey = `${key}_${activeRole}`;
      if (value === null || value === undefined || value === '') {
        localStorage.removeItem(roleKey);
      } else {
        localStorage.setItem(roleKey, String(value));
      }
    }

    // Global compatibility
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
export function saveTokens(response, maybeRoleCode = null) {
  const token = response?.token;
  if (!token) return false;

  const rawRole = maybeRoleCode || response?.roleCode || response?.role || getTabRole();
  const roleCode = rawRole ? String(rawRole).trim().toUpperCase() : null;

  if (roleCode) {
    setTabRole(roleCode);
  }

  write(ACCESS_TOKEN_KEY, token, roleCode);
  write(ACCESS_TOKEN_EXPIRES_AT_KEY, response.expiresAt, roleCode);
  write(REFRESH_TOKEN_KEY, response.refreshToken, roleCode);
  write(REFRESH_TOKEN_EXPIRES_AT_KEY, response.refreshToken ? response.refreshTokenExpiresAt : null, roleCode);
  return true;
}

export function getAccessToken(roleCode = null) {
  return read(ACCESS_TOKEN_KEY, roleCode) || null;
}

export function getRefreshToken(roleCode = null) {
  return read(REFRESH_TOKEN_KEY, roleCode) || null;
}

function readTimestamp(key, roleCode = null) {
  const raw = read(key, roleCode);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

export function getAccessTokenExpiresAt(roleCode = null) {
  return readTimestamp(ACCESS_TOKEN_EXPIRES_AT_KEY, roleCode);
}

export function getRefreshTokenExpiresAt(roleCode = null) {
  return readTimestamp(REFRESH_TOKEN_EXPIRES_AT_KEY, roleCode);
}

export function isAccessTokenExpiringSoon(thresholdMs = 60_000, now = Date.now(), roleCode = null) {
  const expiresAt = getAccessTokenExpiresAt(roleCode);
  return expiresAt !== null && expiresAt - now < thresholdMs;
}

export function hasSession(roleCode = null) {
  return Boolean(getAccessToken(roleCode) || getRefreshToken(roleCode));
}

export function clearSession() {
  // Clear tab storage
  try {
    if (typeof sessionStorage !== 'undefined') {
      TOKEN_KEYS.forEach((k) => sessionStorage.removeItem(k));
      sessionStorage.removeItem(TAB_ROLE_KEY);
      sessionStorage.removeItem(TAB_USER_KEY);
    }
  } catch {}

  // Clear role-scoped tokens & sessions
  KNOWN_ROLES.forEach((r) => {
    TOKEN_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(`${k}_${r}`);
      } catch {}
    });
    try {
      localStorage.removeItem(`sivels_session_${r}`);
    } catch {}
  });

  // Clear global tokens & session keys
  [...TOKEN_KEYS, ...SESSION_KEYS].forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });

  // Signal global logout to other tabs via storage event
  try {
    localStorage.setItem(LOGOUT_EVENT_KEY, String(Date.now()));
  } catch {}
}
