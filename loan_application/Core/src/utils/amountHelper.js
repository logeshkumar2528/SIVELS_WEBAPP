/**
 * amountHelper.js
 * Centralized Indian Currency / Amount Formatting & Raw Value Extraction
 * Sivels Finance
 */

/**
 * Formats a numeric or string value using the Indian numbering system (en-IN).
 * Supports natural typing and decimal values without jumping or blocking.
 *
 * Examples:
 *   1000        → "1,000"
 *   10000       → "10,000"
 *   100000      → "1,00,000"
 *   200000      → "2,00,000"
 *   1000000     → "10,00,000"
 *   "200000.50" → "2,00,000.50"
 *   "200000."   → "2,00,000."
 *
 * @param {string|number} value - The input value to format.
 * @param {boolean} allowDecimal - Whether decimal values are allowed (default: true).
 * @param {number} maxDecimals - Maximum decimal digits allowed (default: 2).
 * @returns {string} Formatted string with Indian comma grouping.
 */
export const formatIndianAmount = (value, allowDecimal = true, maxDecimals = 2) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (!str.trim()) return '';

  // Remove existing commas
  let clean = str.replace(/,/g, '');

  if (allowDecimal) {
    // Keep only digits and decimal point
    clean = clean.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
  } else {
    // Digits only
    clean = clean.replace(/[^0-9]/g, '');
  }

  if (!clean) return '';

  if (allowDecimal && clean.includes('.')) {
    const [integerPart, ...decimalParts] = clean.split('.');
    const decimalPart = decimalParts.join('');

    let formattedInteger = '';
    if (integerPart !== '') {
      const num = Number(integerPart);
      formattedInteger = isNaN(num) ? '' : num.toLocaleString('en-IN');
    }

    const limitedDecimal = maxDecimals > 0 ? decimalPart.slice(0, maxDecimals) : decimalPart;
    return `${formattedInteger}.${limitedDecimal}`;
  }

  // Integer only
  const num = Number(clean);
  if (isNaN(num)) return '';
  return num.toLocaleString('en-IN');
};

/**
 * Extracts raw numeric string by stripping all commas and non-numeric characters.
 * Suitable for storing in raw state or sending to backend APIs.
 *
 * Examples:
 *   "2,00,000.50" → "200000.50"
 *   "1,00,000"    → "100000"
 *
 * @param {string|number} value - The formatted string or value.
 * @param {boolean} allowDecimal - Whether decimal values are retained (default: true).
 * @param {number} maxDecimals - Maximum decimal digits allowed (default: 2).
 * @returns {string} Clean raw numeric string.
 */
export const getRawAmount = (value, allowDecimal = true, maxDecimals = 2) => {
  if (value === null || value === undefined) return '';
  let str = String(value).replace(/,/g, '').trim();

  if (allowDecimal) {
    str = str.replace(/[^0-9.]/g, '');
    const parts = str.split('.');
    if (parts.length > 2) {
      str = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length > 1) {
      const dec = maxDecimals > 0 ? parts[1].slice(0, maxDecimals) : parts[1];
      return `${parts[0]}.${dec}`;
    }
    return parts[0] || '';
  }

  return str.replace(/[^0-9]/g, '');
};

/**
 * Parses formatted amount string to JavaScript Number.
 *
 * @param {string|number} value - The input value.
 * @returns {number} Numeric representation (or 0 if invalid).
 */
export const parseAmountToNumber = (value) => {
  const raw = getRawAmount(value, true);
  if (!raw) return 0;
  const num = Number(raw);
  return isNaN(num) ? 0 : num;
};

export default {
  formatIndianAmount,
  getRawAmount,
  parseAmountToNumber,
};
