import axiosInstance from '../../../../Core/src/api/axiosInstance';
import { getAccessToken, getTabRole } from '../../../../Core/src/auth/tokenStore';

/**
 * Normalizes display dates to DD MMM YYYY (e.g. 15 May 1990).
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return 'Not provided';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Not provided';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a 10-digit mobile number as +91 XXXXX XXXXX.
 */
export function formatMobileNumber(mobile) {
  if (!mobile) return 'Not provided';
  const digits = String(mobile).replace(/\D/g, '').slice(-10);
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return String(mobile);
}

/**
 * Formats currency in Indian numbering system (e.g. ₹2,00,000).
 */
export function formatIndianCurrency(val) {
  if (val == null || val === '') return 'Not provided';
  const num = Number(val);
  if (Number.isNaN(num) || !Number.isFinite(num)) return String(val);
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Preserves server-masked account numbers or masks only unmasked numbers.
 */
export function maskAccountNumber(acc) {
  if (!acc) return 'Not provided';
  const str = String(acc).trim();
  if (/[•*]/.test(str)) return str;
  if (str.length < 4) return '••••';
  const last4 = str.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

// Session-isolated in-memory cache and promise deduplicator
const CACHE_TTL_MS = 30000; // 30-second TTL
const MASTER_TTL_MS = 300000; // 5-minute TTL for master lookup tables

let cachedProfileData = null;
let cachedSessionToken = null;
let cachedTimestamp = 0;

let activeFetchPromise = null;
let activeFetchToken = null;

let cachedMasters = null;
let cachedMastersTimestamp = 0;

/**
 * Resets module cache (called on auth failure or identity change).
 */
export function clearCustomerProfileCache() {
  cachedProfileData = null;
  cachedSessionToken = null;
  cachedTimestamp = 0;
  activeFetchPromise = null;
  activeFetchToken = null;
  cachedMasters = null;
  cachedMastersTimestamp = 0;
}

/**
 * Validates whether cached profile data matches the current session token and is within TTL.
 */
function isSessionCacheValid(currentToken) {
  if (!currentToken || !cachedProfileData || !cachedSessionToken) {
    return false;
  }
  if (currentToken !== cachedSessionToken) {
    return false;
  }
  if (Date.now() - cachedTimestamp > CACHE_TTL_MS) {
    return false;
  }
  return true;
}

/**
 * Helper to extract an item's display name from master lookup arrays.
 */
function extractMasterName(item, type) {
  if (!item || typeof item !== 'object') return null;
  switch (type) {
    case 'gender':
      return item.genderName || item.name || item.label || null;
    case 'maritalStatus':
      return item.maritalStatusName || item.name || item.label || null;
    case 'employmentType':
      return item.employmentTypeName || item.name || item.label || null;
    case 'loanProduct':
      return item.productName || item.loanProductName || item.name || item.label || null;
    case 'relationship':
      return item.relationshipName || item.name || item.label || null;
    default:
      return item.name || item.label || item.title || null;
  }
}

/**
 * Helper to extract an item's primary numeric/string ID from master lookup arrays.
 */
function extractMasterId(item, type) {
  if (!item || typeof item !== 'object') return null;
  switch (type) {
    case 'gender':
      return item.genderId ?? item.id ?? item.value;
    case 'maritalStatus':
      return item.maritalStatusId ?? item.id ?? item.value;
    case 'employmentType':
      return item.employmentTypeId ?? item.id ?? item.value;
    case 'loanProduct':
      return item.loanProductId ?? item.id ?? item.value;
    case 'relationship':
      return item.relationshipId ?? item.id ?? item.value;
    default:
      return item.id ?? item.value;
  }
}

/**
 * Fetches and caches master lookup tables concurrently using Promise.allSettled.
 */
export async function fetchMasterLookups(forceRefresh = false) {
  if (!forceRefresh && cachedMasters && Date.now() - cachedMastersTimestamp < MASTER_TTL_MS) {
    return cachedMasters;
  }

  const endpoints = [
    { key: 'gender', path: '/gender' },
    { key: 'maritalStatus', path: '/marital-status' },
    { key: 'employmentType', path: '/EmploymentType' },
    { key: 'loanProduct', path: '/LoanProductMaster' },
    { key: 'relationship', path: '/RelationshipMaster' },
  ];

  const results = await Promise.allSettled(
    endpoints.map((ep) =>
      axiosInstance.get(ep.path).then((res) => {
        const raw = res?.data?.value ?? res?.data?.data ?? res?.data ?? [];
        return { key: ep.key, list: Array.isArray(raw) ? raw : [] };
      })
    )
  );

  const maps = {
    gender: new Map(),
    maritalStatus: new Map(),
    employmentType: new Map(),
    loanProduct: new Map(),
    relationship: new Map(),
  };

  results.forEach((res) => {
    if (res.status === 'fulfilled' && res.value?.key) {
      const { key, list } = res.value;
      const targetMap = maps[key];
      if (targetMap && Array.isArray(list)) {
        list.forEach((item) => {
          const id = extractMasterId(item, key);
          const name = extractMasterName(item, key);
          if (id != null && name) {
            targetMap.set(Number(id), name);
          }
        });
      }
    }
  });

  cachedMasters = maps;
  cachedMastersTimestamp = Date.now();
  return maps;
}

/**
 * Normalizes a raw address record into display and component parts.
 */
function normalizeAddress(addr) {
  if (!addr || typeof addr !== 'object') return null;

  const parts = [
    addr.addressLine1 ?? addr.AddressLine1,
    addr.addressLine2 ?? addr.AddressLine2,
    addr.landmark ?? addr.Landmark,
  ].filter(Boolean);

  const city = addr.city ?? addr.City ?? '';
  const state = addr.state ?? addr.State ?? '';
  const pincode = addr.pincode ?? addr.Pincode ?? addr.pinCode ?? addr.PinCode ?? '';
  const mailingAsCurrent = Boolean(addr.mailingAsCurrent ?? addr.MailingAsCurrent ?? false);

  return {
    addressLine1: addr.addressLine1 ?? addr.AddressLine1 ?? '',
    addressLine2: addr.addressLine2 ?? addr.AddressLine2 ?? '',
    landmark: addr.landmark ?? addr.Landmark ?? '',
    city,
    district: addr.district ?? addr.District ?? city,
    state,
    pincode,
    mailingAsCurrent,
    fullAddress: parts.length > 0 ? parts.join(', ') : '',
  };
}

/**
 * Normalizes raw application records with master lookups and workflow events.
 */
function normalizeApplication(app, masters) {
  if (!app || typeof app !== 'object') return null;

  const loanProductId = app.loanProductId ?? app.LoanProductId ?? null;
  const resolvedProductName =
    loanProductId != null ? masters?.loanProduct?.get(Number(loanProductId)) : null;
  const loanProductName =
    app.productName ??
    app.loanProductName ??
    app.LoanProductName ??
    resolvedProductName ??
    'Loan Facility';

  const rawReferences = Array.isArray(app.references ?? app.References)
    ? app.references ?? app.References
    : [];

  const references = rawReferences.map((ref) => {
    const relationshipId = ref.relationshipId ?? ref.RelationshipId ?? null;
    const resolvedRelName =
      relationshipId != null ? masters?.relationship?.get(Number(relationshipId)) : null;

    return {
      fullName: (ref.fullName ?? ref.FullName ?? '').trim(),
      relationshipId: relationshipId != null ? Number(relationshipId) : null,
      relationshipName: ref.relationshipName ?? ref.RelationshipName ?? resolvedRelName ?? 'Not provided',
      mobileNumber: ref.mobileNumber ?? ref.MobileNumber ?? '',
    };
  });

  const rawWorkflow = Array.isArray(app.workflow ?? app.Workflow)
    ? app.workflow ?? app.Workflow
    : [];

  const workflow = rawWorkflow.map((step) => ({
    status: step.status ?? step.Status ?? 'Updated',
    updatedAt: step.updatedAt ?? step.UpdatedAt ?? null,
    comments: step.comments ?? step.Comments ?? '',
  }));

  const appId =
    app.applicationProductDetailsId ??
    app.ApplicationProductDetailsId ??
    app.appId ??
    app.AppId ??
    null;

  return {
    applicationProductDetailsId: appId != null ? Number(appId) : null,
    applicationNumber: appId != null ? `APP-${appId}` : 'Pending Generation',
    loanProductId: loanProductId != null ? Number(loanProductId) : null,
    loanProductName,
    loanPurposeName: app.loanPurposeName ?? app.LoanPurposeName ?? '',
    loanAmount: app.loanAmount ?? app.LoanAmount ?? null,
    loanTenure: app.loanTenure ?? app.LoanTenure ?? null,
    roi: app.roi ?? app.Roi ?? app.ROI ?? null,
    status: app.status ?? app.Status ?? 'In Progress',
    createdAt: app.createdAt ?? app.CreatedAt ?? null,
    sanctionLetterId: app.sanctionLetterId ?? app.SanctionLetterId ?? null,
    loanAccountNumber: app.loanAccountNumber ?? app.LoanAccountNumber ?? null,
    sanctionedAmount: app.sanctionedAmount ?? app.SanctionedAmount ?? null,
    emi: app.emi ?? app.Emi ?? app.monthlyEmi ?? null,
    references,
    workflow,
  };
}

/**
 * Authoritatively normalizes the confirmed GET /CustomerProfile/me schema.
 */
export function normalizeCustomerProfile(raw, masters) {
  if (!raw || typeof raw !== 'object') return null;

  // 1. Master ID Resolvers
  const genderId = raw.genderId ?? raw.GenderId ?? null;
  const resolvedGender = genderId != null ? masters?.gender?.get(Number(genderId)) : null;
  const gender = raw.genderName ?? raw.gender ?? resolvedGender ?? 'Not provided';

  const maritalStatusId = raw.maritalStatusId ?? raw.MaritalStatusId ?? null;
  const resolvedMarital = maritalStatusId != null ? masters?.maritalStatus?.get(Number(maritalStatusId)) : null;
  const maritalStatus = raw.maritalStatusName ?? raw.maritalStatus ?? resolvedMarital ?? 'Not provided';

  // 2. Employment Normalization
  const rawEmp = raw.employment ?? raw.Employment ?? {};
  const empTypeId = rawEmp.employmentTypeId ?? rawEmp.EmploymentTypeId ?? null;
  const resolvedEmpType = empTypeId != null ? masters?.employmentType?.get(Number(empTypeId)) : null;
  const employmentTypeName =
    rawEmp.employmentTypeName ??
    rawEmp.EmploymentTypeName ??
    resolvedEmpType ??
    'Not provided';

  const rawBusiness = rawEmp.businessDetails ?? rawEmp.BusinessDetails ?? {};
  const businessDetails = {
    businessNature: rawBusiness.businessNature ?? rawBusiness.BusinessNature ?? '',
    gstNumber: rawBusiness.gstNumber ?? rawBusiness.GstNumber ?? '',
    annualTurnover: rawBusiness.annualTurnover ?? rawBusiness.AnnualTurnover ?? null,
  };

  const employment = {
    employmentTypeId: empTypeId != null ? Number(empTypeId) : null,
    employmentTypeName,
    employerName: (rawEmp.employerName ?? rawEmp.EmployerName ?? '').trim(),
    designation: (rawEmp.designation ?? rawEmp.Designation ?? '').trim(),
    grossMonthlyIncome: rawEmp.grossMonthlyIncome ?? rawEmp.GrossMonthlyIncome ?? null,
    netMonthlyIncome: rawEmp.netMonthlyIncome ?? rawEmp.NetMonthlyIncome ?? null,
    businessDetails,
  };

  // 3. Addresses Normalization
  const rawAddresses = Array.isArray(raw.addresses ?? raw.Addresses)
    ? raw.addresses ?? raw.Addresses
    : [];
  const addresses = rawAddresses.map(normalizeAddress).filter(Boolean);

  // 4. Bank Accounts Normalization
  const rawBanks = Array.isArray(raw.bankAccounts ?? raw.BankAccounts)
    ? raw.bankAccounts ?? raw.BankAccounts
    : [];
  const bankAccounts = rawBanks.map((b) => ({
    bankName: (b.bankName ?? b.BankName ?? '').trim(),
    accountHolderName: (b.accountHolderName ?? b.AccountHolderName ?? '').trim(),
    maskedAccountNumber: maskAccountNumber(b.maskedAccountNumber ?? b.accountNumber ?? b.AccountNumber),
    ifsc: (b.ifsc ?? b.Ifsc ?? b.ifscCode ?? b.IfscCode ?? '').trim(),
    branchName: (b.branchName ?? b.BranchName ?? '').trim(),
  }));

  // 5. KYC Normalization
  const rawKyc = raw.kyc ?? raw.Kyc ?? {};
  const kyc = {
    panStatus: rawKyc.panStatus ?? rawKyc.PanStatus ?? null,
    aadhaarStatus: rawKyc.aadhaarStatus ?? rawKyc.AadhaarStatus ?? null,
    profileImagePath: rawKyc.profileImagePath ?? rawKyc.ProfileImagePath ?? null,
  };

  // 6. Applications Normalization
  const rawApplications = Array.isArray(raw.applications ?? raw.Applications)
    ? raw.applications ?? raw.Applications
    : [];
  const applications = rawApplications
    .map((app) => normalizeApplication(app, masters))
    .filter(Boolean);

  const applicationCount =
    raw.applicationCount ??
    raw.ApplicationCount ??
    applications.length;

  const rawCustomerId =
    raw.agentCustomerId ??
    raw.AgentCustomerId ??
    raw.customerId ??
    raw.CustomerId ??
    raw.id ??
    null;

  return {
    agentCustomerId: rawCustomerId != null ? Number(rawCustomerId) : null,
    customerCode: raw.customerCode ?? raw.CustomerCode ?? '',
    fullName: (raw.fullName ?? raw.FullName ?? '').trim(),
    dateOfBirth: raw.dateOfBirth ?? raw.DateOfBirth ?? null,
    genderId: genderId != null ? Number(genderId) : null,
    gender,
    maritalStatusId: maritalStatusId != null ? Number(maritalStatusId) : null,
    maritalStatus,
    mobileNumber: raw.mobileNumber ?? raw.MobileNumber ?? '',
    email: raw.email ?? raw.Email ?? '',
    employment,
    addresses,
    bankAccounts,
    kyc,
    applicationCount: Number(applicationCount) || 0,
    applications,
    createdAt: raw.createdAt ?? raw.CreatedAt ?? null,
    nationality: raw.nationality ?? raw.Nationality ?? 'Indian',
  };
}

/**
 * Authenticated customer profile service calling GET /CustomerProfile/me.
 *
 * Rules:
 * - Scoped strictly to the active session token.
 * - Customer Bearer token authentication only.
 * - Zero URL/query parameters or body parameters.
 * - Resolves all Master IDs using cached lookup maps.
 * - In-memory TTL cache with concurrent request deduplication.
 */
export async function fetchCustomerProfile(forceRefresh = false) {
  const currentToken = getAccessToken();

  if (!currentToken) {
    clearCustomerProfileCache();
    throw new Error('Authentication required: active session token is missing.');
  }

  // Session role check: Ensure request runs for a customer role if defined
  const tabRole = getTabRole();
  if (tabRole && tabRole.toUpperCase() !== 'CUSTOMER') {
    console.warn('[customerProfileService] Active tab role is not CUSTOMER:', tabRole);
  }

  // Invalidate cache immediately if session token changed
  if (cachedSessionToken && cachedSessionToken !== currentToken) {
    clearCustomerProfileCache();
  }

  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && isSessionCacheValid(currentToken)) {
    return cachedProfileData;
  }

  // Deduplicate concurrent in-flight requests under identical token
  if (!forceRefresh && activeFetchPromise && activeFetchToken === currentToken) {
    return activeFetchPromise;
  }

  activeFetchToken = currentToken;
  activeFetchPromise = (async () => {
    // Concurrently fetch master lookups and profile endpoint
    const [profileRes, masters] = await Promise.all([
      axiosInstance.get('/CustomerProfile/me'),
      fetchMasterLookups(false).catch((err) => {
        console.warn('[customerProfileService] Master lookup load failed:', err?.message || err);
        return null;
      }),
    ]);

    // Verify session token did not change while in-flight
    if (getAccessToken() !== currentToken) {
      return null;
    }

    const rawData = profileRes?.data?.value ?? profileRes?.data?.data ?? profileRes?.data;
    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Invalid profile response received from server.');
    }

    const normalized = normalizeCustomerProfile(rawData, masters);

    // Update in-memory session cache
    cachedProfileData = normalized;
    cachedSessionToken = currentToken;
    cachedTimestamp = Date.now();

    return normalized;
  })().finally(() => {
    activeFetchPromise = null;
    activeFetchToken = null;
  });

  return activeFetchPromise;
}

export default {
  fetchCustomerProfile,
  fetchMasterLookups,
  normalizeCustomerProfile,
  clearCustomerProfileCache,
  formatDisplayDate,
  formatMobileNumber,
  formatIndianCurrency,
  maskAccountNumber,
};
