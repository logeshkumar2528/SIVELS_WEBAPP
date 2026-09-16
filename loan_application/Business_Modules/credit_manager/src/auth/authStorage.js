/**
 * authStorage.js
 * --------------------
 * Isolated authentication storage management for the Credit Manager module.
 *
 * Dedicated Keys:
 *   - 'creditManagerAuth' : Structured session object { isAuthenticated, creditManagerId, userId, ... }
 *   - 'creditManagerData' : Full master record
 *   - 'creditManagerId'   : Master primary key
 */

export const CREDIT_MANAGER_AUTH_KEY = 'creditManagerAuth';
export const CREDIT_MANAGER_DATA_KEY = 'creditManagerData';
export const CREDIT_MANAGER_ID_KEY = 'creditManagerId';

/**
 * Retrieve current Credit Manager auth state.
 * Checks dedicated 'creditManagerAuth' key, 'creditManagerData', as well as 'sivels_currentUser'.
 *
 * @returns {object|null}
 */
export function getCreditManagerAuth() {
  try {
    // 1. Check primary structured auth key
    const raw = localStorage.getItem(CREDIT_MANAGER_AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isAuthenticated) {
        const cmId = parsed.creditManagerId || parsed.id || localStorage.getItem(CREDIT_MANAGER_ID_KEY) || null;
        return {
          ...parsed,
          creditManagerId: cmId ? Number(cmId) : null,
          id: cmId ? Number(cmId) : null,
        };
      }
    }

    // 2. Check creditManagerData
    const dataRaw = localStorage.getItem(CREDIT_MANAGER_DATA_KEY);
    if (dataRaw) {
      const cm = JSON.parse(dataRaw);
      if (cm && typeof cm === 'object') {
        const cmId = cm.creditManagerId || cm.id || localStorage.getItem(CREDIT_MANAGER_ID_KEY) || null;
        return {
          isAuthenticated: Boolean(cmId),
          creditManagerId: cmId ? Number(cmId) : null,
          id: cmId ? Number(cmId) : null,
          userId: cm.userId ? Number(cm.userId) : null,
          creditManagerCode: cm.creditManagerCode || cm.code || '',
          fullName: cm.fullName || cm.name || 'Credit Manager',
          mobileNumber: cm.mobileNumber || cm.mobile || '',
          emailAddress: cm.emailAddress || cm.email || '',
          branch: cm.branch || '',
          role: 'CreditManager',
          loginTimestamp: new Date().toISOString(),
        };
      }
    }

    // 3. Check sivels_currentUser
    const userRaw = localStorage.getItem('sivels_currentUser');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      const role = String(user?.role || '').toLowerCase();
      if (role.includes('credit') || role.includes('creditmanager') || role.includes('credit_manager')) {
        const cmId = user.creditManagerId || user.id || localStorage.getItem(CREDIT_MANAGER_ID_KEY) || null;
        return {
          isAuthenticated: Boolean(cmId),
          creditManagerId: cmId ? Number(cmId) : null,
          id: cmId ? Number(cmId) : null,
          userId: user.userId ? Number(user.userId) : null,
          creditManagerCode: user.creditManagerCode || user.code || '',
          fullName: user.fullName || user.name || 'Credit Manager',
          mobileNumber: user.mobileNumber || user.mobile || '',
          emailAddress: user.emailAddress || user.email || '',
          branch: user.branch || '',
          role: 'CreditManager',
          loginTimestamp: new Date().toISOString(),
        };
      }
    }

    return null;
  } catch (err) {
    console.warn('[authStorage] Error parsing Credit Manager auth:', err);
    return null;
  }
}

/**
 * Retrieve raw Credit Manager master data object from session.
 *
 * @returns {object|null}
 */
export function getCreditManagerData() {
  try {
    const raw = localStorage.getItem(CREDIT_MANAGER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Retrieve authenticated Credit Manager primary key ID.
 *
 * @returns {number|null}
 */
export function getCreditManagerId() {
  const auth = getCreditManagerAuth();
  if (auth?.creditManagerId && !isNaN(Number(auth.creditManagerId))) {
    return Number(auth.creditManagerId);
  }
  const rawId = localStorage.getItem(CREDIT_MANAGER_ID_KEY);
  if (rawId && !isNaN(Number(rawId)) && Number(rawId) > 0) {
    return Number(rawId);
  }
  return null;
}

/**
 * Checks if the current session has an active, authenticated Credit Manager.
 *
 * @returns {boolean}
 */
export function isCreditManagerAuthenticated() {
  const auth = getCreditManagerAuth();
  return Boolean(auth && auth.isAuthenticated && auth.creditManagerId);
}

/**
 * Save / update Credit Manager auth state in localStorage.
 *
 * @param {object} authData
 */
export function setCreditManagerAuth(authData) {
  try {
    if (!authData) return;
    const cmId = authData.creditManagerId || authData.id || null;
    const payload = {
      isAuthenticated: true,
      creditManagerId: cmId ? Number(cmId) : null,
      userId: authData.userId ? Number(authData.userId) : null,
      creditManagerCode: authData.creditManagerCode || authData.code || '',
      fullName: authData.fullName || authData.name || 'Credit Manager',
      mobileNumber: authData.mobileNumber || authData.mobile || '',
      emailAddress: authData.emailAddress || authData.email || '',
      branch: authData.branch || '',
      role: 'CreditManager',
      loginTimestamp: authData.loginTimestamp || new Date().toISOString(),
    };

    localStorage.setItem(CREDIT_MANAGER_AUTH_KEY, JSON.stringify(payload));
    if (cmId) {
      localStorage.setItem(CREDIT_MANAGER_ID_KEY, String(cmId));
    }
  } catch (err) {
    console.warn('[authStorage] Error saving Credit Manager auth:', err);
  }
}

/**
 * Clear Credit Manager session and redirect to login.
 * Removes only Credit Manager-specific keys and common user session.
 */
export function clearCreditManagerAuth() {
  try {
    localStorage.removeItem(CREDIT_MANAGER_AUTH_KEY);
    localStorage.removeItem(CREDIT_MANAGER_DATA_KEY);
    localStorage.removeItem(CREDIT_MANAGER_ID_KEY);
    localStorage.removeItem('sivels_currentUser');
    localStorage.removeItem('authToken');
  } catch (err) {
    console.warn('[authStorage] Error clearing Credit Manager auth:', err);
  }
  window.location.href = '/login';
}
