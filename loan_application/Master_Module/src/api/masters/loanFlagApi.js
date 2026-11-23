import axiosInstance from '../axiosInstance';

export const getLoanFlags = async () => {
  const response = await axiosInstance.get('/LoanFlagMaster');
  return response.data;
};

export const getLoanFlagById = async (id) => {
  const response = await axiosInstance.get(`/LoanFlagMaster/${id}`);
  return response.data;
};

export const createLoanFlag = async (data) => {
  const response = await axiosInstance.post('/LoanFlagMaster', data);
  return response.data;
};

export const updateLoanFlag = async (id, data) => {
  const response = await axiosInstance.put(`/LoanFlagMaster/${id}`, data);
  return response.data;
};

export const deleteLoanFlag = async (id) => {
  const response = await axiosInstance.delete(`/LoanFlagMaster/${id}`);
  return response.data;
};
