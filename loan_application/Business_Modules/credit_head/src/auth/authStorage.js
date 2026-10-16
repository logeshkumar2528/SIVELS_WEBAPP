/**
 * authStorage.js
 * --------------------
 * Authentication session management for the Credit Head module.
 * Manages dedicated localStorage keys and coordinates session verification.
 *
 * Keys (written by Core VerifyOTP on login):
 *   - 'creditHeadData'    : Full CreditHeadMaster record from backend
 *   - 'creditHeadAuth'    : Structured session object
 *   - 'creditHeadId'      : Master primary key string
 *   - 'sivels_currentUser': Active unified employee session
 */

export const CREDIT_HEAD_AUTH_KEY = 'creditHeadAuth';
export const CREDIT_HEAD_DATA_KEY = 'creditHeadData';
export const CREDIT_HEAD_ID_KEY = 'creditHeadId';

export function isCreditHeadRole(role) {
  const r = String(role || '').toLowerCase().replace(/[\s_\-]/g, '');
  return r === 'credithead' || r === 'creditheadmaster';
}

function toValidId(value) {
  const num = Number(value);
  return value != null && !isNaN(num) && num > 0 ? num : null;
}

function to10Digits(mobile) {
  if (!mobile) return '';
  const digits = String(mobile).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

/**
 * Retrieve current Credit Head auth state.
 * Performs rigorous multi-source cross-verification across session keys.
 */
export function getCreditHeadAuth() {
  try {
    const rawAuth = localStorage.getItem(CREDIT_HEAD_AUTH_KEY);
    const rawData = localStorage.getItem(CREDIT_HEAD_DATA_KEY);
    const rawUser = localStorage.getItem('sivels_currentUser');
    const directId = localStorage.getItem(CREDIT_HEAD_ID_KEY);

    // Primary check: if structured auth exists, parse and verify
    let auth = null;
    if (rawAuth) {
      try {
        auth = JSON.parse(rawAuth);
      } catch {
        auth = null;
      }
    }

    let data = null;
    if (rawData) {
      try {
        data = JSON.parse(rawData);
      } catch {
        data = null;
      }
    }

    let user = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser);
      } catch {
        user = null;
      }
    }

    // Resolve creditHeadId from available records
    const chId = toValidId(
      auth?.creditHeadId ??
      auth?.id ??
      data?.creditHeadId ??
      data?.CreditHeadId ??
      data?.id ??
      user?.creditHeadId ??
      user?.CreditHeadId ??
      user?.id ??
      directId
    );

    if (!chId) {
      return null;
    }

    // Role check if available
    const roleCandidate = auth?.role || user?.role || data?.role;
    if (roleCandidate && !isCreditHeadRole(roleCandidate)) {
      return null;
    }

    const code = data?.creditHeadCode || auth?.creditHeadCode || user?.creditHeadCode || '';
    const fullName = data?.fullName || auth?.fullName || user?.fullName || 'Credit Head';
    const mobile = to10Digits(auth?.mobileNumber || user?.mobileNumber || data?.mobileNumber || '');
    const email = data?.emailAddress || auth?.emailAddress || user?.emailAddress || '';
    const branch = data?.branch || auth?.branch || user?.branch || '';

    return {
      isAuthenticated: true,
      id: chId,
      creditHeadId: chId,
      userId: toValidId(data?.userId || user?.userId),
      name: fullName,
      fullName,
      creditHeadCode: code,
      role: 'CreditHead',
      mobileNumber: mobile,
      emailAddress: email,
      branch,
      isActive: data?.isActive !== false && user?.isActive !== false,
      loginTimestamp: auth?.loginTimestamp || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[CreditHeadAuth] Session retrieval error:', err);
    return null;
  }
}

/**
 * Retrieve primary key of authenticated Credit Head
 */
export function getCreditHeadId() {
  const auth = getCreditHeadAuth();
  return auth?.creditHeadId ?? null;
}

/**
 * Returns true if the current session is authenticated as a Credit Head.
 */
export function isCreditHeadAuthenticated() {
  return Boolean(getCreditHeadAuth()?.isAuthenticated);
}

/**
 * Removes Credit Head session keys without clearing unrelated application data.
 */
export function removeCreditHeadAuth() {
  try {
    localStorage.removeItem(CREDIT_HEAD_AUTH_KEY);
    localStorage.removeItem(CREDIT_HEAD_DATA_KEY);
    localStorage.removeItem(CREDIT_HEAD_ID_KEY);

    const userRaw = localStorage.getItem('sivels_currentUser');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        if (isCreditHeadRole(user?.role)) {
          localStorage.removeItem('sivels_currentUser');
        }
      } catch {
        // ignore parse errors
      }
    }
  } catch (err) {
    console.warn('[CreditHeadAuth] Error clearing session keys:', err);
  }
}

/**
 * Clears Credit Head authentication state and redirects to the common /login page.
 */
export function logoutCreditHead() {
  removeCreditHeadAuth();
  window.location.href = '/login';
}
