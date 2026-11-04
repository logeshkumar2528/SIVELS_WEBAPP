/**
 * approvalDocumentService.js
 * ----------------------------
 * Dedicated API service layer for shared approval documents (Sanction Letter, KFS).
 *
 * Architecture:
 *   - Lives under Core/src/features/approval-documents/services/
 *   - Reuses the shared Core axiosInstance for baseURL, auth token injection, timeout, and error handling.
 *   - Decoupled from Business_Modules (zero dependencies on back_office or credit_manager).
 *   - Safely unwraps backend response envelopes.
 */

import axiosInstance from '../../../api/axiosInstance';

/**
 * Safely unwrap data from various backend response envelope structures.
 *
 * @param {any} res - Axios response or response.data
 * @returns {any} Unwrapped data
 */
export function unwrapResponse(res) {
  if (res == null) return null;
  const data = res?.data !== undefined ? res.data : res;
  if (data == null) return null;

  // Handle standard .NET / Spring / Node response wrappers
  if (data.value !== undefined) return data.value;
  if (data.data !== undefined) return data.data;
  if (data.result !== undefined) return data.result;

  return data;
}

/** Resolve CustomerCode from either normalized verification data or raw API envelopes. */
export function resolveCustomerCode(value) {
  const queue = [{ value, depth: 0 }];
  const visited = new Set();
  const keys = ['customerCode', 'CustomerCode'];

  while (queue.length) {
    const { value: current, depth } = queue.shift();
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);

    for (const key of keys) {
      const candidate = current[key];
      if (candidate !== undefined && candidate !== null) {
        const code = String(candidate).trim();
        if (code && !/^n\/a$/i.test(code)) return code;
      }
    }

    if (depth >= 5) continue;
    Object.values(current).forEach((child) => {
      if (child && typeof child === 'object') queue.push({ value: child, depth: depth + 1 });
    });
  }

  return '';
}

/** Resolve the persisted application-product identifier from normalized/raw data. */
export function resolveApplicationProductDetailsId(value) {
  const queue = [{ value, depth: 0 }];
  const visited = new Set();
  const keys = ['applicationProductDetailsId', 'ApplicationProductDetailsId'];

  while (queue.length) {
    const { value: current, depth } = queue.shift();
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);

    for (const key of keys) {
      const candidate = Number(current[key]);
      if (Number.isFinite(candidate) && candidate > 0) return candidate;
    }

    if (depth >= 5) continue;
    Object.values(current).forEach((child) => {
      if (child && typeof child === 'object') queue.push({ value: child, depth: depth + 1 });
    });
  }

  return null;
}

/**
 * Resolve the authenticated staff/user id used for document audit fields.
 * Application verification data describes the customer/application and must
 * not be used as the source of the current uploader identity.
 */
export function resolveUploadedBy(applicationData) {
  const positiveId = (value) => {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : null;
  };

  const readJson = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  if (typeof localStorage === 'undefined') return null;

  const currentUser = readJson('sivels_currentUser');
  const roleCode = String(currentUser?.roleCode || currentUser?.role || '').toUpperCase();
  const roleSpecificId =
    roleCode.includes('CREDIT')
      ? positiveId(currentUser?.userId ?? currentUser?.staffId ?? currentUser?.creditManagerId)
      : roleCode.includes('BACK')
        ? positiveId(currentUser?.userId ?? currentUser?.staffId ?? currentUser?.backOfficeId)
        : roleCode === 'RM' || roleCode.includes('RELATIONSHIP')
          ? positiveId(currentUser?.userId ?? currentUser?.staffId ?? currentUser?.rmId)
          : positiveId(currentUser?.userId ?? currentUser?.staffId);
  if (roleSpecificId) return roleSpecificId;

  const creditManagerAuth = readJson('creditManagerAuth');
  const creditManagerId = positiveId(
    creditManagerAuth?.userId ?? creditManagerAuth?.staffId ?? creditManagerAuth?.creditManagerId
  );
  if (creditManagerId) return creditManagerId;

  const backOfficeAuth = readJson('backOfficeAuth');
  const backOfficeId = positiveId(
    backOfficeAuth?.userId ?? backOfficeAuth?.staffId ?? backOfficeAuth?.backOfficeId ?? backOfficeAuth?.id
  );
  if (backOfficeId) return backOfficeId;

  const rmData = readJson('rmData');
  const rmId = positiveId(rmData?.userId ?? rmData?.staffId ?? rmData?.rmId ?? localStorage.getItem('rmId'));
  if (rmId) return rmId;

  const directUserId = positiveId(localStorage.getItem('userId'));
  if (directUserId) return directUserId;

  // Last fallback supports older screens that still expose the authenticated
  // identity inside their normalized data, while preferring user/staff IDs.
  return positiveId(
    applicationData?.userId ??
      applicationData?.staffId ??
      applicationData?.creditManagerUserId ??
      applicationData?.creditManagerId ??
      applicationData?.rmId
  );
}

export const approvalDocumentService = {
  /** Find an existing application document for a specific document type. */
  getApplicationDocument: async (applicationProductDetailsId, documentType) => {
    try {
      const response = await axiosInstance.get(
        `/ApplicationDocuments/application/${encodeURIComponent(applicationProductDetailsId)}/application-pdf`,
        { params: { documentType } }
      );
      const data = unwrapResponse(response);
      const documents = Array.isArray(data) ? data : (data ? [data] : []);
      return documents.find((document) => {
        const type = document?.documentType ?? document?.DocumentType;
        return String(type || '').toUpperCase() === String(documentType || '').toUpperCase();
      }) || null;
    } catch (error) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * Persist a generated approval PDF against the application. The backend
   * keeps each document type in its own record (for example SANCTION_LETTER
   * and KFS), so this is safe to call from either document's download action.
   */
  uploadApplicationDocument: async ({
    pdf,
    fileName,
    applicationProductDetailsId,
    agentCustomerId,
    customerCode,
    documentType,
    uploadedBy,
  }) => {
    const missing = [];
    if (!pdf) missing.push('PDF');
    if (!fileName) missing.push('file name');
    if (!applicationProductDetailsId) missing.push('applicationProductDetailsId');
    if (!agentCustomerId) missing.push('agentCustomerId');
    if (!customerCode) missing.push('customerCode');
    if (!documentType) missing.push('documentType');
    if (!uploadedBy) missing.push('uploadedBy');
    if (missing.length) {
      throw new Error(`Application document upload details are incomplete: ${missing.join(', ')}.`);
    }

    const formData = new FormData();
    formData.append('file', pdf.output('blob'), fileName);
    formData.append('applicationProductDetailsId', String(applicationProductDetailsId));
    formData.append('agentCustomerId', String(agentCustomerId));
    formData.append('customerCode', String(customerCode));
    formData.append('documentType', String(documentType));
    if (uploadedBy !== undefined && uploadedBy !== null && String(uploadedBy).trim()) {
      formData.append('uploadedBy', String(uploadedBy));
    }

    const existingDocument = await approvalDocumentService.getApplicationDocument(
      applicationProductDetailsId,
      documentType
    );
    const documentId = existingDocument?.documentId ?? existingDocument?.DocumentId;
    const response = documentId
      ? await axiosInstance.put(`/ApplicationDocuments/${encodeURIComponent(documentId)}/application-pdf`, formData)
      : await axiosInstance.post('/ApplicationDocuments/application-pdf', formData);
    return unwrapResponse(response);
  },

  /**
   * Retrieve PD Assessment record by applicationProductDetailsId.
   * @param {string|number} applicationProductDetailsId
   */
  getPdAssessmentByApplication: async (applicationProductDetailsId) => {
    const response = await axiosInstance.get(
      `/ApplicationPdAssessment/byapplication/${encodeURIComponent(applicationProductDetailsId)}`
    );
    return unwrapResponse(response);
  },

  /**
   * Get the latest Credit Manager decision for an application.
   * Resolves to null when no decision exists (backend returns 404).
   * @param {string|number} agentCustomerId
   */
  getLatestCreditDecision: async (agentCustomerId) => {
    try {
      const response = await axiosInstance.get(
        `/ApplicationCreditDecision/by-customer/${encodeURIComponent(agentCustomerId)}/latest`
      );
      return unwrapResponse(response);
    } catch (err) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  /**
   * Summary of existing obligations for an applicant.
   * @param {string|number} applicationProductDetailsId
   * @param {string|number} applicantSequence
   */
  getLoanObligationsSummary: async (applicationProductDetailsId, applicantSequence = 0) => {
    const response = await axiosInstance.get(
      `/calculation/loan-obligations/summary/${encodeURIComponent(applicationProductDetailsId)}/${encodeURIComponent(applicantSequence)}`
    );
    return unwrapResponse(response);
  },

  /**
   * Retrieve eligibility assessments by applicationProductDetailsId.
   * @param {string|number} applicationProductDetailsId
   */
  getAssessmentsByApplication: async (applicationProductDetailsId) => {
    const response = await axiosInstance.get(
      `/calculation/assessments/by-application/${encodeURIComponent(applicationProductDetailsId)}`
    );
    return unwrapResponse(response);
  },

  /**
   * Generic master / lookup data fetcher.
   * @param {string} path - Master endpoint path
   */
  getMaster: async (path) => {
    const response = await axiosInstance.get(path);
    return unwrapResponse(response);
  },

  /**
   * Generates official loan identifiers upon Credit Manager approval.
   * Handles 409 Conflict by safely extracting existing identifiers or retrieving them via GET.
   *
   * @param {string|number} agentCustomerId
   * @returns {Promise<Object>}
   */
  generateLoanIdentifier: async (agentCustomerId) => {
    if (!agentCustomerId) {
      throw new Error('Agent Customer ID is required to generate loan identifiers');
    }
    try {
      const response = await axiosInstance.post('/loan-identifiers', {
        agentCustomerId: Number(agentCustomerId),
      });
      return unwrapResponse(response);
    } catch (err) {
      if (err?.response?.status === 409) {
        const conflictData = unwrapResponse(err.response);
        if (conflictData?.loanAccountNumber && conflictData?.sanctionLetterId) {
          return conflictData;
        }
        return approvalDocumentService.getLoanIdentifierByCustomer(agentCustomerId);
      }
      throw err;
    }
  },

  /**
   * Retrieves active loan identifiers for an approved customer (requires underwriting role).
   * Resolves to null on 404 Not Found.
   *
   * @param {string|number} agentCustomerId
   * @returns {Promise<Object|null>}
   */
  getLoanIdentifierByCustomer: async (agentCustomerId) => {
    if (!agentCustomerId) return null;
    try {
      const response = await axiosInstance.get(
        `/loan-identifiers/by-customer/${encodeURIComponent(agentCustomerId)}`
      );
      return unwrapResponse(response);
    } catch (err) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  /**
   * Retrieves the authenticated customer's own active loan identifiers (customer role).
   * Resolves to null on 404 Not Found.
   *
   * @returns {Promise<Object|null>}
   */
  getMyLoanIdentifier: async () => {
    try {
      const response = await axiosInstance.get('/loan-identifiers/my');
      return unwrapResponse(response);
    } catch (err) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },
};

export default approvalDocumentService;
