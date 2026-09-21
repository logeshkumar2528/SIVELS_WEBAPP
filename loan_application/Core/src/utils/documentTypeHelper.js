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
