import axiosInstance from '../../../../Core/src/api/axiosInstance';

const BASE_ENDPOINT = '/OperationsFeeDetails';

function unwrapResponse(response) {
  const payload = response?.data ?? response;
  return payload?.value ?? payload?.data ?? payload?.result ?? payload;
}

export function getFeesApiErrorMessage(error, fallback = 'Unable to complete the Fees request.') {
  const data = error?.response?.data;
  const backendMessage =
    (typeof data === 'string' && data.trim()) ||
    data?.message ||
    data?.Message ||
    data?.title ||
    data?.Title ||
    data?.error ||
    data?.Error;

  if (backendMessage) return String(backendMessage).trim();
  if (error?.request && !error?.response) return 'Network error. Please check your connection.';
  return error?.message || fallback;
}

export const operationsFeesService = {
  async preview(payload) {
    const response = await axiosInstance.post(`${BASE_ENDPOINT}/preview`, payload);
    return unwrapResponse(response);
  },

  async save(payload) {
    const response = await axiosInstance.post(`${BASE_ENDPOINT}/save`, payload);
    return unwrapResponse(response);
  },

  async getByCustomer(agentCustomerId, applicationProductDetailsId) {
    try {
      const response = await axiosInstance.get(
        `${BASE_ENDPOINT}/by-customer/${encodeURIComponent(agentCustomerId)}`,
        { params: { applicationProductDetailsId } },
      );
      return unwrapResponse(response);
    } catch (error) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  async getByHeaderId(headerId) {
    const response = await axiosInstance.get(`${BASE_ENDPOINT}/${encodeURIComponent(headerId)}`);
    return unwrapResponse(response);
  },
};

export default operationsFeesService;
