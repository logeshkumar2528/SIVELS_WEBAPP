/**
 * documentTypeHelper.js
 * ---------------------
 * Central utility for dynamic DocumentTypeMaster resolution and validation.
 * 
 * Rules:
 * - Never hardcode DocumentTypeId.
 * - Dynamic resolution matching documentTypeName / documentTypeCode.
 * - Enforces allowed file formats (PDF, JPG, JPEG, PNG) and 150 MB max size.
 */

export const ALLOWED_DOC_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
export const MAX_DOC_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB

/**
 * Dynamically resolves DocumentTypeId from DocumentTypeMaster records.
 * @param {Array} masterList - List of items from DocumentTypeMaster (raw or dropdown options)
 * @param {string} targetName - Target document category ('Salary Slip' or 'Bank Statement')
 * @returns {number|null}
 */
export function resolveDocumentTypeId(masterList = [], targetName = '') {
  if (!Array.isArray(masterList) || !targetName) return null;
  const normalizedTarget = String(targetName).trim().toLowerCase();
  const normalizedUpper = String(targetName).trim().toUpperCase();

  const matched = masterList.find((doc) => {
    if (!doc) return false;
    if (doc.isActive === false || doc.raw?.isActive === false) return false;

    const name = String(doc.label || doc.documentTypeName || doc.name || doc.raw?.documentTypeName || '').trim().toLowerCase();
    const code = String(doc.code || doc.documentTypeCode || doc.raw?.documentTypeCode || '').trim().toUpperCase();

    // Direct match
    if (name === normalizedTarget || code === normalizedUpper) return true;

    // 1. Profile Image / Photo
    if (
      normalizedTarget === 'profile image' ||
      normalizedTarget === 'profile' ||
      normalizedTarget === 'photo' ||
      normalizedTarget === 'profile_image' ||
      normalizedTarget === 'applicant_profile' ||
      normalizedTarget === 'co_applicant_profile'
    ) {
      return (
        code === 'PHOTO' ||
        code === 'PROFILE' ||
        code === 'PROFILE_IMAGE' ||
        name === 'photo' ||
        name === 'profile image' ||
        name.includes('photo') ||
        name.includes('profile')
      );
    }

    // 2. Aadhaar Card
    if (
      normalizedTarget === 'aadhaar' ||
      normalizedTarget === 'aadhaar card' ||
      normalizedTarget === 'aadhar' ||
      normalizedTarget === 'aadhar card' ||
      normalizedTarget === 'applicant_aadhaar' ||
      normalizedTarget === 'co_applicant_aadhaar'
    ) {
      return (
        code === 'AADHAAR' ||
        code === 'AADHAR' ||
        name === 'aadhaar card' ||
        name === 'aadhar card' ||
        name.includes('aadhaar') ||
        name.includes('aadhar')
      );
    }

    // 3. PAN Card
    if (
      normalizedTarget === 'pan' ||
      normalizedTarget === 'pan card' ||
      normalizedTarget === 'pancard' ||
      normalizedTarget === 'applicant_pan' ||
      normalizedTarget === 'co_applicant_pan'
    ) {
      return (
        code === 'PAN' ||
        code === 'PANCARD' ||
        name === 'pan card' ||
        name === 'pan' ||
        name.includes('pan card') ||
        name === 'pan'
      );
    }

    // 4. Salary Slip
    if (
      normalizedTarget === 'salary slip' ||
      normalizedTarget === 'salary slips' ||
      normalizedTarget === 'salary slip / income sheet' ||
      normalizedTarget === 'salary_slip' ||
      normalizedTarget === 'income sheet' ||
      normalizedTarget === 'applicant_salary_slip' ||
      normalizedTarget === 'co_applicant_salary_slip'
    ) {
      return (
        code === 'SALARY_SLIP' ||
        code === 'SALARY' ||
        name === 'salary slip' ||
        name === 'salary slips' ||
        name === 'salary slip / income sheet' ||
        name === 'salary_slip' ||
        name.includes('salary slip') ||
        name.includes('salary')
      );
    }

    // 5. Bank Statement
    if (
      normalizedTarget === 'bank statement' ||
      normalizedTarget === 'bank statements' ||
      normalizedTarget === 'bank_statement' ||
      normalizedTarget === 'applicant_bank_statement' ||
      normalizedTarget === 'co_applicant_bank_statement'
    ) {
      return (
        code === 'BANK_STATEMENT' ||
        code === 'BANK_STATEMENTS' ||
        code === 'BANK' ||
        name === 'bank statement' ||
        name === 'bank statements' ||
        name === 'bank_statement' ||
        name.includes('bank statement')
      );
    }

    // 6. Address Proof
    if (normalizedTarget === 'address proof' || normalizedTarget === 'address_proof') {
      return code === 'ADDRESS_PROOF' || name.includes('address proof');
    }

    // 7. Business Proof
    if (normalizedTarget === 'business proof' || normalizedTarget === 'business_proof') {
      return code === 'BUSINESS_PROOF' || name.includes('business proof');
    }

    // 8. ZIP / Archive / Education / Other
    if (
      normalizedTarget === 'zip' ||
      normalizedTarget === 'zip_archive' ||
      normalizedTarget === 'zip / archive package' ||
      normalizedTarget === 'archive' ||
      normalizedTarget === 'education certificate' ||
      normalizedTarget === 'education_certificate'
    ) {
      return (
        code === 'EDUCATION_CERTIFICATE' ||
        code === 'OTHER' ||
        code === 'ZIP_ARCHIVE' ||
        name.includes('education') ||
        name.includes('other')
      );
    }

    return false;
  });

  if (!matched) return null;
  const idVal = matched.value ?? matched.documentTypeId ?? matched.DocumentTypeId ?? matched.id ?? matched.Id ?? matched.raw?.documentTypeId;
  const num = Number(idVal);
  return isNaN(num) || num <= 0 ? null : num;
}

/**
 * Validates file format and size for applicant-level document uploads.
 * @param {File} file
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateApplicantDocumentFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const ext = String(file.name || '').split('.').pop()?.toLowerCase();
  if (!ALLOWED_DOC_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file type (${ext ? `.${ext}` : 'unknown'}). Allowed formats: PDF, JPG, JPEG, PNG.`,
    };
  }

  if (file.size > MAX_DOC_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 150 MB.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Selects the latest active customer photo document from a document list.
 * 
 * Priority:
 * 1. Latest Updated Photo (newest timestamp / highest ID)
 * 2. Original Photo (fallback if only one photo exists)
 * 3. null (triggering initial-letter avatar fallback in UI)
 * 
 * @param {Array} docList - List of customer documents
 * @param {number|string|null} photoDocTypeId - Dynamically resolved DocumentTypeId for Photo
 * @returns {Object|null} The latest active photo document or null
 */
export function selectLatestCustomerPhotoDoc(docList = [], photoDocTypeId = null) {
  if (!Array.isArray(docList) || docList.length === 0) return null;

  const resolvedTypeIdNum =
    photoDocTypeId !== null && photoDocTypeId !== undefined && !isNaN(Number(photoDocTypeId))
      ? Number(photoDocTypeId)
      : null;

  const photoCandidates = docList.filter((doc) => {
    if (!doc || doc.isActive === false || doc.IsActive === false) return false;

    const dtId = Number(doc.documentTypeId ?? doc.DocumentTypeId);
    if (resolvedTypeIdNum !== null && Number.isFinite(dtId) && dtId === resolvedTypeIdNum) {
      return true;
    }

    const name = String(
      doc.documentTypeName ||
      doc.documentName ||
      doc.name ||
      doc.rejectedDocumentType ||
      ''
    ).trim().toLowerCase();

    const code = String(doc.documentTypeCode || doc.code || '').trim().toUpperCase();

    return (
      code === 'PHOTO' ||
      code === 'PROFILE' ||
      code === 'PROFILE_IMAGE' ||
      name === 'photo' ||
      name === 'profile photo' ||
      name === 'profile image' ||
      name === 'applicant photo' ||
      name === 'profile_image' ||
      name === 'applicant_profile' ||
      name === 'applicant_photo'
    );
  });

  if (photoCandidates.length === 0) return null;

  // Sort candidates NEWEST FIRST (Descending)
  photoCandidates.sort((a, b) => {
    const timeA = new Date(
      a.resubmittedAt ?? a.ResubmittedAt ?? a.createdAt ?? a.CreatedAt ?? 0
    ).getTime();
    const timeB = new Date(
      b.resubmittedAt ?? b.ResubmittedAt ?? b.createdAt ?? b.CreatedAt ?? 0
    ).getTime();

    if (timeA !== timeB) {
      return timeB - timeA; // Newest timestamp first
    }

    const idA = Number(a.agentCustomerDocumentId ?? a.AgentCustomerDocumentId ?? a.id ?? 0) || 0;
    const idB = Number(b.agentCustomerDocumentId ?? b.AgentCustomerDocumentId ?? b.id ?? 0) || 0;

    return idB - idA; // Highest/newest ID first
  });

  return photoCandidates[0];
}

/**
 * Selects the latest updated/resubmitted customer photo rejection record.
 * 
 * @param {Array} rejectionList - Full list of BackOfficeDocumentRejection records
 * @param {string|number} customerId - Target agentCustomerId
 * @param {string|number|null} applicationProductDetailsId - Optional applicationProductDetailsId
 * @returns {Object|null} The latest updated photo rejection record or null
 */
export function selectLatestUpdatedCustomerPhotoRejection(
  rejectionList = [],
  customerId = null,
  applicationProductDetailsId = null
) {
  if (!Array.isArray(rejectionList) || rejectionList.length === 0) return null;
  if (!customerId && !applicationProductDetailsId) return null;

  const targetCustIdStr = customerId !== null && customerId !== undefined ? String(customerId).trim() : '';
  const targetAppIdStr =
    applicationProductDetailsId !== null && applicationProductDetailsId !== undefined
      ? String(applicationProductDetailsId).trim()
      : '';

  const photoRejections = rejectionList.filter((rej) => {
    if (!rej || rej.isActive === false || rej.IsActive === false) return false;

    // 1. Customer / Application Ownership Matching
    const rejCustId = String(rej.agentCustomerId ?? rej.AgentCustomerId ?? '').trim();
    const rejAppId = String(rej.applicationProductDetailsId ?? rej.ApplicationProductDetailsId ?? '').trim();

    const matchCust = Boolean(targetCustIdStr && rejCustId && rejCustId === targetCustIdStr);
    const matchApp = Boolean(targetAppIdStr && rejAppId && rejAppId === targetAppIdStr);

    if (!(matchCust || matchApp)) return false;

    // 2. Restrict to Main Applicant (Sequence 0)
    const rawSeq = rej.applicantSequence ?? rej.ApplicantSequence;
    const rSeq = rawSeq !== undefined && rawSeq !== null ? Number(rawSeq) : null;
    if (rSeq !== null && rSeq !== 0) return false;

    // 3. Exclude Co-Applicant document types
    const rType = String(rej.rejectedDocumentType ?? rej.RejectedDocumentType ?? '').trim().toUpperCase();
    if (rType.startsWith('CO_APPLICANT') || rType.startsWith('COAPPLICANT')) return false;

    // 4. Photo/Profile Type Matching
    const isPhotoType =
      rType === 'PHOTO' ||
      rType === 'PROFILE' ||
      rType === 'PROFILE_IMAGE' ||
      rType === 'PROFILE PHOTO' ||
      rType === 'PROFILE IMAGE' ||
      rType === 'APPLICANT PHOTO' ||
      rType === 'APPLICANT_PHOTO' ||
      rType === 'APPLICANT_PROFILE' ||
      rType === 'APPLICANT_PROFILE_IMAGE' ||
      rType.includes('PHOTO') ||
      rType.includes('PROFILE');

    if (!isPhotoType) return false;

    // 5. Valid Updated Path Verification
    const cleanCurr = String(rej.currentDocumentPath ?? rej.CurrentDocumentPath ?? '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    const cleanOrig = String(rej.originalDocumentPath ?? rej.OriginalDocumentPath ?? '').trim().replace(/\\/g, '/').replace(/^\/+/, '');

    if (!cleanCurr) return false;
    if (cleanOrig && cleanCurr.toLowerCase() === cleanOrig.toLowerCase()) return false;

    return true;
  });

  if (photoRejections.length === 0) return null;

  // 6. Sort Candidates NEWEST FIRST (Descending)
  photoRejections.sort((a, b) => {
    const timeA = new Date(
      a.resubmittedAt ?? a.ResubmittedAt ?? a.verifiedAt ?? a.VerifiedAt ?? a.rejectedAt ?? a.RejectedAt ?? a.createdAt ?? a.CreatedAt ?? 0
    ).getTime();
    const timeB = new Date(
      b.resubmittedAt ?? b.ResubmittedAt ?? b.verifiedAt ?? b.VerifiedAt ?? b.rejectedAt ?? b.RejectedAt ?? b.createdAt ?? b.CreatedAt ?? 0
    ).getTime();

    if (timeA !== timeB) {
      return timeB - timeA; // Newest timestamp first
    }

    const idA = Number(a.backOfficeDocumentRejectionId ?? a.BackOfficeDocumentRejectionId ?? a.id ?? 0) || 0;
    const idB = Number(b.backOfficeDocumentRejectionId ?? b.BackOfficeDocumentRejectionId ?? b.id ?? 0) || 0;

    return idB - idA; // Highest primary key ID first
  });

  return photoRejections[0];
}

