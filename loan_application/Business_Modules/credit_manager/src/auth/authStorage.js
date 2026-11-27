/**
 * authStorage.js
 * --------------------
 * Authentication session management for the Credit Manager module.
 * Manages dedicated localStorage keys and coordinates session retrieval.
 *
 * Keys (written by Core VerifyOTP on login):
 *   - 'creditManagerData' : Full CreditManagerMaster record
 *   - 'creditManagerAuth' : Structured session object
 *   - 'creditManagerId'   : Master primary key
 */

import { getTabRole, TAB_ROLE_KEY, TAB_USER_KEY } from '../../../../Core/src/auth/tokenStore';

export const CREDIT_MANAGER_AUTH_KEY = 'creditManagerAuth';
export const CREDIT_MANAGER_DATA_KEY = 'creditManagerData';
export const CREDIT_MANAGER_ID_KEY = 'creditManagerId';

function isCreditManagerRole(role) {
  const r = String(role || '').toLowerCase();
  return r.includes('creditmanager') || r.includes('credit_manager') || r.includes('credit manager');
}

function isCreditManagerSessionUser(user) {
  const roleCode = String(user?.roleCode || '').trim().toUpperCase();
  return roleCode === 'CREDIT_MANAGER' || roleCode === 'CREDIT_HEAD' || isCreditManagerRole(user?.role);
}

function readJson(storage, key) {
  try {
    const raw = storage?.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeAuth(source, fallbackId = null) {
  if (!source || typeof source !== 'object' || !isCreditManagerSessionUser(source)) return null;
  const cmId = toValidId(
    source.creditManagerId ??
      source.CreditManagerId ??
      source.creditHeadId ??
      source.legacyId ??
      source.id ??
      fallbackId
  );
  if (!cmId) return null;

  const role = source.role || 'CreditManager';
  return {
    ...source,
    isAuthenticated: true,
    id: cmId,
    creditManagerId: cmId,
    userId: toValidId(source.userId),
    staffId: source.staffId ?? null,
    staffCode: source.staffCode || source.employeeCode || '',
    name: source.name || source.fullName || '',
    fullName: source.fullName || source.name || '',
    role,
    roleCode: source.roleCode || null,
    roleId: source.roleId ?? null,
    roleName: source.roleName || role,
    mobile: source.mobile || source.mobileNumber || '',
    creditManagerCode: source.staffCode || source.employeeCode || source.creditManagerCode || source.code || '',
    email: source.email || source.emailAddress || '',
    legacyId: source.legacyId ?? null,
    departmentCode: source.departmentCode || '',
    permissions: Array.isArray(source.permissions) ? source.permissions : undefined,
    loginTimestamp: source.loginTimestamp || null,
  };
}

function toValidId(value) {
  const num = Number(value);
  return value != null && !isNaN(num) && num > 0 ? num : null;
}

/**
 * Retrieve current Credit Manager auth state.
 * Checks the tab-scoped authenticated user first, then the validated current user and finally
 * legacy Credit Manager keys for compatibility.
 */
export function getCreditManagerAuth() {
  try {
    const tabUser = readJson(typeof sessionStorage !== 'undefined' ? sessionStorage : null, TAB_USER_KEY);
    if (tabUser) return normalizeAuth(tabUser, localStorage.getItem(CREDIT_MANAGER_ID_KEY));

    const tabRole = String(getTabRole() || '').trim().toUpperCase();
    if (tabRole && tabRole !== 'CREDIT_MANAGER' && tabRole !== 'CREDIT_HEAD') return null;
    const currentUser = readJson(localStorage, 'sivels_currentUser');
    if (currentUser) {
      const currentAuth = normalizeAuth(currentUser, localStorage.getItem(CREDIT_MANAGER_ID_KEY));
      if (currentAuth) return currentAuth;
      return null;
    }

    const dedicatedAuth = normalizeAuth(
      readJson(localStorage, CREDIT_MANAGER_AUTH_KEY),
      localStorage.getItem(CREDIT_MANAGER_ID_KEY)
    );
    if (dedicatedAuth) return dedicatedAuth;

    return normalizeAuth(
      readJson(localStorage, CREDIT_MANAGER_DATA_KEY),
      localStorage.getItem(CREDIT_MANAGER_ID_KEY)
    );
  } catch {
    return null;
  }
}

/**
 * Persist Credit Manager auth state.
 */
export function setCreditManagerAuth(authData) {
  try {
    const cmId = toValidId(authData?.creditManagerId ?? authData?.id);
    const role = authData?.role || 'CreditManager';
    const payload = {
      isAuthenticated: true,
      id: cmId,
      creditManagerId: cmId,
      userId: toValidId(authData?.userId),
      name: authData?.name || authData?.fullName || '',
      staffId: authData?.staffId ?? null,
      staffCode: authData?.staffCode || authData?.employeeCode || '',
      role,
      roleCode: authData?.roleCode || null,
      roleId: authData?.roleId ?? null,
      roleName: authData?.roleName || role,
      departmentCode: authData?.departmentCode || '',
      legacyId: authData?.legacyId ?? null,
      mobile: authData?.mobile || authData?.mobileNumber || '',
      creditManagerCode: authData?.staffCode || authData?.employeeCode || authData?.creditManagerCode || authData?.code || '',
      loginTimestamp: new Date().toISOString(),
      ...(Array.isArray(authData?.permissions) ? { permissions: authData.permissions } : {}),
    };
    localStorage.setItem(CREDIT_MANAGER_AUTH_KEY, JSON.stringify(payload));
    if (cmId) {
      localStorage.setItem(CREDIT_MANAGER_ID_KEY, String(cmId));
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Clear ONLY Credit Manager authentication storage.
 * Strictly avoids localStorage.clear() to prevent affecting other modules.
 */
export function removeCreditManagerAuth() {
  try {
    localStorage.removeItem(CREDIT_MANAGER_AUTH_KEY);
    localStorage.removeItem(CREDIT_MANAGER_DATA_KEY);
    localStorage.removeItem(CREDIT_MANAGER_ID_KEY);

    const tabUser = readJson(typeof sessionStorage !== 'undefined' ? sessionStorage : null, TAB_USER_KEY);
    if (isCreditManagerSessionUser(tabUser) && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TAB_USER_KEY);
      sessionStorage.removeItem(TAB_ROLE_KEY);
    }

    const userRaw = localStorage.getItem('sivels_currentUser');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (isCreditManagerRole(user?.role)) {
        localStorage.removeItem('sivels_currentUser');
      }
    }
  } catch {}
}

/**
 * Resolve the authenticated Credit Manager primary key.
 */
export function getCreditManagerId() {
  return getCreditManagerAuth()?.creditManagerId ?? null;
}

export function getCreditManagerSessionKey() {
  const auth = getCreditManagerAuth();
  if (!auth) return 'none';
  return [auth.staffId, auth.creditManagerId, auth.roleCode, auth.roleId].map((value) => value ?? '').join(':');
}

/**
 * Check whether Credit Manager session is currently authenticated.
 */
export function isCreditManagerAuthenticated() {
  return Boolean(getCreditManagerAuth()?.isAuthenticated);
}
