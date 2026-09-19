import axiosInstance from './axiosInstance';

/**
 * Search complete 360-degree application details by PAN number.
 * 
 * Endpoint: GET /api/ApplicationFullDetails/search?panNumber={panNumber}
 * 
 * @param {string} panNumber - 10-character PAN number
 * @returns {Promise<Object>} Full application details payload
 */
export const searchApplicationFullDetailsByPan = async (panNumber) => {
  if (!panNumber || typeof panNumber !== 'string') {
    throw new Error('Please provide a valid PAN number.');
  }

  const cleanPan = panNumber.trim().toUpperCase();
  const response = await axiosInstance.get('/ApplicationFullDetails/search', {
    params: { panNumber: cleanPan }
  });

  return response.data;
};

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
  searchApplicationFullDetailsByPan,
  downloadAgentCustomerDoc,
  downloadKycDocumentByPath,
};
