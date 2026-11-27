import axiosInstance from '../../../../Core/src/api/axiosInstance';

const BASE_ENDPOINT = '/OperationsRepaymentSchedule';

function unwrapResponse(response) {
  const payload = response?.data ?? response;
  if (payload?.value !== undefined) return payload.value;
  if (payload?.data !== undefined) return payload.data;
  if (payload?.result !== undefined) return payload.result;
  return payload;
}

export function getRepaymentScheduleApiErrorMessage(error, fallback = 'Unable to complete the repayment schedule request.') {
  const data = error?.response?.data;
  return (
    (typeof data === 'string' && data.trim())
    || data?.message
    || data?.Message
    || data?.title
    || data?.error
    || error?.message
    || fallback
  );
}

export const operationsRepaymentScheduleService = {
  async preview(payload) {
    const response = await axiosInstance.post(`${BASE_ENDPOINT}/preview`, payload);
    return unwrapResponse(response);
  },

  async generate(payload) {
    const response = await axiosInstance.post(`${BASE_ENDPOINT}/generate`, payload);
    return unwrapResponse(response);
  },

  async getByCustomer(agentCustomerId, applicationProductDetailsId) {
    try {
      const response = await axiosInstance.get(
        `${BASE_ENDPOINT}/by-customer/${encodeURIComponent(agentCustomerId)}`,
        { params: { applicationProductDetailsId } }
      );
      return unwrapResponse(response);
    } catch (error) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  async getById(scheduleId) {
    const response = await axiosInstance.get(`${BASE_ENDPOINT}/${encodeURIComponent(scheduleId)}`);
    return unwrapResponse(response);
  },

  async getDetails(scheduleId) {
    const response = await axiosInstance.get(`${BASE_ENDPOINT}/${encodeURIComponent(scheduleId)}/details`);
    return unwrapResponse(response);
  },
};

export default operationsRepaymentScheduleService;
