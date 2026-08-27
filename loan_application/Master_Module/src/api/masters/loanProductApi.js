import axiosInstance from '../axiosInstance';

export const getLoanProducts = async () => {
  const response = await axiosInstance.get('/LoanProductMaster');
  return response.data;
};

export const getLoanProductById = async (id) => {
  const response = await axiosInstance.get(`/LoanProductMaster/${id}`);
  return response.data;
};

export const createLoanProduct = async (data) => {
  const response = await axiosInstance.post('/LoanProductMaster', data);
  return response.data;
};

export const updateLoanProduct = async (id, data) => {
  const response = await axiosInstance.put(`/LoanProductMaster/${id}`, data);
  return response.data;
};

export const deleteLoanProduct = async (id) => {
  const response = await axiosInstance.delete(`/LoanProductMaster/${id}`);
  return response.data;
};
