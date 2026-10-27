import axiosInstance from './axiosInstance';

/**
 * Load complete customer and application history by customer code.
 * Endpoint: GET /ApplicationFullDetails/{customerCode}
 */
export const getApplicationFullDetailsByCustomerCode = async (customerCode) => {
  if (!customerCode || typeof customerCode !== 'string') {
    throw new Error('Please provide a valid customer code.');
  }

  const cleanCustomerCode = customerCode.trim().toUpperCase();
  const response = await axiosInstance.get(`/ApplicationFullDetails/${encodeURIComponent(cleanCustomerCode)}`);

  return response.data;
};

/**
 * Load Asset Base records saved from Back Office step 7/Asset Base.
 */
export const getApplicationAssetsByApplication = async (applicationProductDetailsId) => {
  const response = await axiosInstance.get(
    `/ApplicationAssetDetails/by-application/${encodeURIComponent(applicationProductDetailsId)}`
  );
  return response.data;
};

/**
 * Load saved eligibility calculation results for an application product.
 */
export const getEligibilityAssessmentsByApplication = async (applicationProductDetailsId) => {
  const response = await axiosInstance.get(
    `/calculation/assessments/by-application/${encodeURIComponent(applicationProductDetailsId)}`
  );
  return response.data;
};

// Backward-compatible alias for existing imports.
export const searchApplicationFullDetailsByPan = getApplicationFullDetailsByCustomerCode;

/**
 * Download or fetch Agent Customer document as blob
 * @param {string|number} documentId
 * @returns {Promise<Blob>}
 */
export const downloadAgentCustomerDoc = async (documentId) => {
  const response = await axiosInstance.get(`/AgentCustomerDocument/download/${documentId}`, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Download KYC Document by server path
 * @param {string} path - Server relative path
 * @returns {Promise<Blob>}
 */
export const downloadKycDocumentByPath = async (path) => {
  const response = await axiosInstance.get('/ApplicationKYCDocuments/download', {
    params: { path },
    responseType: 'blob'
  });
  return response.data;
};

export default {
  getApplicationFullDetailsByCustomerCode,
  getApplicationAssetsByApplication,
  getEligibilityAssessmentsByApplication,
  searchApplicationFullDetailsByPan,
  downloadAgentCustomerDoc,
  downloadKycDocumentByPath,
};
