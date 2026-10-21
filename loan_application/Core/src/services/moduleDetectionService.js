export const AGENT_DASHBOARD      = '/Agent/dashboard';
export const RM_DASHBOARD         = '/rm/dashboard';
export const AMS_DASHBOARD        = '/master/ams-dashboard';
export const CUSTOMER_DASHBOARD   = '/dashboard';
export const MASTER_DASHBOARD     = '/master/dashboard';
export const BACKOFFICE_DASHBOARD = '/backoffice/dashboard';
export const CREDIT_MANAGER_DASHBOARD = '/credit';

/**
 * Normalizes any mobile number string to 10 digits for consistent comparison:
 *  - Trims spaces and strips internal whitespace, dashes, parens, dots
 *  - Strips '+91' country code prefix
 *  - Strips leading '91' when string is 12 digits
 *  - Strips leading '0' when string is 11 digits
 *  - Extracts the last 10 digits
 *
 * @param {string|number} val
 * @returns {string} 10-digit mobile number or empty string
 */
export function normalizeMobileNumber(val) {
  if (val == null) return '';
  let cleaned = String(val).trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  }

  return cleaned;
}

/**
 * Extracts mobile number from record, handling multiple backend naming variations safely.
 *
 * @param {object} record
 * @returns {string}
 */
export function extractRecordMobile(record) {
  if (!record || typeof record !== 'object') return '';
  return (
    record.mobileNumber ??
    record.MobileNumber ??
    record.phoneNumber ??
    record.PhoneNumber ??
    record.mobile ??
    record.Mobile ??
    record.contactNumber ??
    record.ContactNumber ??
    record.contactNo ??
    record.ContactNo ??
    record.phone ??
    record.Phone ??
    record.MobileNo ??
    ''
  );
}

/**
 * Compares two mobile numbers after full 10-digit normalization.
 *
 * @param {string|number} recordMobile
 * @param {string|number} inputMobile
 * @returns {boolean}
 */
export function isMobileMatch(recordMobile, inputMobile) {
  const normRecord = normalizeMobileNumber(recordMobile);
  const normInput = normalizeMobileNumber(inputMobile);
  return normRecord.length === 10 && normRecord === normInput;
}
