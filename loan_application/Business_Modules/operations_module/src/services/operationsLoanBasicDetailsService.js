import axiosInstance from '../../../../Core/src/api/axiosInstance';

const unwrap = (payload) => {
  if (payload == null) return null;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return payload.data;
  if (payload?.value && typeof payload.value === 'object' && !Array.isArray(payload.value)) return payload.value;
  if (payload?.result && typeof payload.result === 'object' && !Array.isArray(payload.result)) return payload.result;
  return payload;
};

const firstRecord = (payload) => {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value[0] || null;
  return value && typeof value === 'object' ? value : null;
};

export function getApiErrorMessage(error, fallback = 'Request failed') {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const backendMessage =
    (typeof data === 'string' && data.trim()) ||
    data?.message ||
    data?.Message ||
    data?.title ||
    data?.error ||
    (Array.isArray(data?.errors) ? data.errors.join(' ') : null) ||
    (data?.errors && typeof data.errors === 'object'
      ? Object.values(data.errors).flat().filter(Boolean).join(' ')
      : null);

  if (status === 401) return backendMessage || 'Session expired. Please sign in again.';
  if (status === 403) return backendMessage || 'You do not have access to perform this action.';
  if (status === 404) return backendMessage || 'Record not found.';
  if (status === 400) return backendMessage || 'Validation failed. Please check your input.';
  if (status === 500) return backendMessage || 'Server error. Please try again later.';
  return backendMessage || error?.message || fallback;
}

export const operationsLoanBasicDetailsService = {
  async getByCustomer(agentCustomerId, applicationProductDetailsId) {
    try {
      const productQuery =
        applicationProductDetailsId === undefined || applicationProductDetailsId === null
          ? ''
          : `?applicationProductDetailsId=${encodeURIComponent(applicationProductDetailsId)}`;
      const response = await axiosInstance.get(
        `/OperationsLoanBasicDetails/by-customer/${encodeURIComponent(agentCustomerId)}${productQuery}`
      );
      return firstRecord(response.data);
    } catch (error) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  async create(payload) {
    const response = await axiosInstance.post('/OperationsLoanBasicDetails', payload);
    return firstRecord(response.data) || unwrap(response.data);
  },

  async update(id, payload) {
    const response = await axiosInstance.put(`/OperationsLoanBasicDetails/${encodeURIComponent(id)}`, payload);
    return firstRecord(response.data) || unwrap(response.data);
  },

  async getDisbursementsByCustomer(agentCustomerId) {
    try {
      const response = await axiosInstance.get(
        `/OperationsDisbursementDetails/by-customer/${encodeURIComponent(agentCustomerId)}`
      );
      const value = unwrap(response.data);
      return Array.isArray(value) ? value : value ? [value] : [];
    } catch (error) {
      if (error?.response?.status === 404) return [];
      throw error;
    }
  },

  async getDisbursementById(id) {
    const response = await axiosInstance.get(`/OperationsDisbursementDetails/${encodeURIComponent(id)}`);
    return firstRecord(response.data);
  },

  async createDisbursement(payload) {
    const response = await axiosInstance.post('/OperationsDisbursementDetails', payload);
    return firstRecord(response.data) || unwrap(response.data);
  },

  async updateDisbursement(id, payload) {
    const response = await axiosInstance.put(
      `/OperationsDisbursementDetails/${encodeURIComponent(id)}`,
      payload
    );
    return firstRecord(response.data) || unwrap(response.data);
  },

  async deleteDisbursement(id) {
    await axiosInstance.delete(`/OperationsDisbursementDetails/${encodeURIComponent(id)}`);
  },

  async getPenaltyByCustomer(agentCustomerId) {
    try {
      const response = await axiosInstance.get(
        `/OperationsOverduePenaltyDetails/by-customer/${encodeURIComponent(agentCustomerId)}`
      );
      return firstRecord(response.data);
    } catch (error) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  async createPenalty(payload) {
    const response = await axiosInstance.post('/OperationsOverduePenaltyDetails', payload);
    return firstRecord(response.data) || unwrap(response.data);
  },

  async updatePenalty(id, payload) {
    const response = await axiosInstance.put(
      `/OperationsOverduePenaltyDetails/${encodeURIComponent(id)}`,
      payload
    );
    return firstRecord(response.data) || unwrap(response.data);
  },
};

export default operationsLoanBasicDetailsService;
