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

export const CREDIT_MANAGER_AUTH_KEY = 'creditManagerAuth';
export const CREDIT_MANAGER_DATA_KEY = 'creditManagerData';
export const CREDIT_MANAGER_ID_KEY = 'creditManagerId';

function isCreditManagerRole(role) {
  const r = String(role || '').toLowerCase();
  return r.includes('creditmanager') || r.includes('credit_manager') || r.includes('credit manager');
}

function toValidId(value) {
  const num = Number(value);
  return value != null && !isNaN(num) && num > 0 ? num : null;
}

/**
 * Retrieve current Credit Manager auth state.
 * Checks 'creditManagerData', the dedicated 'creditManagerAuth' key, then 'sivels_currentUser'.
 */
export function getCreditManagerAuth() {
  try {
    const cmDataRaw = localStorage.getItem(CREDIT_MANAGER_DATA_KEY);
    if (cmDataRaw) {
      const cm = JSON.parse(cmDataRaw);
      if (cm && typeof cm === 'object') {
        const cmId = toValidId(
          cm.creditManagerId ?? cm.CreditManagerId ?? cm.id ?? localStorage.getItem(CREDIT_MANAGER_ID_KEY)
        );
        if (cmId) {
          return {
            isAuthenticated: true,
            id: cmId,
            creditManagerId: cmId,
            userId: toValidId(cm.userId),
            name: cm.fullName || cm.name || '',
            role: 'CreditManager',
            mobile: cm.mobileNumber || cm.mobile || '',
            creditManagerCode: cm.creditManagerCode || cm.code || '',
            email: cm.emailAddress || cm.email || '',
            loginTimestamp: new Date().toISOString(),
          };
        }
      }
    }

    const raw = localStorage.getItem(CREDIT_MANAGER_AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isAuthenticated) {
        const cmId = toValidId(parsed.creditManagerId ?? parsed.id ?? localStorage.getItem(CREDIT_MANAGER_ID_KEY));
        if (cmId) {
          return {
            ...parsed,
            id: cmId,
            creditManagerId: cmId,
            name: parsed.name || parsed.fullName || '',
            mobile: parsed.mobile || parsed.mobileNumber || '',
          };
        }
      }
    }

    const userRaw = localStorage.getItem('sivels_currentUser');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (!isCreditManagerRole(user?.role)) {
        // Explicitly non-Credit Manager user in sivels_currentUser - do not use
        return null;
      }
      const cmId = toValidId(user.creditManagerId ?? user.id ?? localStorage.getItem(CREDIT_MANAGER_ID_KEY));
      if (cmId) {
        return {
          isAuthenticated: true,
          id: cmId,
          creditManagerId: cmId,
          userId: toValidId(user.userId),
          name: user.fullName || user.name || '',
          role: 'CreditManager',
          mobile: user.mobileNumber || user.mobile || '',
          creditManagerCode: user.creditManagerCode || user.code || '',
          loginTimestamp: new Date().toISOString(),
        };
      }
    }
    return null;
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
    const payload = {
      isAuthenticated: true,
      id: cmId,
      creditManagerId: cmId,
      userId: toValidId(authData?.userId),
      name: authData?.name || authData?.fullName || '',
      role: 'CreditManager',
      mobile: authData?.mobile || authData?.mobileNumber || '',
      creditManagerCode: authData?.creditManagerCode || authData?.code || '',
      loginTimestamp: new Date().toISOString(),
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

/**
 * Check whether Credit Manager session is currently authenticated.
 */
export function isCreditManagerAuthenticated() {
  return Boolean(getCreditManagerAuth()?.isAuthenticated);
}
