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
    result.propertyTwo = mergeEntityObject(targetSection.propertyTwo, sourceSection.propertyTwo);
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

export function buildApplicationDisplayId(record = {}, fallbackId = '') {
  const applicant = record.registration?.personalInformation?.applicant ||
    record.sections?.personalInformation?.applicant || record.personalInformation?.applicant ||
    record.applicant || record.Applicant || {};
  const firstName = String(applicant.firstName || applicant.FirstName || record.firstName || record.FirstName || record.fullName || record.FullName || record.customerName || record.CustomerName || '')
    .trim().split(/\s+/)[0] || '';
  const initials = firstName.slice(0, 2).toUpperCase().padEnd(2, 'X');
  const applicationDate = record.applicationDate || record.ApplicationDate || record.createdDate || record.CreatedDate ||
    record.createdAt || record.CreatedAt || record.submittedAt || record.SubmittedAt || '';
  const dateMatch = String(applicationDate).match(/^(?:\d{4}[-/]\d{2}[-/](\d{2})|\d{2}[-/]\d{2}[-/]\d{4})/);
  const applicationDay = dateMatch ? dateMatch[1] || String(applicationDate).slice(0, 2) : '00';
  const mobile = String(applicant.mobileNo || applicant.MobileNo || applicant.mobileNumber || applicant.MobileNumber || record.mobileNumber || record.MobileNumber || record.mobile || record.Mobile || '').replace(/\D/g, '');
  const mobileTail = mobile.slice(-3).padStart(3, '0');
  return `${initials}${applicationDay}${mobileTail}`;
}

/**
 * Helper to identify whether a document is an Aadhaar document.
 * Strictly verifies documentTypeId === 1, or name matches aadhaar/aadhar while excluding other types.
 */
export function isAadhaarDoc(doc) {
  if (!doc) return false;
  const typeId = Number(doc.documentTypeId || doc.DocumentTypeId);
  if (typeId === 1) return true;
  if ([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(typeId)) return false;
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

/**
 * Downloads a document as a Blob from a given URL and converts it into a browser Object URL.
 */
async function fetchDocumentBlobAsUrl(url, headers = {}, fallbackFileName = '') {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
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
    const typedBlob = new Blob([blob], { type: mimeType });
    return URL.createObjectURL(typedBlob);
  } catch (e) {
    console.warn(`Failed to fetch document blob from ${url}:`, e);
    return null;
  }
}

/**
 * Resolves the latest Aadhaar document for Primary Applicant (applicantSequence 0).
 * Rule:
 * 1. Priority: Latest updated Aadhaar (from ApplicationKYCDocuments or latest AgentCustomerDocument).
 * 2. Fallback: Original Agent-uploaded Aadhaar.
 */
export async function resolveLatestApplicantAadhaar({ appData = {}, appId = '', baseUrl = '', headers = {} }) {
  const finalBaseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

  // 1. Resolve Customer ID Candidates
  const candidateCustomerIds = [
    appData.agentCustomerId,
    appData.AgentCustomerId,
    appData.customerId,
    appData.CustomerId,
    appData.Applicant?.agentCustomerId,
    appData.applicant?.agentCustomerId,
    appData.Applicant?.customerId,
    appData.applicant?.customerId,
  ].filter(Boolean);

  // If customer ID is still not known from appData, resolve from AgentAddCustomer or ApplicationProductDetails
  if (appId && candidateCustomerIds.length === 0) {
    try {
      const custRes = await fetch(`${finalBaseUrl}/AgentAddCustomer/${appId}`, { headers });
      if (custRes.ok) {
        const custData = await custRes.json();
        const record = Array.isArray(custData) ? custData[0] : (custData?.value ? custData.value[0] : custData);
        const resolvedId = record?.agentCustomerId || record?.AgentCustomerId || record?.customerId || record?.CustomerId;
        if (resolvedId) candidateCustomerIds.push(resolvedId);
      }
    } catch {}

    if (candidateCustomerIds.length === 0) {
      try {
        const prodRes = await fetch(`${finalBaseUrl}/ApplicationProductDetails/${appId}`, { headers });
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const prodRecord = Array.isArray(prodData) ? prodData[0] : (prodData?.value ? prodData.value[0] : prodData);
          const resolvedId = prodRecord?.agentCustomerId || prodRecord?.AgentCustomerId || prodRecord?.customerId || prodRecord?.CustomerId;
          if (resolvedId) candidateCustomerIds.push(resolvedId);
        }
      } catch {}
    }
  }

  // Always include appId as candidate fallback
  if (appId && !candidateCustomerIds.includes(appId)) {
    candidateCustomerIds.push(appId);
  }

  // 2. Step A: Check for Updated Aadhaar in ApplicationKYCDocuments (applicantSequence 0 / applicant KYC record)
  // Check 2a: Composite tuple lookup for Applicant (sequence 0, documentTypeId 1)
  if (appId) {
    try {
      const tupleRes = await fetch(
        `${finalBaseUrl}/ApplicationKYCDocuments/applicant-document?applicationProductDetailsId=${encodeURIComponent(appId)}&applicantSequence=0&documentTypeId=1`,
        { headers }
      );
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
    } catch {}
  }

  // Check 2b: ApplicationKYCDocuments aadharDocumentPath for applicant
  const kycDocs = appData.sections?.kycDocuments || appData.kycDocuments || {};
  const applicantKyc = kycDocs.applicant || {};
  const aadharPath = applicantKyc.aadharDocumentPath || applicantKyc.AadharDocumentPath;
  if (aadharPath) {
    const cleanPath = String(aadharPath).replace(/^[\\/]+/, '').replace(/\\/g, '/');
    const url = await fetchDocumentBlobAsUrl(`${finalBaseUrl}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`, headers, aadharPath);
    if (url) return url;
  }

  // Check 2c: Direct route ApplicationKYCDocuments/{kycId}/aadhar
  const applicantKycId = applicantKyc.kycDocumentId || applicantKyc.applicationKYCDocumentId;
  if (applicantKycId) {
    const url = await fetchDocumentBlobAsUrl(`${finalBaseUrl}/ApplicationKYCDocuments/${applicantKycId}/aadhar`, headers, 'aadhar.jpg');
    if (url) return url;
  }

  // 3. Step B: Check AgentCustomerDocument for Updated vs Original Aadhaar
  for (const custId of candidateCustomerIds) {
    try {
      const res = await fetch(`${finalBaseUrl}/AgentCustomerDocument/bycustomer/${custId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const docList = Array.isArray(data) ? data : (data?.data || data?.value || data?.items || []);
        const activeApplicantDocs = docList.filter(
          (d) =>
            d &&
            d.isActive !== false &&
            (d.applicantSequence === 0 || d.applicantSequence === '0' || d.applicantSequence === null || d.applicantSequence === undefined) &&
            isAadhaarDoc(d)
        );

        if (activeApplicantDocs.length > 0) {
          // Sort by latest modified / created / ID DESC (Latest Updated First)
          const latestSortedDocs = [...activeApplicantDocs].sort((a, b) => {
            const timeA = new Date(a.modifiedAt || a.updatedAt || a.createdAt || a.createdDate || 0).getTime();
            const timeB = new Date(b.modifiedAt || b.updatedAt || b.createdAt || b.createdDate || 0).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return (Number(b.agentCustomerDocumentId || b.id) || 0) - (Number(a.agentCustomerDocumentId || a.id) || 0);
          });

          // Sort by original / earliest ASC (Original Fallback First)
          const originalSortedDocs = [...activeApplicantDocs].sort((a, b) => {
            if (a.isOriginal && !b.isOriginal) return -1;
            if (!a.isOriginal && b.isOriginal) return 1;
            const timeA = new Date(a.createdAt || a.createdDate || 0).getTime();
            const timeB = new Date(b.createdAt || b.createdDate || 0).getTime();
            if (timeA && timeB && timeA !== timeB) return timeA - timeB;
            return (Number(a.agentCustomerDocumentId || a.id) || 0) - (Number(b.agentCustomerDocumentId || b.id) || 0);
          });

          // Priority 1: Pick latest updated active document
          const targetDoc = latestSortedDocs[0] || originalSortedDocs[0];
          const docId = targetDoc.agentCustomerDocumentId || targetDoc.id;
          if (docId) {
            const url = await fetchDocumentBlobAsUrl(`${finalBaseUrl}/AgentCustomerDocument/download/${docId}`, headers, targetDoc.fileName);
            if (url) return url;
          }
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Resolves the latest Aadhaar document for a specific Co-Applicant.
 * Rule:
 * 1. Priority: Latest updated Aadhaar for this exact co-applicant sequence.
 * 2. Fallback: Original RM-uploaded Aadhaar for this exact co-applicant sequence.
 * Strict sequence isolation: Co-App 1 = seq 1, Co-App 2 = seq 2, etc.
 */
export async function resolveLatestCoApplicantAadhaar({
  coKyc = {},
  coPersonalInfo = {},
  coIndex = 0,
  appData = {},
  appId = '',
  baseUrl = '',
  headers = {},
}) {
  const finalBaseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
  const seq = coIndex + 1;

  // Resolve Co-Applicant KYC Data from all possible contexts
  const resolvedCoKyc =
    (coKyc && Object.keys(coKyc).length > 0)
      ? coKyc
      : (appData?.sections?.kycDocuments?.coApplicants?.[coIndex] || appData?.kycDocuments?.coApplicants?.[coIndex] || {});

  const resolvedCoPersonalInfo =
    (coPersonalInfo && Object.keys(coPersonalInfo).length > 0)
      ? coPersonalInfo
      : (appData?.sections?.personalInformation?.coApplicants?.[coIndex] || appData?.personalInformation?.coApplicants?.[coIndex] || {});

  const kycId =
    resolvedCoKyc.kycDocumentId ||
    resolvedCoKyc.applicationKYCDocumentId ||
    resolvedCoPersonalInfo.kycDocumentId ||
    resolvedCoPersonalInfo.applicationKYCDocumentId;

  // 1. Check composite tuple lookup for this exact co-applicant sequence: sequence = seq, documentTypeId = 1 (Aadhaar)
  if (appId) {
    try {
      const tupleRes = await fetch(
        `${finalBaseUrl}/ApplicationKYCDocuments/applicant-document?applicationProductDetailsId=${encodeURIComponent(appId)}&applicantSequence=${encodeURIComponent(seq)}&documentTypeId=1`,
        { headers }
      );
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
    } catch {}
  }

  // 2. Check ApplicationKYCDocuments aadharDocumentPath
  const aadharPath = resolvedCoKyc.aadharDocumentPath || resolvedCoKyc.AadharDocumentPath;
  if (aadharPath) {
    const cleanPath = String(aadharPath).replace(/^[\\/]+/, '').replace(/\\/g, '/');
    const url = await fetchDocumentBlobAsUrl(`${finalBaseUrl}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`, headers, aadharPath);
    if (url) return url;
  }

  // 3. Check Direct route: ApplicationKYCDocuments/{kycId}/aadhar
  if (kycId) {
    const url = await fetchDocumentBlobAsUrl(`${finalBaseUrl}/ApplicationKYCDocuments/${kycId}/aadhar`, headers, 'aadhar.jpg');
    if (url) return url;
  }

  // 4. Check AgentCustomerDocument for this exact co-applicant sequence
  const candidateCustomerIds = [
    appData?.agentCustomerId,
    appData?.AgentCustomerId,
    appData?.customerId,
    appData?.CustomerId,
    appId,
  ].filter(Boolean);

  for (const custId of candidateCustomerIds) {
    try {
      const res = await fetch(`${finalBaseUrl}/AgentCustomerDocument/bycustomer/${custId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const docList = Array.isArray(data) ? data : (data?.data || data?.value || data?.items || []);
        const activeCoDocs = docList.filter(
          (d) =>
            d &&
            d.isActive !== false &&
            (d.applicantSequence === seq || d.applicantSequence === String(seq)) &&
            isAadhaarDoc(d)
        );

        if (activeCoDocs.length > 0) {
          // Sort by latest modified / created / ID DESC (Latest Updated First)
          activeCoDocs.sort((a, b) => {
            const timeA = new Date(a.modifiedAt || a.updatedAt || a.createdAt || a.createdDate || 0).getTime();
            const timeB = new Date(b.modifiedAt || b.updatedAt || b.createdAt || b.createdDate || 0).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return (Number(b.agentCustomerDocumentId || b.id) || 0) - (Number(a.agentCustomerDocumentId || a.id) || 0);
          });

          const targetDoc = activeCoDocs[0];
          const docId = targetDoc.agentCustomerDocumentId || targetDoc.id;
          if (docId) {
            const url = await fetchDocumentBlobAsUrl(`${finalBaseUrl}/AgentCustomerDocument/download/${docId}`, headers, targetDoc.fileName);
            if (url) return url;
          }
        }
      }
    } catch {}
  }

  return null;
}

// Backward-compatible aliases
export const loadApplicantAadhaarUrl = resolveLatestApplicantAadhaar;
export const loadCoApplicantAadhaarUrl = resolveLatestCoApplicantAadhaar;

