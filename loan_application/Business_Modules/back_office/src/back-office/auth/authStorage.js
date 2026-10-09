/**
 * authStorage.js
 * --------------------
 * Authentication session management for Back Office.
 * Manages dedicated localStorage key ('backOfficeAuth') and coordinates session retrieval.
 */

export const BACK_OFFICE_AUTH_KEY = 'backOfficeAuth';

/*
 * In-memory acting identity used when another module (e.g. Credit Manager) renders Back Office
 * screens. While set, getBackOfficeAuth() returns it so every save is attributed to that user
 * instead of a Back Office session left in localStorage.
 */
let actingIdentity = null;

/**
 * @param {{ id: number, name?: string, role: string } | null} identity
 */
export function setActingIdentity(identity) {
  actingIdentity = identity && identity.id ? { ...identity } : null;
}

export function getActingIdentity() {
  return actingIdentity;
}

/**
 * Retrieve current Back Office auth state.
 * Checks dedicated 'backOfficeAuth' key, 'backOfficeData', as well as 'sivels_currentUser'.
 */
export function getBackOfficeAuth() {
  if (actingIdentity) {
    return {
      isAuthenticated: true,
      name: actingIdentity.name || '',
      role: actingIdentity.role,
      id: actingIdentity.id,
      backOfficeId: actingIdentity.id,
      userId: actingIdentity.id,
      loginTimestamp: new Date().toISOString(),
    };
  }
  try {
    const boDataRaw = localStorage.getItem('backOfficeData');
    if (boDataRaw) {
      const bo = JSON.parse(boDataRaw);
      if (bo && typeof bo === 'object') {
        const boId = bo.backOfficeId || bo.id || bo.userId || localStorage.getItem('backOfficeId') || null;
        return {
          isAuthenticated: true,
          name: bo.fullName || bo.name || '',
          role: bo.role || '',
          mobile: bo.mobileNumber || bo.mobile || '',
          id: boId,
          backOfficeId: boId,
          employeeCode: bo.employeeCode || bo.backOfficeCode || '',
          email: bo.email || bo.emailAddress || '',
          loginTimestamp: new Date().toISOString(),
        };
      }
    }

    const raw = localStorage.getItem(BACK_OFFICE_AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isAuthenticated) {
        const boId = parsed.id || parsed.backOfficeId || localStorage.getItem('backOfficeId') || null;
        return {
          ...parsed,
          id: boId,
          backOfficeId: boId,
        };
      }
    }

    const userRaw = localStorage.getItem('sivels_currentUser');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      const role = String(user?.role || '').toLowerCase();
      if (
        role.includes('backoffice') ||
        role.includes('back_office') ||
        role.includes('back office') ||
        role.includes('operations')
      ) {
        const boId = user.backOfficeId || user.userId || user.id || localStorage.getItem('backOfficeId') || null;
        return {
          isAuthenticated: true,
          name: user.fullName || user.name || '',
          role: user.role || '',
          mobile: user.mobileNumber || user.mobile || '',
          id: boId,
          backOfficeId: boId,
          loginTimestamp: new Date().toISOString(),
        };
      }
      // Explicitly non-BackOffice user in sivels_currentUser - do not use
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist Back Office auth state.
 */
export function setBackOfficeAuth(authData) {
  try {
    const boId = authData?.backOfficeId ?? authData?.id ?? (authData?.userId ? Number(authData.userId) : null);
    const numId = boId != null && !isNaN(Number(boId)) && Number(boId) > 0 ? Number(boId) : null;
    const payload = {
      isAuthenticated: true,
      name: authData?.name || authData?.fullName || '',
      role: authData?.role || '',
      mobile: authData?.mobile || authData?.mobileNumber || '',
      id: numId,
      backOfficeId: numId,
      loginTimestamp: new Date().toISOString(),
    };
    localStorage.setItem(BACK_OFFICE_AUTH_KEY, JSON.stringify(payload));
    if (numId) {
      localStorage.setItem('backOfficeId', String(numId));
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Clear ONLY Back Office authentication storage.
 * Strictly avoids localStorage.clear() to prevent affecting other modules.
 */
export function removeBackOfficeAuth() {
  try {
    localStorage.removeItem(BACK_OFFICE_AUTH_KEY);
    localStorage.removeItem('backOfficeData');
    localStorage.removeItem('backOfficeId');

    const userRaw = localStorage.getItem('sivels_currentUser');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      const role = String(user?.role || '').toLowerCase();
      if (
        role.includes('backoffice') ||
        role.includes('back_office') ||
        role.includes('back office') ||
        role.includes('operations')
      ) {
        localStorage.removeItem('sivels_currentUser');
      }
    }
  } catch {}
}

/**
 * Check whether Back Office session is currently authenticated.
 */
export function isBackOfficeAuthenticated() {
  return Boolean(getBackOfficeAuth()?.isAuthenticated);
}
