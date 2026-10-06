import axiosInstance from '../../../../Core/src/api/axiosInstance';

/**
 * Normalizes RM customer responses at the service boundary.
 * The backend returns `rmCustomerId`, which represents the common customer ID / AgentCustomerId.
 * This normalization ensures downstream components have access to `commonCustomerId`, `agentCustomerId`,
 * `rmCustomerId`, and `id` uniformly without modifying other backend fields.
 */
export function normalizeCustomerResponse(data) {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(normalizeCustomerResponse);
  }
  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data.data)) {
    return { ...data, data: data.data.map(normalizeCustomerResponse) };
  }
  if (Array.isArray(data.value)) {
    return { ...data, value: data.value.map(normalizeCustomerResponse) };
  }
  if (Array.isArray(data.items)) {
    return { ...data, items: data.items.map(normalizeCustomerResponse) };
  }

  const commonCustomerId =
    data.rmCustomerId ??
    data.rMCustomerId ??
    data.agentCustomerId ??
    data.AgentCustomerId ??
    data.customerId ??
    data.id ??
    null;

  return {
    ...data,
    commonCustomerId,
    agentCustomerId: commonCustomerId ?? data.agentCustomerId,
    rmCustomerId: commonCustomerId ?? data.rmCustomerId,
    id: data.id ?? commonCustomerId,
  };
}

export const rmCustomerService = {
  createCustomer: async (customerData) => {
    const response = await axiosInstance.post('/AgentAddCustomer', customerData);
    return normalizeCustomerResponse(response.data);
  },

  getAllCustomers: async () => {
    const response = await axiosInstance.get('/AgentAddCustomer');
    return normalizeCustomerResponse(response.data);
  },

  getCustomerById: async (id) => {
    const response = await axiosInstance.get(`/AgentAddCustomer/${id}`);
    return normalizeCustomerResponse(response.data);
  },

  uploadDocument: async (formData) => {
    const response = await axiosInstance.post('/RMCustomerDocument/upload', formData);
    return response.data;
  },

  uploadAgentCustomerDocument: async (formData) => {
    const response = await axiosInstance.post('/AgentCustomerDocument/upload', formData);
    return response.data;
  },

  getDocumentsByCustomerId: async (rmCustomerId) => {
    try {
      const response = await axiosInstance.get(`/RMCustomerDocument/bycustomer/${rmCustomerId}`, {
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
      });
      if (response.status === 404) {
        return [];
      }
      return response.data;
    } catch (err) {
      if (err?.response?.status === 404 || err?.status === 404) {
        return [];
      }
      throw err;
    }
  },

  getAgentCustomerDocumentsByCustomerId: async (customerId) => {
    try {
      const response = await axiosInstance.get(`/AgentCustomerDocument/bycustomer/${customerId}`, {
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
      });
      if (response.status === 404) {
        return [];
      }
      return response.data;
    } catch (err) {
      if (err?.response?.status === 404 || err?.status === 404) {
        return [];
      }
      throw err;
    }
  },

  downloadDocument: async (id) => {
    try {
      const response = await axiosInstance.get(`/RMCustomerDocument/download/${id}`, {
        responseType: 'blob',
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
      });
      if (response.status === 404) {
        return null;
      }
      return response.data;
    } catch (err) {
      if (err?.response?.status === 404 || err?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  downloadAgentCustomerDocument: async (documentId) => {
    try {
      const response = await axiosInstance.get(`/AgentCustomerDocument/download/${documentId}`, {
        responseType: 'blob',
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
      });
      if (response.status === 404) {
        return null;
      }
      return response.data;
    } catch (err) {
      if (err?.response?.status === 404 || err?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  promoteRmCustomer: async (rmCustomerId, payload) => {
    const response = await axiosInstance.post(`/RMAddCustomer/${encodeURIComponent(rmCustomerId)}/promote`, payload);
    return normalizeCustomerResponse(response.data);
  },

  /* ==========================================
     APPLICANT-LEVEL DOCUMENTS (SALARY SLIP, BANK STATEMENT)
  ========================================== */

  /**
   * Retrieve applicant-level document metadata.
   * Treats 404 as an expected empty state (document not uploaded yet) without logging errors.
   * @param {string|number} applicationProductDetailsId
   * @param {number} applicantSequence
   * @param {number} documentTypeId
   */
  getApplicantDocument: async (applicationProductDetailsId, applicantSequence, documentTypeId) => {
    try {
      const response = await axiosInstance.get(
        `/ApplicationKYCDocuments/applicant-document?applicationProductDetailsId=${encodeURIComponent(applicationProductDetailsId)}&applicantSequence=${encodeURIComponent(applicantSequence)}&documentTypeId=${encodeURIComponent(documentTypeId)}`,
        {
          validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
        }
      );
      if (response.status === 404) {
        return null;
      }
      return response.data;
    } catch (err) {
      if (err?.response?.status === 404 || err?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Upload a new applicant-level document (POST multipart/form-data).
   * @param {FormData} formData - { file, applicationProductDetailsId, applicantSequence, documentTypeId, uploadedBy }
   */
  uploadApplicantDocument: async (formData) => {
    const response = await axiosInstance.post(
      '/ApplicationKYCDocuments/applicant-document/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  /**
   * Replace an existing applicant-level document (PUT multipart/form-data).
   * @param {FormData} formData - { file, applicationProductDetailsId, applicantSequence, documentTypeId, uploadedBy }
   */
  replaceApplicantDocument: async (formData) => {
    const response = await axiosInstance.put(
      '/ApplicationKYCDocuments/applicant-document/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  /**
   * Download a KYC/applicant document as blob by server path.
   * @param {string} path - Relative server path
   */
  downloadKycDocumentByPath: async (path) => {
    try {
      const response = await axiosInstance.get(
        `/ApplicationKYCDocuments/download?path=${encodeURIComponent(path)}`,
        {
          responseType: 'blob',
          validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
        }
      );
      if (response.status === 404) {
        return null;
      }
      return response.data;
    } catch (err) {
      if (err?.response?.status === 404 || err?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Retrieve step verifications for an application to determine whether Back Office verification has started.
   * @param {string|number} applicationProductDetailsId
   */
  getStepVerificationsByApplication: async (applicationProductDetailsId) => {
    try {
      const response = await axiosInstance.get(
        `/BackOfficeStepVerification/application/${encodeURIComponent(applicationProductDetailsId)}`,
        {
          validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
        }
      );
      if (response.status === 404) {
        return [];
      }
      const data = response.data;
      if (Array.isArray(data)) return data;
      return data?.value || data?.data || data?.items || [];
    } catch (err) {
      if (err?.response?.status === 404 || err?.status === 404) {
        return [];
      }
      throw err;
    }
  },

  /* ==========================================
     CUSTOMER PROOFS (ADDRESS / INCOME / DRIVING ...)
  ========================================== */

  getProofCategories: async () => {
    const response = await axiosInstance.get('/DocumentTypeMaster');
    return toList(response.data);
  },

  getProofsByCategory: async (documentTypeId) => {
    const response = await axiosInstance.get('/proofmaster', {
      params: { documentTypeId },
    });
    return toList(response.data);
  },

  /**
   * List uploaded customer proofs for an applicant context:
   * { agentCustomerId, applicationProductDetailsId, applicantSequence, verificationTypeCode }.
   * Callers must still filter the result because the backend may ignore unsupported params.
   * Treats 404 as an empty list.
   */
  getApplicationCustomerProofs: async (filters = {}) => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== '')
    );
    try {
      const response = await axiosInstance.get('/customerdocumentproof', {
        params,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
      });
      if (response.status === 404) return [];
      return toList(response.data);
    } catch (err) {
      if (err?.response?.status === 404 || err?.status === 404) return [];
      throw err;
    }
  },

  uploadApplicationCustomerProof: async (formData, { onUploadProgress } = {}) => {
    const response = await axiosInstance.post('/customerdocumentproof', formData, { onUploadProgress });
    return response.data;
  },

  replaceApplicationCustomerProof: async (id, formData, { onUploadProgress } = {}) => {
    const response = await axiosInstance.put(`/customerdocumentproof/${encodeURIComponent(id)}`, formData, { onUploadProgress });
    return response.data;
  },

  downloadApplicationCustomerProof: async (id) => {
    const response = await axiosInstance.get(`/customerdocumentproof/${encodeURIComponent(id)}/download`, {
      responseType: 'blob',
    });
    return { blob: response.data, contentType: response.headers?.['content-type'] || '' };
  },

  deleteApplicationCustomerProof: async (id) => {
    const response = await axiosInstance.delete(`/customerdocumentproof/${encodeURIComponent(id)}`);
    return response.data;
  },
};

function toList(data) {
  if (Array.isArray(data)) return data;
  return data?.data || data?.value || data?.items || [];
}

export default rmCustomerService;

