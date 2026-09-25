export const KNOWN_DB_ID_FIELDS = [
  'personalInformationId',
  'PersonalInformationId',
  'kycDocumentId',
  'applicationKYCDocumentId',
  'ApplicationKYCDocumentId',
  'addressDetailsId',
  'applicationAddressDetailsId',
  'ApplicationAddressDetailsId',
  'employmentIncomeDetailsId',
  'applicationEmploymentIncomeDetailsId',
  'ApplicationEmploymentIncomeDetailsId',
  'applicationBankExistingLoanDetailsId',
  'ApplicationBankExistingLoanDetailsId',
  'applicationCollateralDetailsId',
  'ApplicationCollateralDetailsId',
  'applicationReferenceDetailsId',
  'ApplicationReferenceDetailsId',
  'agentCustomerId',
  'AgentCustomerId',
  'rmCustomerId',
  'RmCustomerId',
  'rmId',
  'RmId',
  'RMId',
  'agentId',
  'AgentId',
  'createdBy',
  'CreatedBy',
  'createdByUserId',
  'CreatedByUserId',
  'createdByRole',
  'CreatedByRole',
  'applicationProductDetailsId',
  'ApplicationProductDetailsId',
];

export function mergeEntityObject(target = {}, source = {}) {
  if (!target && !source) return {};
  if (!target) return { ...source };
  if (!source) return { ...target };

  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  // Preserve all existing database IDs if missing or null in source
  for (const idField of KNOWN_DB_ID_FIELDS) {
    if (
      target[idField] !== undefined &&
      target[idField] !== null &&
      target[idField] !== '' &&
      (source[idField] === undefined || source[idField] === null || source[idField] === '')
    ) {
      result[idField] = target[idField];
    }
  }

  return result;
}

export function mergeApplicantArrays(targetArray = [], sourceArray = []) {
  const target = Array.isArray(targetArray) ? targetArray : [];
  const source = Array.isArray(sourceArray) ? sourceArray : [];
  const length = Math.max(target.length, source.length);

  const merged = [];
  for (let i = 0; i < length; i++) {
    const tItem = target[i] || {};
    const sItem = source[i] || {};

    const itemResult = mergeEntityObject(tItem, sItem);

    if (tItem.primaryBank || sItem.primaryBank) {
      itemResult.primaryBank = mergeEntityObject(tItem.primaryBank, sItem.primaryBank);
    }
    if (tItem.otherBank || sItem.otherBank) {
      itemResult.otherBank = mergeEntityObject(tItem.otherBank, sItem.otherBank);
    }
    if (tItem.current || sItem.current) {
      itemResult.current = mergeEntityObject(tItem.current, sItem.current);
    }
    if (tItem.mailing || sItem.mailing) {
      itemResult.mailing = mergeEntityObject(tItem.mailing, sItem.mailing);
    }

    merged.push(itemResult);
  }

  return merged;
}

export function mergeSectionData(targetSection = {}, sourceSection = {}) {
  if (!targetSection && !sourceSection) return {};
  if (!targetSection) return { ...sourceSection };
  if (!sourceSection) return { ...targetSection };

  const result = { ...targetSection, ...sourceSection };

  if (targetSection.applicant || sourceSection.applicant) {
    const tApp = targetSection.applicant || {};
    const sApp = sourceSection.applicant || {};
    result.applicant = mergeEntityObject(tApp, sApp);

    if (tApp.primaryBank || sApp.primaryBank) {
      result.applicant.primaryBank = mergeEntityObject(tApp.primaryBank, sApp.primaryBank);
    }
    if (tApp.otherBank || sApp.otherBank) {
      result.applicant.otherBank = mergeEntityObject(tApp.otherBank, sApp.otherBank);
    }
    if (tApp.current || sApp.current) {
      result.applicant.current = mergeEntityObject(tApp.current, sApp.current);
    }
    if (tApp.mailing || sApp.mailing) {
      result.applicant.mailing = mergeEntityObject(tApp.mailing, sApp.mailing);
    }
  }

  if (targetSection.primaryApplicant || sourceSection.primaryApplicant) {
    result.primaryApplicant = mergeEntityObject(targetSection.primaryApplicant, sourceSection.primaryApplicant);
  }

  if (targetSection.coApplicants || sourceSection.coApplicants) {
    result.coApplicants = mergeApplicantArrays(targetSection.coApplicants, sourceSection.coApplicants);
  }

  if (targetSection.primaryBank || sourceSection.primaryBank) {
    result.primaryBank = mergeEntityObject(targetSection.primaryBank, sourceSection.primaryBank);
  }
  if (targetSection.otherBank || sourceSection.otherBank) {
    result.otherBank = mergeEntityObject(targetSection.otherBank, sourceSection.otherBank);
  }

  if (targetSection.propertyOne || sourceSection.propertyOne) {
    result.propertyOne = mergeEntityObject(targetSection.propertyOne, sourceSection.propertyOne);
  }
  if (targetSection.propertyTwo || sourceSection.propertyTwo) {
    const sP2 = sourceSection.propertyTwo;
    const isP2ExplicitlyCleared =
      sP2 &&
      sP2.applicationCollateralDetailsId === null &&
      (!sP2.typeOfProperty || String(sP2.typeOfProperty).trim() === '') &&
      (!sP2.usage || String(sP2.usage).trim() === '') &&
      (!sP2.locationAddress || String(sP2.locationAddress).trim() === '') &&
      (!sP2.estimatedValue || sP2.estimatedValue === '0' || Number(sP2.estimatedValue) === 0);

    if (isP2ExplicitlyCleared) {
      result.propertyTwo = { ...sP2 };
    } else {
      result.propertyTwo = mergeEntityObject(targetSection.propertyTwo, sourceSection.propertyTwo);
    }
  }

  if (targetSection.reference1 || sourceSection.reference1) {
    result.reference1 = mergeEntityObject(targetSection.reference1, sourceSection.reference1);
  }
  if (targetSection.reference2 || sourceSection.reference2) {
    result.reference2 = mergeEntityObject(targetSection.reference2, sourceSection.reference2);
  }

  return result;
}

export function getSectionState(appData, key, fallback = {}) {
  if (!appData) return fallback;

  let sectionVal = appData?.sections?.[key];
  let rootVal = appData?.[key];

  if (key === 'personalInformation') {
    sectionVal = sectionVal || appData?.sections?.registration?.personalInformation;
    rootVal = rootVal || appData?.registration?.personalInformation || appData?.registration;
  } else if (key === 'collateral') {
    sectionVal = sectionVal || appData?.sections?.collateralDetails;
    rootVal = rootVal || appData?.collateralDetails;
  } else if (key === 'scheduleCharges') {
    sectionVal = sectionVal || appData?.sections?.scheduleOfCharges;
    rootVal = rootVal || appData?.scheduleOfCharges;
  }

  if (sectionVal && rootVal) {
    return mergeSectionData(rootVal, sectionVal);
  }

  return sectionVal || rootVal || fallback;
}

export function buildSectionUpdate(appData, key, value) {
  const existingSection = getSectionState(appData, key, {});
  const mergedValue = mergeSectionData(existingSection, value);

  const updates = {
    sections: {
      ...(appData?.sections || {}),
      [key]: mergedValue,
    },
    [key]: mergedValue,
  };

  if (key === 'personalInformation') {
    updates.registration = {
      ...(appData?.registration || {}),
      personalInformation: mergedValue,
      primaryApplicant: mergedValue.applicant || mergedValue.primaryApplicant,
      coApplicants: mergedValue.coApplicants,
      coApplicantsCount: mergedValue.coApplicants?.length || 0,
    };
  } else if (key === 'collateral') {
    updates.collateralDetails = mergedValue;
  } else if (key === 'scheduleCharges') {
    updates.scheduleOfCharges = mergedValue;
  }

  return updates;
}

export function getApplicantCount(appData) {
  if (!appData) return 0;

  const direct =
    appData.coApplicantsCount !== undefined &&
    appData.coApplicantsCount !== null &&
    appData.coApplicantsCount !== ''
      ? Number(appData.coApplicantsCount)
      : (appData.noOfCoApplicants !== undefined &&
         appData.noOfCoApplicants !== null &&
         appData.noOfCoApplicants !== ''
        ? Number(appData.noOfCoApplicants)
        : null);

  if (direct !== null && Number.isFinite(direct)) {
    return Math.max(0, direct);
  }

  const personalSection = Number(appData?.sections?.personalInformation?.coApplicants?.length || 0);
  const personalReg = Number(appData?.registration?.personalInformation?.coApplicants?.length || 0);
  const personalRoot = Number(appData?.personalInformation?.coApplicants?.length || 0);
  const kycSection = Number(appData?.sections?.kycDocuments?.coApplicants?.length || 0);
  const kycRoot = Number(appData?.kycDocuments?.coApplicants?.length || 0);
  const addressSection = Number(appData?.sections?.addressDetails?.coApplicants?.length || 0);
  const addressRoot = Number(appData?.addressDetails?.coApplicants?.length || 0);
  const empSection = Number(appData?.sections?.employmentIncome?.coApplicants?.length || 0);
  const empRoot = Number(appData?.employmentIncome?.coApplicants?.length || 0);
  const bankSection = Number(appData?.sections?.bankExistingLoans?.coApplicants?.length || 0);
  const bankRoot = Number(appData?.bankExistingLoans?.coApplicants?.length || 0);
  const declSection = Number(appData?.sections?.declaration?.coApplicants?.length || 0);
  const declRoot = Number(appData?.declaration?.coApplicants?.length || 0);

  const maxArrayCount = Math.max(
    personalSection,
    personalReg,
    personalRoot,
    kycSection,
    kycRoot,
    addressSection,
    addressRoot,
    empSection,
    empRoot,
    bankSection,
    bankRoot,
    declSection,
    declRoot
  );

  return maxArrayCount;
}

export function createArray(length, mapper) {
  return Array.from({ length: Math.max(0, Number(length) || 0) }, (_, index) => mapper(index));
}

export function createPersonTemplate(overrides = {}) {
  return {
    personalInformationId: overrides.personalInformationId || null,
    relationshipWithApplicant: overrides.relationshipWithApplicant || '',
    title: overrides.title || '',
    firstName: overrides.firstName || '',
    middleName: overrides.middleName || '',
    lastName: overrides.lastName || '',
    fatherOrSpouseName: overrides.fatherOrSpouseName || '',
    mothersMaidenName: overrides.mothersMaidenName || '',
    dateOfBirth: overrides.dateOfBirth || '',
    religion: overrides.religion || '',
    category: overrides.category || '',
    gender: overrides.gender || '',
    maritalStatus: overrides.maritalStatus || '',
    mobileNo: overrides.mobileNo || '',
    emailId: overrides.emailId || '',
    panCardNo: overrides.panCardNo || '',
  };
}

export function createAddressTemplate(overrides = {}) {
  return {
    addressDetailsId: overrides.addressDetailsId || null,
    addressLine1: overrides.addressLine1 || '',
    addressLine2: overrides.addressLine2 || '',
    landmark: overrides.landmark || '',
    city: overrides.city || '',
    state: overrides.state || '',
    pincode: overrides.pincode || overrides.Pincode || overrides.postalCode || overrides.PostalCode || overrides.pinCode || overrides.PinCode || '',
    mailingSameAsCurrent: overrides.mailingSameAsCurrent || 'No',
  };
}

export function resolveApplicantName(appData = {}) {
  if (!appData) return 'Applicant';

  const applicantDisplayName = String(appData.applicantDisplayName || '').trim();
  if (applicantDisplayName && applicantDisplayName !== 'Applicant') {
    return applicantDisplayName;
  }

  // Priority A: Structured Personal Information applicant name
  const personalApplicant =
    appData.registration?.personalInformation?.applicant ||
    appData.registration?.primaryApplicant ||
    appData.sections?.personalInformation?.applicant ||
    appData.personalInformation?.applicant ||
    appData.sections?.registration?.personalInformation?.applicant;

  if (personalApplicant && typeof personalApplicant === 'object') {
    const parts = [
      personalApplicant.firstName,
      personalApplicant.middleName,
      personalApplicant.lastName,
    ]
      .map((part) => String(part || '').trim())
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' ');
    }
  }

  // Priority B: Direct customer / applicant string fields
  const directCustomerName = String(appData.customerName || '').trim();
  if (directCustomerName && directCustomerName !== 'Applicant') {
    return directCustomerName;
  }

  const directFullName = String(appData.fullName || '').trim();
  if (directFullName && directFullName !== 'Applicant') {
    return directFullName;
  }

  const directApplicantName = String(appData.applicantName || '').trim();
  if (directApplicantName && directApplicantName !== 'Applicant') {
    return directApplicantName;
  }

  // Priority C: Final fallback (NEVER agentName)
  return 'Applicant';
}

/**
 * Official Application Number Generator (Used ONCE during customer intake creation)
 * Algorithm: First 2 letters of Applicant Name + DOB Day (DD) + Last 3 digits of Mobile Number
 * Returns null if any required input is missing or invalid. Never invents fallback placeholders.
 */
export function generateOfficialAppId({ fullName = '', dateOfBirth = '', mobileNumber = '' } = {}) {
  const firstName = String(fullName || '').trim().split(/\s+/)[0] || '';
  if (firstName.length < 2) return null;
  const initials = firstName.slice(0, 2).toUpperCase();

  if (!dateOfBirth) return null;
  const dobStr = String(dateOfBirth).trim();
  // Match YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD/MM/YYYY
  const isoMatch = dobStr.match(/^\d{4}[-/]\d{1,2}[-/](\d{1,2})/);
  const dmyMatch = dobStr.match(/^(\d{1,2})[-/]\d{1,2}[-/]\d{4}/);
  let dayStr = '';
  if (isoMatch) {
    dayStr = isoMatch[1].padStart(2, '0');
  } else if (dmyMatch) {
    dayStr = dmyMatch[1].padStart(2, '0');
  } else {
    const d = new Date(dobStr);
    if (!isNaN(d.getTime())) {
      dayStr = String(d.getDate()).padStart(2, '0');
    }
  }
  if (!dayStr || dayStr === '00' || isNaN(Number(dayStr)) || Number(dayStr) < 1 || Number(dayStr) > 31) return null;

  const cleanMobile = String(mobileNumber || '').replace(/\D/g, '');
  if (cleanMobile.length < 3) return null;
  const mobileTail = cleanMobile.slice(-3);

  return `${initials}${dayStr}${mobileTail}`;
}

/**
 * Official Application Number Reader / Formatter
 * Priority: Returns the backend-persisted official appId (AgentAddCustomer.App_Id).
 * Does NOT regenerate/recalculate IDs on the fly. Fallback for historical empty records is 'N/A'.
 */
export function buildApplicationDisplayId(record = {}, fallbackId = '') {
  if (!record) return fallbackId || 'N/A';
  const existingAppId =
    record.appId ??
    record.AppId ??
    record.App_Id ??
    record.applicationNo ??
    record.ApplicationNo ??
    record.applicationNumber ??
    record.ApplicationNumber;

  if (existingAppId && typeof existingAppId === 'string' && existingAppId.trim() !== '') {
    const trimmed = existingAppId.trim();
    if (!trimmed.startsWith('APP-') && trimmed !== 'N/A' && trimmed !== '-') {
      return trimmed;
    }
  }

  return 'N/A';
}

/**
 * Helper to identify whether a document is an Aadhaar document.
 * Strictly verifies documentTypeId === 1, or name matches aadhaar/aadhar while excluding other types.
 */
export function isAadhaarDoc(doc) {
  if (!doc) return false;
  const typeCode = String(doc.documentTypeCode || doc.DocumentTypeCode || doc.code || '').toUpperCase().trim();
  if (typeCode === 'AADHAAR' || typeCode === 'AADHAR') return true;

  const typeName = String(doc.documentTypeName || doc.documentType || doc.DocumentTypeName || '').toLowerCase();
  if (
    typeName.includes('bank') ||
    typeName.includes('salary') ||
    typeName.includes('income') ||
    typeName.includes('photo') ||
    typeName.includes('profile') ||
    typeName.includes('pan')
  ) {
    return false;
  }
  return typeName.includes('aadhaar') || typeName.includes('aadhar');
}

// In-memory session caches to prevent duplicate requests and infinite lookup loops
// (Not persisted to localStorage/sessionStorage)
const tupleLookupCache = new Map(); // key = `${prodDetailsId}:${seq}:${docTypeId}`
const rawBlobCache = new Map(); // key = url -> Promise<{ blob: Blob, isPdf: boolean, mimeType: string }>
const agentCustDocsCache = new Map(); // key = custId

/**
 * Downloads a document as a Blob from a given URL and converts it into a browser Object URL.
 * Treats 404 silently as an expected empty state without console logging.
 */
export async function fetchDocumentBlobAsUrl(url, headers = {}, fallbackFileName = '') {
  const meta = await fetchDocumentBlobWithMeta(url, headers, fallbackFileName);
  return meta?.url || null;
}

/**
 * Composite tuple lookup helper for applicant/co-applicant documents.
 * Treats 404 silently as an expected empty state and caches in-memory.
 */
export async function fetchApplicantDocumentTuple(finalBaseUrl, prodDetailsId, seq, docTypeId, headers = {}) {
  const cacheKey = `${prodDetailsId}:${seq}:${docTypeId}`;
  if (tupleLookupCache.has(cacheKey)) {
    return tupleLookupCache.get(cacheKey);
  }

  const lookupPromise = (async () => {
    try {
      const tupleRes = await fetch(
        `${finalBaseUrl}/ApplicationKYCDocuments/applicant-document?applicationProductDetailsId=${encodeURIComponent(prodDetailsId)}&applicantSequence=${encodeURIComponent(seq)}&documentTypeId=${encodeURIComponent(docTypeId)}`,
        { headers }
      );
      if (tupleRes.status === 404) {
        // Expected empty state when document is not uploaded
        return null;
      }
      if (tupleRes.ok) {
        const contentType = tupleRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const tupleDoc = await tupleRes.json();
          const docPath = tupleDoc?.documentPath || tupleDoc?.DocumentPath || tupleDoc?.filePath || tupleDoc?.FilePath;
          if (docPath) {
            const cleanPath = String(docPath).replace(/^[\\/]+/, '').replace(/\\/g, '/');
            const url = await fetchDocumentBlobAsUrl(`${finalBaseUrl}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`, headers, docPath);
            if (url) return url;
          }
        } else {
          const blob = await tupleRes.blob();
          if (blob && blob.size > 0) {
            const typedBlob = new Blob([blob], { type: blob.type || 'image/jpeg' });
            return URL.createObjectURL(typedBlob);
          }
        }
      }
    } catch {
      // Ignore network errors
    }
    return null;
  })();

  tupleLookupCache.set(cacheKey, lookupPromise);
  return lookupPromise;
}

/**
 * Resolves the latest Aadhaar document for Primary Applicant (applicantSequence 0).
 *
 * Contract:
 * 1. Resolve KYC row for applicantSequence = 0.
 * 2. Check canonical AadharDocumentPath (or aadharDocumentPath).
 * 3. If path is null/empty:
 *    - Return null immediately (no Aadhaar uploaded).
 *    - Do NOT call /{id}/aadhar.
 *    - Do NOT call generic applicant-document tuple endpoint.
 *    - Do NOT fallback to AgentCustomerDocument.
 * 4. If path exists:
 *    - Call dedicated endpoint /ApplicationKYCDocuments/{kycDocumentId}/aadhar.
 *    - If blob returned, return object URL.
 *    - Fallback: download via canonical path if dedicated endpoint is not available.
 */
export async function resolveLatestApplicantAadhaar({
  appData = {},
  appId = '',
  applicationProductDetailsId = null,
  baseUrl = '',
  headers = {},
}) {
  const finalBaseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

  // 1. Resolve Applicant KYC record (applicantSequence 0)
  const kycDocs = appData.sections?.kycDocuments || appData.kycDocuments || {};
  const applicantKyc = kycDocs.applicant || appData.applicantKyc || {};

  const aadharPath = (
    applicantKyc.aadharDocumentPath ||
    applicantKyc.AadharDocumentPath ||
    appData.aadharDocumentPath ||
    appData.AadharDocumentPath
  );

  // If path is null/empty, strictly return null (no preview, no /{id}/aadhar, no generic tuple, no AgentCustomerDocument fallback)
  if (!aadharPath || typeof aadharPath !== 'string' || !aadharPath.trim() || aadharPath.trim().toLowerCase() === 'null' || aadharPath.trim().toLowerCase() === 'undefined') {
    return null;
  }

  // 2. Path exists -> Fetch via dedicated endpoint /ApplicationKYCDocuments/{kycDocumentId}/aadhar
  const applicantKycId = (
    applicantKyc.kycDocumentId ||
    applicantKyc.applicationKYCDocumentId ||
    applicantKyc.ApplicationKYCDocumentId ||
    appData.kycDocumentId ||
    appData.applicationKYCDocumentId
  );

  if (applicantKycId && Number(applicantKycId) > 0) {
    const docMeta = await fetchDocumentBlobWithMeta(
      `${finalBaseUrl}/ApplicationKYCDocuments/${encodeURIComponent(applicantKycId)}/aadhar`,
      headers,
      aadharPath || 'aadhar.jpg'
    );
    if (docMeta) return docMeta;
  }

  // Fallback if dedicated endpoint blob fetch fails: download by canonical path
  const cleanPath = String(aadharPath).replace(/^[\\/]+/, '').replace(/\\/g, '/');
  const docMeta = await fetchDocumentBlobWithMeta(
    `${finalBaseUrl}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`,
    headers,
    aadharPath
  );
  return docMeta || null;
}

/**
 * Resolves the latest Aadhaar document for a specific Co-Applicant.
 *
 * Contract:
 * 1. Strict sequence isolation: Co-App 1 = sequence 1, Co-App 2 = sequence 2, etc.
 * 2. Resolve KYC row by real applicantSequence (seq = coIndex + 1).
 * 3. Check canonical AadharDocumentPath (or aadharDocumentPath).
 * 4. If missing/null/empty:
 *    - Return null immediately (no preview).
 *    - Do NOT call generic tuple lookup.
 *    - Do NOT call /{id}/aadhar.
 *    - Do NOT fallback to AgentCustomerDocument.
 * 5. If present:
 *    - Call dedicated endpoint /ApplicationKYCDocuments/{kycDocumentId}/aadhar.
 *    - If blob returned, return object URL.
 *    - Fallback: download via canonical path if dedicated endpoint is not available.
 */
export async function resolveLatestCoApplicantAadhaar({
  coKyc = {},
  coPersonalInfo = {},
  coIndex = 0,
  appData = {},
  appId = '',
  applicationProductDetailsId = null,
  baseUrl = '',
  headers = {},
}) {
  const finalBaseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
  const seq = coIndex + 1; // Co-App 1 = sequence 1, Co-App 2 = sequence 2

  // 1. Resolve Co-Applicant KYC Data from all possible contexts
  const resolvedCoKyc =
    (coKyc && Object.keys(coKyc).length > 0)
      ? coKyc
      : (appData?.sections?.kycDocuments?.coApplicants?.[coIndex] || appData?.kycDocuments?.coApplicants?.[coIndex] || {});

  const resolvedCoPersonalInfo =
    (coPersonalInfo && Object.keys(coPersonalInfo).length > 0)
      ? coPersonalInfo
      : (appData?.sections?.personalInformation?.coApplicants?.[coIndex] || appData?.personalInformation?.coApplicants?.[coIndex] || {});

  const aadharPath = (
    resolvedCoKyc.aadharDocumentPath ||
    resolvedCoKyc.AadharDocumentPath ||
    resolvedCoPersonalInfo.aadharDocumentPath ||
    resolvedCoPersonalInfo.AadharDocumentPath
  );

  // If path is missing/null/empty, strictly return null (no preview, no generic tuple, no /{id}/aadhar, no AgentCustomerDocument fallback)
  if (!aadharPath || typeof aadharPath !== 'string' || !aadharPath.trim() || aadharPath.trim().toLowerCase() === 'null' || aadharPath.trim().toLowerCase() === 'undefined') {
    return null;
  }

  // 2. Path exists -> Fetch via dedicated endpoint /ApplicationKYCDocuments/{kycDocumentId}/aadhar
  const kycId = (
    resolvedCoKyc.kycDocumentId ||
    resolvedCoKyc.applicationKYCDocumentId ||
    resolvedCoKyc.ApplicationKYCDocumentId ||
    resolvedCoPersonalInfo.kycDocumentId ||
    resolvedCoPersonalInfo.applicationKYCDocumentId ||
    resolvedCoPersonalInfo.ApplicationKYCDocumentId
  );

  if (kycId && Number(kycId) > 0) {
    const docMeta = await fetchDocumentBlobWithMeta(
      `${finalBaseUrl}/ApplicationKYCDocuments/${encodeURIComponent(kycId)}/aadhar`,
      headers,
      aadharPath || `co_applicant_${seq}_aadhar.jpg`
    );
    if (docMeta) return docMeta;
  }

  // Fallback if dedicated endpoint blob fetch fails: download by canonical path
  const cleanPath = String(aadharPath).replace(/^[\\/]+/, '').replace(/\\/g, '/');
  const docMeta = await fetchDocumentBlobWithMeta(
    `${finalBaseUrl}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`,
    headers,
    aadharPath
  );
  return docMeta || null;
}

// Backward-compatible aliases
export const loadApplicantAadhaarUrl = resolveLatestApplicantAadhaar;
export const loadCoApplicantAadhaarUrl = resolveLatestCoApplicantAadhaar;

/**
 * Downloads a document as a Blob from a given URL and converts it into a browser Object URL
 * along with format metadata (isPdf, mimeType).
 * Treats 404 silently as an expected empty state without console logging.
 */
export async function fetchDocumentBlobWithMeta(url, headers = {}, fallbackFileName = '') {
  if (!url) return null;
  const cacheKey = url;
  if (!rawBlobCache.has(cacheKey)) {
    const fetchPromise = (async () => {
      try {
        const res = await fetch(url, { headers });
        if (res.status === 404 || !res.ok) {
          return null;
        }
        const blob = await res.blob();
        if (!blob || blob.size === 0) return null;

        const ext = String(fallbackFileName || url).split('?')[0].split('.').pop()?.toLowerCase();
        let mimeType = blob.type || 'image/jpeg';
        if (mimeType === 'application/octet-stream' || !mimeType) {
          if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
          else if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'webp') mimeType = 'image/webp';
          else if (ext === 'pdf') mimeType = 'application/pdf';
        }
        const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
        return { blob, isPdf, mimeType };
      } catch {
        return null;
      }
    })();
    rawBlobCache.set(cacheKey, fetchPromise);
  }

  const meta = await rawBlobCache.get(cacheKey);
  if (!meta || !meta.blob) return null;

  const typedBlob = new Blob([meta.blob], { type: meta.mimeType });
  const objectUrl = URL.createObjectURL(typedBlob);
  return { url: objectUrl, isPdf: meta.isPdf, mimeType: meta.mimeType };
}

/**
 * Generic Financial Document Resolver (Salary Slip & Bank Statement).
 * Supports both Primary Applicant (seq 0) and Co-Applicants (seq 1..N).
 *
 * Priority Order:
 * 1. Application-Level Tuple (Authoritative Replacement / Resubmitted Document):
 *    GET /ApplicationKYCDocuments/applicant-document?applicationProductDetailsId={id}&applicantSequence={seq}&documentTypeId={typeId}
 *    If tuple exists and has documentPath -> download via /ApplicationKYCDocuments/download?path={cleanPath}
 * 2. Initial Draft Fallback (ONLY if tuple is 404 / not yet created):
 *    GET /AgentCustomerDocument/bycustomer/{customerId}
 *    Match sequence and documentTypeId / document category.
 * 3. Fallback: null (Displays "Document not available")
 */
export async function resolveFinancialDocument({
  appData = {},
  appId = '',
  applicationProductDetailsId = null,
  sequence = 0,
  documentTypeId = null,
  documentCategory = '', // 'Salary Slip' | 'Bank Statement'
  baseUrl = '',
  headers = {},
}) {
  const finalBaseUrl = (baseUrl || import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api').replace(/\/$/, '');
  const seq = Number(sequence) || 0;

  const prodDetailsId =
    applicationProductDetailsId ||
    appData?.applicationProductDetailsId ||
    appData?.ApplicationProductDetailsId ||
    appData?.sections?.productDetails?.applicationProductDetailsId ||
    appData?.productDetails?.applicationProductDetailsId ||
    null;

  const resolvedTypeId =
    documentTypeId !== null && documentTypeId !== undefined && !isNaN(Number(documentTypeId)) && Number(documentTypeId) > 0
      ? Number(documentTypeId)
      : null;

  // Priority 1: Check Application-level tuple if product details ID and documentTypeId are available
  if (prodDetailsId && resolvedTypeId) {
    try {
      const tupleRes = await fetch(
        `${finalBaseUrl}/ApplicationKYCDocuments/applicant-document?applicationProductDetailsId=${encodeURIComponent(prodDetailsId)}&applicantSequence=${encodeURIComponent(seq)}&documentTypeId=${encodeURIComponent(resolvedTypeId)}`,
        { headers }
      );

      if (tupleRes.ok) {
        const contentType = tupleRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const tupleDoc = await tupleRes.json();
          const docPath = tupleDoc?.documentPath || tupleDoc?.DocumentPath || tupleDoc?.filePath || tupleDoc?.FilePath;
          if (docPath) {
            const cleanPath = String(docPath).replace(/^[\\/]+/, '').replace(/\\/g, '/');
            const docResult = await fetchDocumentBlobWithMeta(
              `${finalBaseUrl}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`,
              headers,
              docPath
            );
            if (docResult) return docResult;
          }
        } else {
          const blob = await tupleRes.blob();
          if (blob && blob.size > 0) {
            let mimeType = blob.type || 'image/jpeg';
            if (mimeType === 'application/octet-stream') mimeType = 'image/jpeg';
            const isPdf = mimeType === 'application/pdf';
            const typedBlob = new Blob([blob], { type: mimeType });
            return { url: URL.createObjectURL(typedBlob), isPdf, mimeType };
          }
        }
      } else if (tupleRes.status !== 404) {
        // If non-404 error (e.g. 500), do not silently fallback to stale agent docs
        return null;
      }
    } catch (err) {
      console.warn(`Error resolving application tuple for seq ${seq}, type ${resolvedTypeId}:`, err);
    }
  }

  // Priority 2: Initial Draft Fallback (Agent customer document) ONLY if tuple not found (404 or missing prodId)
  const customerId =
    appId ||
    appData?.agentCustomerId ||
    appData?.AgentCustomerId ||
    appData?.customerId ||
    appData?.CustomerId ||
    null;

  if (customerId) {
    try {
      let custDocs = agentCustDocsCache.get(String(customerId));
      if (!custDocs) {
        const agentDocRes = await fetch(`${finalBaseUrl}/AgentCustomerDocument/bycustomer/${encodeURIComponent(customerId)}`, { headers });
        if (agentDocRes.ok) {
          const data = await agentDocRes.json();
          custDocs = Array.isArray(data) ? data : (data?.value ?? data?.data ?? []);
          agentCustDocsCache.set(String(customerId), custDocs);
        } else {
          custDocs = [];
        }
      }

      if (Array.isArray(custDocs) && custDocs.length > 0) {
        const normalizedCategory = String(documentCategory || '').trim().toLowerCase();
        
        const matched = custDocs.find((d) => {
          if (!d || d.isActive === false || d.IsActive === false) return false;

          // Sequence match
          const dSeq = d.applicantSequence !== undefined && d.applicantSequence !== null ? Number(d.applicantSequence) : (d.ApplicantSequence !== undefined && d.ApplicantSequence !== null ? Number(d.ApplicantSequence) : 0);
          if (dSeq !== seq) return false;

          // Type ID match
          const dTypeId = Number(d.documentTypeId ?? d.DocumentTypeId);
          if (resolvedTypeId && Number.isFinite(dTypeId) && dTypeId === resolvedTypeId) {
            return true;
          }

          // Category name match fallback
          if (normalizedCategory) {
            const dName = String(d.documentTypeName || d.documentName || d.name || '').toLowerCase();
            const dCode = String(d.documentTypeCode || d.code || '').toLowerCase();
            if (normalizedCategory.includes('salary') && (dName.includes('salary') || dCode.includes('salary') || dName.includes('income'))) return true;
            if (normalizedCategory.includes('bank') && (dName.includes('bank') || dCode.includes('bank') || dName.includes('statement'))) return true;
          }

          return false;
        });

        if (matched) {
          const docPath = matched.documentPath || matched.DocumentPath || matched.filePath || matched.FilePath;
          if (docPath) {
            const cleanPath = String(docPath).replace(/^[\\/]+/, '').replace(/\\/g, '/');
            const docResult = await fetchDocumentBlobWithMeta(
              `${finalBaseUrl}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`,
              headers,
              docPath
            );
            if (docResult) return docResult;
          }
        }
      }
    } catch (agentErr) {
      console.warn(`Error resolving agent customer document for seq ${seq}:`, agentErr);
    }
  }

  // Priority 3: Document not available
  return null;
}

export async function resolveLatestApplicantSalarySlip(params) {
  return resolveFinancialDocument({
    ...params,
    sequence: 0,
    documentCategory: 'Salary Slip',
  });
}

export async function resolveLatestCoApplicantSalarySlip(params) {
  const seq = (params.coIndex !== undefined && params.coIndex !== null) ? (params.coIndex + 1) : (params.sequence || 1);
  return resolveFinancialDocument({
    ...params,
    sequence: seq,
    documentCategory: 'Salary Slip',
  });
}

export async function resolveLatestApplicantBankStatement(params) {
  return resolveFinancialDocument({
    ...params,
    sequence: 0,
    documentCategory: 'Bank Statement',
  });
}

export async function resolveLatestCoApplicantBankStatement(params) {
  const seq = (params.coIndex !== undefined && params.coIndex !== null) ? (params.coIndex + 1) : (params.sequence || 1);
  return resolveFinancialDocument({
    ...params,
    sequence: seq,
    documentCategory: 'Bank Statement',
  });
}


