/**
 * Generates user code in real time based on:
 * 1. First 2 alphabetic characters of Full Name (in uppercase)
 * 2. Day portion (DD) from Date of Birth
 * 3. Last 3 digits of Mobile Number
 *
 * Example:
 * Full Name: Thiru -> TH
 * DOB: 2004-07-14 / 14-07-2004 -> 14
 * Mobile: 9345638126 -> 126
 * Result: TH14126
 */
export const generateUserCode = (fullName = '', dateOfBirth = '', mobileNumber = '') => {
  // 1. First 2 alphabetic characters in uppercase
  const cleanName = String(fullName || '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
  const namePart = cleanName.slice(0, 2);

  // 2. Extract day portion (DD) from date of birth safely
  let dayPart = '';
  if (dateOfBirth) {
    const dobStr = String(dateOfBirth).trim();
    if (dobStr.includes('-')) {
      const parts = dobStr.split('-');
      if (parts[0].length === 4) {
        // Format: YYYY-MM-DD
        dayPart = parts[2] ? parts[2].slice(0, 2) : '';
      } else {
        // Format: DD-MM-YYYY
        dayPart = parts[0] ? parts[0].slice(0, 2) : '';
      }
    } else if (dobStr.includes('/')) {
      const parts = dobStr.split('/');
      if (parts[0].length === 4) {
        // Format: YYYY/MM/DD
        dayPart = parts[2] ? parts[2].slice(0, 2) : '';
      } else {
        // Format: DD/MM/YYYY
        dayPart = parts[0] ? parts[0].slice(0, 2) : '';
      }
    } else {
      const digitsOnly = dobStr.replace(/\D/g, '');
      if (digitsOnly.length >= 2) {
        dayPart = digitsOnly.slice(0, 2);
      }
    }
  }

  // 3. Last 3 digits from mobile number
  let mobilePart = '';
  if (mobileNumber) {
    const cleanMobile = String(mobileNumber).replace(/\D/g, '');
    if (cleanMobile.length > 0) {
      mobilePart = cleanMobile.length >= 3 ? cleanMobile.slice(-3) : cleanMobile;
    }
  }

  return `${namePart}${dayPart}${mobilePart}`;
};
