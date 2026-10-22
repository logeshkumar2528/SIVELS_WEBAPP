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

export const approvalDocumentService = {
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
};

export default approvalDocumentService;
