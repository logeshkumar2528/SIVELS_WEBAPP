/**
 * backOfficeService.js
 * --------------------
 * Purpose:
 *   Centralized service layer for Back Office API communications.
 *
 * Architecture:
 *   - Reuses the shared Core axiosInstance for baseURL, timeout, token injection, and error handling.
 *   - Provides typed, clean asynchronous service calls.
 *   - Safely unwraps backend response envelopes ([...], { data: [...] }, { value: [...] }, { result: [...] }).
 */

import axiosInstance from '../../../../../Core/src/api/axiosInstance';
import { BACK_OFFICE_ENDPOINTS } from './endpoints';

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

export const backOfficeService = {
  /* ==========================================
     1. MASTER / DISTRICT APIs
  ========================================== */

  /**
   * Retrieve all districts across the state.
   */
  getDistricts: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.DISTRICTS);
    return unwrapResponse(response);
  },

  /**
   * Retrieve a single district by ID.
   * @param {string|number} id - District ID
   */
  getDistrictById: async (id) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.DISTRICT_BY_ID(id));
    return unwrapResponse(response);
  },

  /* ==========================================
     2. RELATIONSHIP MANAGER (RM) APIs
  ========================================== */

  /**
   * Retrieve all Relationship Managers globally (no user restriction).
   */
  getAllRMs: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.RMS);
    return unwrapResponse(response);
  },

  /**
   * Retrieve a single RM by ID.
   * @param {string|number} id - RM ID
   */
  getRMById: async (id) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.RM_BY_ID(id));
    return unwrapResponse(response);
  },

  /* ==========================================
     3. FIELD AGENT APIs
  ========================================== */

  /**
   * Retrieve all Field Agents globally.
   */
  getAllAgents: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.AGENTS);
    return unwrapResponse(response);
  },

  /**
   * Retrieve a single Field Agent by ID.
   * @param {string|number} id - Agent ID
   */
  getAgentById: async (id) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.AGENT_BY_ID(id));
    return unwrapResponse(response);
  },

  /* ==========================================
     4. CUSTOMER / APPLICATION QUEUE APIs
  ========================================== */

  /**
   * Retrieve all customer loan applications.
   */
  getAllCustomers: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.CUSTOMERS);
    return unwrapResponse(response);
  },

  /**
   * Retrieve a single customer application record by ID.
   * @param {string|number} id - agentCustomerId / Customer ID
   */
  getCustomerById: async (id) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.CUSTOMER_BY_ID(id));
    return unwrapResponse(response);
  },

  /* ==========================================
     5. FULL 12-STEP UNDERWRITING APPLICATION
  ========================================== */

  /**
   * Retrieve full aggregated 12-step RM application details.
   * @param {string|number} agentCustomerId - Root customer / application ID
   */
  getApplicationFullDetails: async (agentCustomerId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.APPLICATION_FULL_DETAILS(agentCustomerId)
    );
    return unwrapResponse(response);
  },

  /* ==========================================
     6. CUSTOMER DOCUMENT APIs
  ========================================== */

  /**
   * Retrieve all uploaded documents metadata for a customer.
   * @param {string|number} agentCustomerId - Root customer ID
   */
  getCustomerDocuments: async (agentCustomerId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.CUSTOMER_DOCUMENTS(agentCustomerId)
    );
    return unwrapResponse(response);
  },

  /**
   * Download a specific document file by document ID (Blob stream).
   * @param {string|number} documentId - Document ID
   */
  downloadCustomerDocument: async (documentId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.DOCUMENT_DOWNLOAD(documentId),
      { responseType: 'blob' }
    );
    return response.data;
  },

  /* ==========================================
     7. BACK OFFICE OPERATOR PROFILE APIs
  ========================================== */

  /**
   * Retrieve Back Office operator profile by ID.
   * @param {string|number} id - Operator ID
   */
  getBackOfficeProfile: async (id) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.BACK_OFFICE_BY_ID(id));
    return unwrapResponse(response);
  },
};

export default backOfficeService;
