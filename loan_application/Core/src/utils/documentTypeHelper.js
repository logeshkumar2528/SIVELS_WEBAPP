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

  const matched = masterList.find((doc) => {
    if (!doc) return false;
    if (doc.isActive === false || doc.raw?.isActive === false) return false;

    const name = String(doc.label || doc.documentTypeName || doc.name || doc.raw?.documentTypeName || '').trim().toLowerCase();
    const code = String(doc.code || doc.documentTypeCode || doc.raw?.documentTypeCode || '').trim().toUpperCase();

    if (
      normalizedTarget === 'salary slip' ||
      normalizedTarget === 'salary slips' ||
      normalizedTarget === 'salary slip / income sheet' ||
      normalizedTarget === 'salary_slip' ||
      normalizedTarget === 'income sheet'
    ) {
      return (
        name === 'salary slip' ||
        name === 'salary slips' ||
        name === 'salary slip / income sheet' ||
        name === 'salary_slip' ||
        name === 'salary slip/income sheet' ||
        code === 'SALARY_SLIP' ||
        code === 'SALARY' ||
        name.includes('salary slip') ||
        name.includes('salary')
      );
    }

    if (
      normalizedTarget === 'bank statement' ||
      normalizedTarget === 'bank statements' ||
      normalizedTarget === 'bank_statement'
    ) {
      return (
        name === 'bank statement' ||
        name === 'bank statements' ||
        name === 'bank_statement' ||
        code === 'BANK_STATEMENT' ||
        code === 'BANK_STATEMENTS' ||
        name.includes('bank statement')
      );
    }

    return name === normalizedTarget || code === normalizedTarget.toUpperCase();
  });

  if (!matched) return null;
  const idVal = matched.value ?? matched.documentTypeId ?? matched.DocumentTypeId ?? matched.id ?? matched.Id ?? matched.raw?.documentTypeId;
  const num = Number(idVal);
  return isNaN(num) ? null : num;
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
