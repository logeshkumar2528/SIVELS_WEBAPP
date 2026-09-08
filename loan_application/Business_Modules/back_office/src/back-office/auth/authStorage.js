/**
 * authStorage.js
 * --------------------
 * Lightweight frontend-only dummy authentication management for Back Office.
 * Uses targeted localStorage key ('backOfficeAuth') so other modules are NEVER affected.
 *
 * Dummy Credentials:
 *   Mobile: 1234567890
 *   OTP:    123456
 */

export const BACK_OFFICE_AUTH_KEY = 'backOfficeAuth';

export const DUMMY_CREDENTIALS = {
  mobile: '1234567890',
  otp: '123456',
  name: 'Back Office Executive',
  role: 'Operations Team',
};

/**
 * Retrieve current Back Office auth state.
 * Checks dedicated 'backOfficeAuth' key as well as common 'sivels_currentUser'.
 */
export function getBackOfficeAuth() {
  try {
    const raw = localStorage.getItem(BACK_OFFICE_AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isAuthenticated) return parsed;
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
        return {
          isAuthenticated: true,
          name: user.fullName || user.name || DUMMY_CREDENTIALS.name,
          role: user.role || DUMMY_CREDENTIALS.role,
          mobile: user.mobileNumber || user.mobile || DUMMY_CREDENTIALS.mobile,
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
 * Persist Back Office auth state.
 */
export function setBackOfficeAuth(authData) {
  try {
    const payload = {
      isAuthenticated: true,
      name: authData?.name || authData?.fullName || DUMMY_CREDENTIALS.name,
      role: authData?.role || DUMMY_CREDENTIALS.role,
      mobile: authData?.mobile || authData?.mobileNumber || DUMMY_CREDENTIALS.mobile,
      loginTimestamp: new Date().toISOString(),
    };
    localStorage.setItem(BACK_OFFICE_AUTH_KEY, JSON.stringify(payload));
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

/**
 * Validate Mobile Number step (Step 1).
 */
export function validateMobileNumber(mobile) {
  const cleanMobile = String(mobile || '').replace(/\D/g, '');

  if (!cleanMobile) {
    return {
      success: false,
      message: 'Please enter your mobile number',
    };
  }

  if (cleanMobile.length !== 10) {
    return {
      success: false,
      message: 'Please enter a valid 10-digit mobile number',
    };
  }

  if (cleanMobile !== DUMMY_CREDENTIALS.mobile) {
    return {
      success: false,
      message: 'No account found with this mobile number',
    };
  }

  return {
    success: true,
  };
}

/**
 * Validate OTP step (Step 2).
 */
export function validateOtp(otp, mobile = DUMMY_CREDENTIALS.mobile) {
  const cleanOtp = String(otp || '').replace(/\D/g, '');

  if (!cleanOtp) {
    return {
      success: false,
      message: 'Please enter the 6-digit OTP',
    };
  }

  if (cleanOtp.length < 6) {
    return {
      success: false,
      message: 'Please enter all 6 digits of the OTP',
    };
  }

  if (cleanOtp !== DUMMY_CREDENTIALS.otp) {
    return {
      success: false,
      message: 'Invalid OTP. Please try again.',
    };
  }

  const user = {
    isAuthenticated: true,
    name: DUMMY_CREDENTIALS.name,
    role: DUMMY_CREDENTIALS.role,
    mobile: mobile || DUMMY_CREDENTIALS.mobile,
  };

  setBackOfficeAuth(user);

  return {
    success: true,
    user,
  };
}
