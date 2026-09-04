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
      : null;

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

  if (direct !== null && Number.isFinite(direct)) {
    return Math.max(direct, maxArrayCount);
  }

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

