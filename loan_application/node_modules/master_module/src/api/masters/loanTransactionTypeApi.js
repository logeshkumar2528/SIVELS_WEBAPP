import axiosInstance from '../axiosInstance';

export const getLoanTransactionTypes = async () => {
  const response = await axiosInstance.get('/LoanTransactionTypeMaster');
  return response.data;
};

export const getLoanTransactionTypeById = async (id) => {
  const response = await axiosInstance.get(`/LoanTransactionTypeMaster/${id}`);
  return response.data;
};

export const createLoanTransactionType = async (data) => {
  const response = await axiosInstance.post('/LoanTransactionTypeMaster', data);
  return response.data;
};

export const updateLoanTransactionType = async (id, data) => {
  const response = await axiosInstance.put(`/LoanTransactionTypeMaster/${id}`, data);
  return response.data;
};

export const deleteLoanTransactionType = async (id) => {
  const response = await axiosInstance.delete(`/LoanTransactionTypeMaster/${id}`);
  return response.data;
};
