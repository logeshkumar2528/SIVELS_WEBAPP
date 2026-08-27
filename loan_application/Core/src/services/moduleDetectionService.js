/**
 * moduleDetectionService.js
 *
 * Future-proof common mobile login and account resolution service for Sivels Finance.
 *
 * Resolves an entered mobile number against valid login account sources using an extensible
 * account source registry. When exactly one account exists, it provides the account details
 * and routing destination for the OTP flow. When multiple accounts exist, it halts login
 * with a duplicate account error.
 *
 * Current Account Sources:
 *  1. AgentMaster        -> Agent account    -> /Agent/dashboard
 *  2. RMMaster           -> RM account       -> /rm/dashboard
 *  3. AgentAddCustomer   -> Customer account -> /dashboard
 *
 * Extensibility:
 *  Future modules can be registered in ACCOUNT_SOURCES without modifying Login.jsx
 *  or creating separate module login pages.
 */

import axiosInstance from '../api/axiosInstance';

export const AGENT_DASHBOARD    = '/Agent/dashboard';
export const RM_DASHBOARD       = '/rm/dashboard';
export const CUSTOMER_DASHBOARD = '/dashboard';
export const MASTER_DASHBOARD   = '/master/dashboard';
export const MASTER_MOBILE      = '9841446699';

/**
 * Normalizes any mobile number string to 10 digits for consistent comparison:
 *  - Trims spaces and strips internal whitespace, dashes, parens
 *  - Strips '+91' country code prefix
 *  - Strips leading '91' when string is 12 digits
 *  - Strips leading '0' when string is 11 digits
 *  - Extracts the 10-digit mobile number
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
 * Registry of valid login account sources.
 * Future account types can be added here without rewriting Login.jsx.
 */
export const ACCOUNT_SOURCES = [
  {
    accountType: 'Agent',
    module: 'Agent',
    endpoint: '/AgentMaster',
    destination: AGENT_DASHBOARD,
    extractMobile: (record) => record?.mobileNumber ?? record?.MobileNumber,
  },
  {
    accountType: 'RM',
    module: 'RM',
    endpoint: '/RMMaster',
    destination: RM_DASHBOARD,
    extractMobile: (record) => record?.mobileNumber ?? record?.MobileNumber,
  },
  {
    accountType: 'Customer',
    module: 'Customer',
    endpoint: '/AgentAddCustomer',
    destination: CUSTOMER_DASHBOARD,
    extractMobile: (record) => record?.mobileNumber ?? record?.MobileNumber,
  },
];

/**
 * Resolves ALL matching valid login accounts across all registered account sources
 * for the specified mobile number.
 *
 * Uses .filter() to collect all matching accounts. Never truncates via .find() or [0].
 * Does NOT swallow API errors; errors propagate so they can be handled as network/API errors.
 *
 * @param {string} mobileNumber - entered mobile number (will be normalized)
 * @returns {Promise<Array<{
 *   accountType: string,
 *   module: string,
 *   destination: string,
 *   accountData: object
 * }>>}
 */
export async function resolveAccountsByMobile(mobileNumber) {
  const normalizedMobile = normalizeMobileNumber(mobileNumber);
  if (!normalizedMobile || normalizedMobile.length !== 10) {
    return [];
  }

  // Master static account
  if (normalizedMobile === MASTER_MOBILE) {
    return [{
      accountType: 'Master',
      module: 'Master',
      destination: MASTER_DASHBOARD,
      accountData: {
        mobileNumber: MASTER_MOBILE,
        fullName: 'Master'
      }
    }];
  }

  // Query all registered account source APIs concurrently without swallowing errors
  const responses = await Promise.all(
    ACCOUNT_SOURCES.map((source) => axiosInstance.get(source.endpoint))
  );

  const allMatchingAccounts = [];

  ACCOUNT_SOURCES.forEach((source, index) => {
    const res = responses[index];
    const rawData = res?.data?.value ?? res?.data ?? [];
    const items = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);

    // Filter ALL matching accounts for this source
    const matches = items
      .filter((record) => {
        const mobile = source.extractMobile(record);
        return normalizeMobileNumber(mobile) === normalizedMobile;
      })
      .map((record) => ({
        accountType: source.accountType,
        module: source.module,
        destination: source.destination,
        accountData: record
      }));

    allMatchingAccounts.push(...matches);
  });

  return allMatchingAccounts;
}

// Backward-compatible alias
export const findAccountsByMobile = resolveAccountsByMobile;

/**
 * Detects whether the entered mobile number belongs to 0, 1, or 2+ valid login accounts.
 *
 * RULES:
 *  - accounts.length === 0 -> status: 'NOT_FOUND', "No account found with this mobile number"
 *  - accounts.length === 1 -> status: singleAccount.accountType.toUpperCase(), existing OTP flow
 *  - accounts.length > 1   -> status: 'DUPLICATE', "Multiple accounts found with this mobile number. Please contact support."
 *  - API / network error   -> status: 'ERROR', "Failed to verify account. Please check your connection and try again."
 *
 * @param {string} mobileNumber - The entered mobile number
 * @returns {Promise<{
 *   status: string,
 *   module: string | null,
 *   destination: string | null,
 *   accountData: object | null,
 *   accounts?: Array<object>,
 *   error: string | null
 * }>}
 */
export async function detectAccountModule(mobileNumber) {
  const normalizedMobile = normalizeMobileNumber(mobileNumber);

  if (!normalizedMobile || normalizedMobile.length !== 10) {
    return {
      status: 'NOT_FOUND',
      module: null,
      destination: null,
      accountData: null,
      accounts: [],
      error: 'Please enter a valid 10-digit mobile number'
    };
  }

  // MASTER DETECTION — BEFORE the normal database account-resolution flow
  if (normalizedMobile === MASTER_MOBILE) {
    const masterAccount = {
      accountType: 'Master',
      module: 'Master',
      destination: MASTER_DASHBOARD,
      accountData: {
        mobileNumber: MASTER_MOBILE,
        fullName: 'Master'
      }
    };
    return {
      status: 'MASTER',
      accountType: 'Master',
      module: masterAccount.module,
      destination: masterAccount.destination,
      accountData: masterAccount.accountData,
      accounts: [masterAccount],
      error: null
    };
  }

  let accounts;
  try {
    accounts = await resolveAccountsByMobile(normalizedMobile);
  } catch (err) {
    console.error('[ModuleDetection] Error verifying account:', err?.message || err);
    return {
      status: 'ERROR',
      module: null,
      destination: null,
      accountData: null,
      accounts: [],
      error: 'Failed to verify account. Please check your connection and try again.'
    };
  }

  // CASE 1 — ZERO MATCHING ACCOUNTS
  if (accounts.length === 0) {
    return {
      status: 'NOT_FOUND',
      module: null,
      destination: null,
      accountData: null,
      accounts: [],
      error: 'No account found with this mobile number'
    };
  }

  // CASE 3 — MORE THAN ONE MATCHING ACCOUNT
  // Must NOT choose first/last account, must NOT decide by role or ID, must NOT send OTP
  if (accounts.length > 1) {
    return {
      status: 'DUPLICATE',
      module: null,
      destination: null,
      accountData: null,
      accounts,
      error: 'Multiple accounts found with this mobile number. Please contact support.'
    };
  }

  // CASE 2 — EXACTLY ONE MATCHING ACCOUNT
  const singleAccount = accounts[0];
  return {
    status: singleAccount.accountType.toUpperCase(),
    module: singleAccount.module,
    destination: singleAccount.destination,
    accountData: singleAccount.accountData,
    accounts,
    error: null
  };
}

/**
 * Backward-compatible helper returning the dashboard route.
 */
export async function detectModuleRoute(mobileNumber) {
  const result = await detectAccountModule(mobileNumber);
  return result.destination || null;
}
