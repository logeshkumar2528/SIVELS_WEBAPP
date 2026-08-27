import axiosInstance from '../axiosInstance';

export const getLoanPurposes = async () => {
  const response = await axiosInstance.get('/LoanPurposeMaster');
  return response.data;
};

export const getLoanPurposeById = async (id) => {
  const response = await axiosInstance.get(`/LoanPurposeMaster/${id}`);
  return response.data;
};

export const createLoanPurpose = async (data) => {
  const response = await axiosInstance.post('/LoanPurposeMaster', data);
  return response.data;
};

export const updateLoanPurpose = async (id, data) => {
  const response = await axiosInstance.put(`/LoanPurposeMaster/${id}`, data);
  return response.data;
};

export const deleteLoanPurpose = async (id) => {
  const response = await axiosInstance.delete(`/LoanPurposeMaster/${id}`);
  return response.data;
};
