import axiosInstance from '../../../../Core/src/api/axiosInstance';

function unwrapData(response) {
  const payload = response?.data;
  return payload?.data ?? payload ?? {};
}

export const operationsService = {
  async getCurrentUser() {
    const response = await axiosInstance.get('/OperationsUsers/me');
    return unwrapData(response);
  },
};

export default operationsService;
