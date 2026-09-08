import axiosInstance from '../api/axiosInstance';

export const AGENT_DASHBOARD      = '/Agent/dashboard';
export const RM_DASHBOARD         = '/rm/dashboard';
export const AMS_DASHBOARD        = '/master/ams-dashboard';
export const CUSTOMER_DASHBOARD   = '/dashboard';
export const MASTER_DASHBOARD     = '/master/dashboard';
export const BACKOFFICE_DASHBOARD = '/backoffice/dashboard';

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

/**
 * Registry of valid login account sources and master APIs.
 */
export const ACCOUNT_SOURCES = [
  {
    role: 'BackOffice',
    module: 'BackOffice',
    endpoint: '/BackOfficeMaster',
    destination: BACKOFFICE_DASHBOARD,
    idKey: 'backOfficeId',
    storageKey: 'backOfficeData',
    idStorageKey: 'backOfficeId',
  },
  {
    role: 'AMS',
    module: 'AMS',
    endpoint: '/AMSMaster',
    destination: AMS_DASHBOARD,
    idKey: 'amsId',
    storageKey: 'amsData',
    idStorageKey: 'amsId',
  },
  {
    role: 'RM',
    module: 'RM',
    endpoint: '/RMMaster',
    destination: RM_DASHBOARD,
    idKey: 'rmId',
    storageKey: 'rmData',
    idStorageKey: 'rmId',
  },
  {
    role: 'Agent',
    module: 'Agent',
    endpoint: '/AgentMaster',
    destination: AGENT_DASHBOARD,
    idKey: 'agentId',
    storageKey: 'agentData',
    idStorageKey: 'agentId',
  },
  {
    role: 'Customer',
    module: 'Customer',
    endpoint: '/AgentAddCustomer',
    destination: CUSTOMER_DASHBOARD,
    idKey: 'agentCustomerId',
    storageKey: 'customerData',
    idStorageKey: 'customerId',
  },
];

/**
 * Safely unwrap API response arrays
 */
function unwrapResponse(settledRes) {
  if (settledRes.status !== 'fulfilled') return [];
  const raw = settledRes.value?.data?.value ?? settledRes.value?.data ?? [];
  return Array.isArray(raw) ? raw : (raw ? [raw] : []);
}

/**
 * Detects whether the entered mobile number belongs to a BackOffice, AMS, RM, Agent, or Customer account.
 *
 * @param {string} mobileNumber - The entered mobile number
 * @returns {Promise<{
 *   status: 'FOUND' | 'NOT_FOUND' | 'ERROR',
 *   role: string | null,
 *   module: string | null,
 *   destination: string | null,
 *   accountData: object | null,
 *   error: string | null
 * }>}
 */
export async function detectAccountModule(mobileNumber) {
  const normalizedMobile = normalizeMobileNumber(mobileNumber);
  console.log("Checking mobile:", normalizedMobile);

  if (!normalizedMobile || normalizedMobile.length !== 10) {
    return {
      status: 'NOT_FOUND',
      role: null,
      module: null,
      destination: null,
      accountData: null,
      error: 'Please enter a valid 10-digit mobile number'
    };
  }

  // Fetch all master APIs concurrently
  let agentRes, rmRes, amsRes, customerRes, backOfficeRes;
  try {
    [agentRes, rmRes, amsRes, customerRes, backOfficeRes] = await Promise.allSettled([
      axiosInstance.get('/AgentMaster'),
      axiosInstance.get('/RMMaster'),
      axiosInstance.get('/AMSMaster'),
      axiosInstance.get('/AgentAddCustomer'),
      axiosInstance.get('/BackOfficeMaster'),
    ]);
  } catch (err) {
    console.error('[ModuleDetection] Network error fetching masters:', err);
    return {
      status: 'ERROR',
      role: null,
      module: null,
      destination: null,
      accountData: null,
      error: 'Failed to verify account. Please check your connection and try again.'
    };
  }

  const agentData = unwrapResponse(agentRes);
  const rmData = unwrapResponse(rmRes);
  const amsData = unwrapResponse(amsRes);
  const customerData = unwrapResponse(customerRes);
  const backOfficeData = unwrapResponse(backOfficeRes);

  console.log("BackOffice API response:", backOfficeData);
  console.log("Agent API response:", agentData);
  console.log("RM API response:", rmData);
  console.log("AMS API response:", amsData);

  // Check if all master lookups failed to connect
  const anyFulfilled = [agentRes, rmRes, amsRes, customerRes, backOfficeRes].some((r) => r.status === 'fulfilled');
  if (!anyFulfilled) {
    if (normalizedMobile === '1234567890') {
      return {
        status: 'FOUND',
        role: 'BackOffice',
        module: 'BackOffice',
        destination: BACKOFFICE_DASHBOARD,
        accountData: {
          mobileNumber: normalizedMobile,
          fullName: 'Back Office Executive',
          name: 'Back Office Executive',
          role: 'Operations Team',
          id: 'BO-001',
          backOfficeId: 'BO-001',
        },
        error: null,
      };
    }
    if (normalizedMobile === '9345638126' || normalizedMobile === '9841446699') {
      return {
        status: 'FOUND',
        role: 'Master',
        module: 'Master',
        destination: MASTER_DASHBOARD,
        accountData: {
          mobileNumber: normalizedMobile,
          fullName: 'Master Admin',
          role: 'Master',
        },
        error: null,
      };
    }
    return {
      status: 'ERROR',
      role: null,
      module: null,
      destination: null,
      accountData: null,
      error: 'Failed to verify account. Please check your connection and try again.'
    };
  }

  const sourcesMap = {
    BackOffice: backOfficeData,
    AMS: amsData,
    RM: rmData,
    Agent: agentData,
    Customer: customerData,
  };

  let detectedUser = null;
  let detectedRole = null;
  let destination = null;

  // Search each source in defined order
  for (const source of ACCOUNT_SOURCES) {
    const list = sourcesMap[source.role] || [];
    const match = list.find((item) => isMobileMatch(extractRecordMobile(item), normalizedMobile));
    if (match) {
      detectedUser = match;
      detectedRole = source.role;
      destination = source.destination;
      break;
    }
  }

  // Fallback for Master Admin if not in DB
  if (!detectedUser && (normalizedMobile === '9345638126' || normalizedMobile === '9841446699')) {
    detectedUser = {
      mobileNumber: normalizedMobile,
      fullName: 'Master Admin',
      role: 'Master',
    };
    detectedRole = 'Master';
    destination = MASTER_DASHBOARD;
  }

  // Fallback for Back Office if not in DB
  if (!detectedUser && normalizedMobile === '1234567890') {
    detectedUser = {
      mobileNumber: normalizedMobile,
      fullName: 'Back Office Executive',
      name: 'Back Office Executive',
      role: 'Operations Team',
      id: 'BO-001',
      backOfficeId: 'BO-001',
    };
    detectedRole = 'BackOffice';
    destination = BACKOFFICE_DASHBOARD;
  }

  console.log("Detected user:", detectedUser);
  console.log("Detected role:", detectedRole);

  if (!detectedRole || !detectedUser) {
    return {
      status: 'NOT_FOUND',
      role: null,
      module: null,
      destination: null,
      accountData: null,
      error: 'No account found with this mobile number'
    };
  }

  return {
    status: 'FOUND',
    role: detectedRole,
    module: detectedRole,
    destination,
    accountData: detectedUser,
    error: null,
  };
}

/**
 * Backward-compatible helper returning the dashboard route.
 */
export async function detectModuleRoute(mobileNumber) {
  const result = await detectAccountModule(mobileNumber);
  return result.destination || null;
}
