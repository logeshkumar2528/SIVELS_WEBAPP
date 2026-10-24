import axiosInstance from '../api/axiosInstance';
import { resolveApiUrl } from '../api/apiConfig';
import { LOGIN_PATH, navigation } from './authEvents';
import { PERMISSIONS_CHANGED_EVENT } from './permissions';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getTabRole,
  setTabRole,
  TAB_ROLE_KEY,
  TAB_USER_KEY,
} from './tokenStore';
import {
  AGENT_DASHBOARD,
  AMS_DASHBOARD,
  BACKOFFICE_DASHBOARD,
  CREDIT_MANAGER_DASHBOARD,
  CUSTOMER_DASHBOARD,
  MASTER_DASHBOARD,
  RM_DASHBOARD,
} from '../services/moduleDetectionService';

export const CURRENT_USER_KEY = 'sivels_currentUser';

/**
 * roleCode → legacy role name (what the modules already check in sivels_currentUser.role),
 * default landing page and the verify-otp response property that holds the account record.
 */
export const ROLE_CONFIG = {
  MASTER_ADMIN: { legacyRole: 'Master', landingPath: MASTER_DASHBOARD, accountKey: 'staff' },
  AMS: { legacyRole: 'AMS', landingPath: AMS_DASHBOARD, accountKey: 'ams' },
  RM: { legacyRole: 'RM', landingPath: RM_DASHBOARD, accountKey: 'rm' },
  AGENT: { legacyRole: 'Agent', landingPath: AGENT_DASHBOARD, accountKey: 'agent' },
  BACK_OFFICE: { legacyRole: 'BackOffice', landingPath: BACKOFFICE_DASHBOARD, accountKey: 'backOffice' },
  CREDIT_MANAGER: { legacyRole: 'CreditManager', landingPath: CREDIT_MANAGER_DASHBOARD, accountKey: 'creditManager' },
  // Credit Head uses the Credit Manager module.
  CREDIT_HEAD: { legacyRole: 'CreditManager', landingPath: CREDIT_MANAGER_DASHBOARD, accountKey: 'creditHead' },
  CUSTOMER: { legacyRole: 'Customer', landingPath: CUSTOMER_DASHBOARD, accountKey: 'customer' },
};

const ROLE_NAME_TO_CODE = {
  masteradmin: 'MASTER_ADMIN',
  master: 'MASTER_ADMIN',
  ams: 'AMS',
  rm: 'RM',
  agent: 'AGENT',
  backoffice: 'BACK_OFFICE',
  creditmanager: 'CREDIT_MANAGER',
  credithead: 'CREDIT_HEAD',
  customer: 'CUSTOMER',
};

// URL prefixes served by a module (see vite.config.js / worker.js).
const SERVED_PATH_PREFIXES = [
  '/Agent', '/backoffice', '/investors', '/rm', '/client', '/dashboard', '/my-loan',
  '/emi-history', '/profile', '/credit', '/company', '/master',
];

export function normalizeRoleCode(roleCode, roleName) {
  const code = String(roleCode || '').trim().toUpperCase();
  if (ROLE_CONFIG[code]) return code;
  const key = String(roleName || '').replace(/[\s_-]/g, '').toLowerCase();
  return ROLE_NAME_TO_CODE[key] || null;
}

function isServedPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return false;
  return SERVED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)
  );
}

export function resolveLandingPath(roleCode, landingPath) {
  if (isServedPath(landingPath)) return landingPath;
  return ROLE_CONFIG[roleCode]?.landingPath || LOGIN_PATH;
}

export function getStoredUser(allowedRoles = []) {
  const normAllowed = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => String(r).trim().toUpperCase()).filter(Boolean)
    : [];

  // Priority 1: Current tab sessionStorage
  try {
    if (typeof sessionStorage !== 'undefined') {
      const tabRaw = sessionStorage.getItem(TAB_USER_KEY);
      if (tabRaw) {
        const parsedTab = JSON.parse(tabRaw);
        if (parsedTab && typeof parsedTab === 'object') {
          const roleCode = normalizeRoleCode(parsedTab.roleCode, parsedTab.role);
          if (normAllowed.length === 0 || (roleCode && normAllowed.includes(roleCode))) {
            return parsedTab;
          }
        }
      }
    }
  } catch {}

  // Priority 2: Role-scoped localStorage for allowed roles
  if (normAllowed.length > 0) {
    for (const r of normAllowed) {
      try {
        const roleRaw = localStorage.getItem(`sivels_session_${r}`);
        if (roleRaw) {
          const parsed = JSON.parse(roleRaw);
          if (parsed && typeof parsed === 'object') {
            // Hydrate current tab sessionStorage
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(TAB_USER_KEY, JSON.stringify(parsed));
              sessionStorage.setItem(TAB_ROLE_KEY, r);
            }
            return parsed;
          }
        }
      } catch {}
    }

    // Role-specific legacy caches fallback
    for (const r of normAllowed) {
      try {
        if (r === 'AGENT') {
          const raw = localStorage.getItem('agentData');
          if (raw) {
            const agent = JSON.parse(raw);
            if (agent && typeof agent === 'object') {
              return { ...agent, role: 'Agent', roleCode: 'AGENT', landingPath: AGENT_DASHBOARD };
            }
          }
        } else if (r === 'RM') {
          const raw = localStorage.getItem('rmData');
          if (raw) {
            const rm = JSON.parse(raw);
            if (rm && typeof rm === 'object') {
              return { ...rm, role: 'RM', roleCode: 'RM', landingPath: RM_DASHBOARD };
            }
          }
        } else if (r === 'BACK_OFFICE') {
          const raw = localStorage.getItem('backOfficeData') || localStorage.getItem('backOfficeAuth');
          if (raw) {
            const bo = JSON.parse(raw);
            if (bo && typeof bo === 'object') {
              return { ...bo, role: 'BackOffice', roleCode: 'BACK_OFFICE', landingPath: BACKOFFICE_DASHBOARD };
            }
          }
        } else if (r === 'MASTER_ADMIN' || r === 'AMS') {
          const raw = localStorage.getItem('masterData') || (r === 'AMS' ? localStorage.getItem('amsData') : null);
          if (raw) {
            const m = JSON.parse(raw);
            if (m && typeof m === 'object') {
              return {
                ...m,
                role: r === 'AMS' ? 'AMS' : 'Master',
                roleCode: r,
                landingPath: r === 'AMS' ? AMS_DASHBOARD : MASTER_DASHBOARD,
              };
            }
          }
        } else if (r === 'CUSTOMER') {
          const raw = localStorage.getItem('customerData');
          if (raw) {
            const c = JSON.parse(raw);
            if (c && typeof c === 'object') {
              return { ...c, role: 'Customer', roleCode: 'CUSTOMER', landingPath: CUSTOMER_DASHBOARD };
            }
          }
        } else if (r === 'CREDIT_MANAGER' || r === 'CREDIT_HEAD') {
          const raw = localStorage.getItem('creditManagerData') || localStorage.getItem('creditManagerAuth');
          if (raw) {
            const cm = JSON.parse(raw);
            if (cm && typeof cm === 'object') {
              return { ...cm, role: 'CreditManager', roleCode: r, landingPath: CREDIT_MANAGER_DASHBOARD };
            }
          }
        }
      } catch {}
    }
  }

  // Priority 3: Fallback to global sivels_currentUser ONLY if it matches allowedRoles (or no allowedRoles filter)
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      const roleCode = normalizeRoleCode(parsed.roleCode, parsed.role);
      if (normAllowed.length === 0 || (roleCode && normAllowed.includes(roleCode))) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getStoredRoleCode(allowedRoles = []) {
  // 1. Check tab role
  const tabRole = getTabRole();
  const normTabRole = tabRole ? String(tabRole).trim().toUpperCase() : null;
  const normAllowed = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => String(r).trim().toUpperCase()).filter(Boolean)
    : [];

  if (normTabRole && (normAllowed.length === 0 || normAllowed.includes(normTabRole))) {
    return normTabRole;
  }

  // 2. Derive from getStoredUser(allowedRoles)
  const user = getStoredUser(allowedRoles);
  return user ? normalizeRoleCode(user.roleCode, user.role) : null;
}

export function getStoredLandingPath(allowedRoles = []) {
  const user = getStoredUser(allowedRoles);
  const roleCode = user ? normalizeRoleCode(user.roleCode, user.role) : null;
  return roleCode ? resolveLandingPath(roleCode, user.landingPath) : LOGIN_PATH;
}

function setItem(key, value) {
  localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
}

function toPositiveNumber(value) {
  const num = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Builds the sivels_currentUser object for a successful verify-otp response.
 * Returns null when the response does not carry a recognised role.
 */
export function buildLoginUser(result, mobileNumber) {
  const roleCode = normalizeRoleCode(result?.roleCode, result?.role);
  if (!roleCode) return null;
  const config = ROLE_CONFIG[roleCode];
  const account = result[config.accountKey] || result.staff || {};

  return {
    ...account,
    mobileNumber,
    role: config.legacyRole,
    roleCode,
    ...roleDetails(result),
    staffId: result.staffId ?? null,
    userId: result.userId ?? account.userId ?? null,
    landingPath: resolveLandingPath(roleCode, result.landingPath),
  };
}

// roleCode stays the base (system) role used for routing; roleId/roleName name the actual role.
function roleDetails(result) {
  return {
    ...(result?.roleId != null ? { roleId: result.roleId } : {}),
    ...(result?.roleName ? { roleName: result.roleName } : {}),
    ...(Array.isArray(result?.permissions) ? { permissions: result.permissions } : {}),
  };
}

/**
 * Writes the per-role localStorage keys each module reads (agentData, rmId, backOfficeAuth, …)
 * in the same shape the modules have always used. Returns the page to redirect to.
 */
export function persistRoleSession(result, userData) {
  const { roleCode, mobileNumber } = userData;
  const config = ROLE_CONFIG[roleCode];
  const account = result[config.accountKey] || result.staff || {};

  // Tab-scoped persistence
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TAB_USER_KEY, JSON.stringify(userData));
      sessionStorage.setItem(TAB_ROLE_KEY, roleCode);
    }
  } catch {}

  // Role-scoped persistent storage
  setItem(`sivels_session_${roleCode}`, userData);

  // Global backward-compatibility mirror
  setItem(CURRENT_USER_KEY, userData);

  switch (roleCode) {
    case 'AGENT': {
      setItem('agentData', account);
      const agentId = account.agentId ?? account.AgentId ?? account.id;
      if (agentId) setItem('agentId', String(agentId));
      break;
    }
    case 'RM': {
      setItem('rmData', account);
      const rmId = account.rmId ?? account.RMId ?? account.id;
      if (rmId) setItem('rmId', String(rmId));
      break;
    }
    case 'AMS': {
      setItem('amsData', account);
      const amsId = account.amsId ?? account.AmsId ?? account.id;
      if (amsId) setItem('amsId', String(amsId));
      break;
    }
    case 'CUSTOMER': {
      setItem('customerData', account);
      const customerId = account.agentCustomerId ?? account.customerId ?? account.id;
      if (customerId) setItem('customerId', String(customerId));
      break;
    }
    case 'MASTER_ADMIN': {
      setItem('masterData', account);
      break;
    }
    case 'BACK_OFFICE': {
      const boId = account.backOfficeId ?? account.BackOfficeId ?? account.id ?? result.userId;
      setItem('backOfficeData', account);
      if (boId) setItem('backOfficeId', String(boId));
      setItem('backOfficeAuth', {
        isAuthenticated: true,
        backOfficeId: boId ? Number(boId) : null,
        id: boId ? Number(boId) : null,
        name: account.fullName || account.name || '',
        role: account.role || 'BackOffice',
        mobile: mobileNumber,
        loginTimestamp: new Date().toISOString(),
      });
      break;
    }
    case 'CREDIT_MANAGER':
    case 'CREDIT_HEAD': {
      const cmId =
        account.creditManagerId ?? account.CreditManagerId ?? account.creditHeadId ?? account.id ?? result.staffId;
      const uId = toPositiveNumber(result.userId ?? account.userId);
      const creditManagerData = {
        ...account,
        ...(cmId && account.creditManagerId == null ? { creditManagerId: cmId } : {}),
        ...(uId ? { userId: uId } : {}),
      };

      setItem('creditManagerData', creditManagerData);
      if (cmId) setItem('creditManagerId', String(cmId));
      setItem('creditManagerAuth', {
        isAuthenticated: true,
        creditManagerId: cmId ? Number(cmId) : null,
        userId: uId,
        creditManagerCode: account.creditManagerCode || account.code || '',
        fullName: account.fullName || account.name || 'Credit Manager',
        mobileNumber,
        emailAddress: account.emailAddress || account.email || '',
        branch: account.branch || '',
        role: 'CreditManager',
        loginTimestamp: new Date().toISOString(),
      });
      setItem(CURRENT_USER_KEY, {
        ...creditManagerData,
        userId: uId,
        role: 'CreditManager',
        roleCode,
        ...roleDetails(userData),
        staffId: userData.staffId,
        landingPath: userData.landingPath,
        mobileNumber,
      });
      break;
    }
    default:
      break;
  }

  return userData.landingPath;
}

/**
 * GET /auth/me and refresh the stored identity. Resolves to the normalised roleCode,
 * or null when the backend did not return a recognised role.
 */
export async function restoreSession(allowedRoles = []) {
  const response = await axiosInstance.get('/auth/me');
  const me = response?.data || {};
  const roleCode = normalizeRoleCode(me.roleCode, me.role);
  if (!roleCode) return null;

  const existing = getStoredUser(allowedRoles) || {};
  const merged = {
    ...existing,
    role: ROLE_CONFIG[roleCode].legacyRole,
    roleCode,
    ...roleDetails(me),
    mobileNumber: existing.mobileNumber || me.mobileNumber,
  };
  if (me.staffId != null) merged.staffId = me.staffId;
  if (me.landingPath) merged.landingPath = resolveLandingPath(roleCode, me.landingPath);
  if (!existing.fullName && me.fullName) merged.fullName = me.fullName;

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TAB_USER_KEY, JSON.stringify(merged));
      sessionStorage.setItem(TAB_ROLE_KEY, roleCode);
    }
  } catch {}

  setItem(`sivels_session_${roleCode}`, merged);
  setItem(CURRENT_USER_KEY, merged);
  window.dispatchEvent(new CustomEvent(PERMISSIONS_CHANGED_EVENT));
  return roleCode;
}

let logoutPromise = null;

/** Revokes the refresh token on the server (errors ignored), clears the session and opens /login. */
export function logout(options) {
  if (!logoutPromise) {
    logoutPromise = performLogout(options).finally(() => {
      logoutPromise = null;
    });
  }
  return logoutPromise;
}

async function performLogout({ allDevices = false } = {}) {
  const refreshToken = getRefreshToken();
  const accessToken = getAccessToken();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 5000) : null;

  try {
    await fetch(resolveApiUrl('/auth/logout'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(allDevices ? { refreshToken, allDevices: true } : { refreshToken }),
      signal: controller?.signal,
    });
  } catch {
    // Logout must always complete locally.
  } finally {
    if (timer) clearTimeout(timer);
  }

  clearSession();
  navigation.replace(LOGIN_PATH);
}
