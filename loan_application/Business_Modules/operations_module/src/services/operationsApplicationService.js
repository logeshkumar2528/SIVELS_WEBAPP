import axiosInstance from '../../../../Core/src/api/axiosInstance';

const OPERATIONS_APPLICATION_ENDPOINTS = {
  MY_APPLICATIONS: '/AgentAddCustomer/my',
  APPLICATION_BY_ID: (agentCustomerId) => `/AgentAddCustomer/${encodeURIComponent(agentCustomerId)}`,
  VERIFY_NOW: (agentCustomerId) => `/AgentAddCustomer/${encodeURIComponent(agentCustomerId)}/verify-now`,
  APPLICATION_DOCUMENTS: (applicationProductDetailsId) =>
    `/ApplicationDocuments/application/${encodeURIComponent(applicationProductDetailsId)}/application-pdf`,
  APPLICATION_DOCUMENT_DOWNLOAD: (documentId) =>
    `/ApplicationDocuments/${encodeURIComponent(documentId)}/download`,
};

export const OPERATIONS_DOCUMENT_TYPES = Object.freeze({
  APPLICATION_FORM: 'APPLICATION_PDF',
  RECOMMENDATION_SHEET: 'RECOMMENDATION_SHEET',
  SANCTION_LETTER: 'SANCTION_LETTER',
});

function unwrapList(response) {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload?.value,
    payload?.data,
    payload?.result,
    payload?.items,
    payload?.value?.items,
    payload?.value?.data,
    payload?.data?.items,
    payload?.data?.value,
    payload?.data?.result,
  ];
  return candidates.find((value) => Array.isArray(value)) || [];
}

function readTotal(payload) {
  const candidates = [
    payload?.totalCount,
    payload?.total,
    payload?.count,
    payload?.data?.totalCount,
    payload?.data?.total,
    payload?.data?.count,
    payload?.value?.totalCount,
    payload?.value?.total,
    payload?.value?.count,
  ];
  const total = candidates.find((value) => value !== undefined && value !== null && value !== '');
  if (total === undefined) return null;
  const numericTotal = Number(total);
  return Number.isFinite(numericTotal) && numericTotal >= 0 ? numericTotal : null;
}

function unwrapListResponse(response) {
  const payload = response?.data ?? response;
  return {
    items: unwrapList(response),
    total: readTotal(payload),
  };
}

function unwrapValue(response) {
  const payload = response?.data ?? response;
  return payload?.value ?? payload?.data ?? payload?.result ?? payload;
}

export const operationsApplicationService = {
  async getQueueApplications(operationsStatus) {
    const response = await axiosInstance.get(OPERATIONS_APPLICATION_ENDPOINTS.MY_APPLICATIONS, {
      params: { operationsStatus },
    });
    return unwrapListResponse(response);
  },

  async getNewApplications() {
    const response = await this.getQueueApplications('NEW');
    return response.items;
  },

  async getPendingApplications() {
    const response = await this.getQueueApplications('PENDING');
    return response.items;
  },

  async getApplicationById(agentCustomerId) {
    const response = await axiosInstance.get(
      OPERATIONS_APPLICATION_ENDPOINTS.APPLICATION_BY_ID(agentCustomerId)
    );
    return unwrapValue(response);
  },

  async verifyNow(agentCustomerId, remarks = 'Started Operations verification') {
    const response = await axiosInstance.post(
      OPERATIONS_APPLICATION_ENDPOINTS.VERIFY_NOW(agentCustomerId),
      { remarks }
    );
    return unwrapValue(response);
  },

  async getExistingApplicationDocument(applicationProductDetailsId, documentType) {
    try {
      const response = await axiosInstance.get(
        OPERATIONS_APPLICATION_ENDPOINTS.APPLICATION_DOCUMENTS(applicationProductDetailsId),
        { params: { documentType } }
      );
      const payload = response?.data ?? response;
      const unwrapped = payload?.value ?? payload?.data ?? payload?.result ?? payload;
      const records = Array.isArray(unwrapped) ? unwrapped : (unwrapped ? [unwrapped] : []);

      return records.find((document) => (
        String(document?.documentType ?? document?.DocumentType ?? '').toUpperCase() ===
        String(documentType).toUpperCase()
      )) || null;
    } catch (error) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  async downloadExistingApplicationDocument(documentId) {
    return axiosInstance.get(
      OPERATIONS_APPLICATION_ENDPOINTS.APPLICATION_DOCUMENT_DOWNLOAD(documentId),
      { responseType: 'blob' }
    );
  },
};

export default operationsApplicationService;
