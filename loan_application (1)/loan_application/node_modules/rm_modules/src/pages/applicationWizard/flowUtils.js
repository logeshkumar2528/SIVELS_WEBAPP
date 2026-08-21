export function getSectionState(appData, key, fallback = {}) {
  return appData?.sections?.[key] || appData?.[key] || fallback;
}

export function buildSectionUpdate(appData, key, value) {
  return {
    sections: {
      ...(appData?.sections || {}),
      [key]: value,
    },
  };
}

export function getApplicantCount(appData) {
  const direct = Number(appData?.coApplicantsCount ?? 0);
  const nested = Number(appData?.sections?.personalInformation?.coApplicants?.length ?? 0);
  return Number.isFinite(direct) ? direct : nested;
}

export function createArray(length, mapper) {
  return Array.from({ length }, (_, index) => mapper(index));
}

export function createPersonTemplate(overrides = {}) {
  return {
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
    addressLine1: overrides.addressLine1 || '',
    addressLine2: overrides.addressLine2 || '',
    landmark: overrides.landmark || '',
    city: overrides.city || '',
    state: overrides.state || '',
    pincode: overrides.pincode || '',
    mailingSameAsCurrent: overrides.mailingSameAsCurrent || 'No',
  };
}
