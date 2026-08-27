import axiosInstance from '../axiosInstance';

export const getLoanProductVariations = async () => {
  const response = await axiosInstance.get('/LoanProductVariationMaster');
  return response.data;
};

export const getLoanProductVariationById = async (id) => {
  const response = await axiosInstance.get(`/LoanProductVariationMaster/${id}`);
  return response.data;
};

export const getLoanProductVariationsByProduct = async (loanProductId) => {
  const response = await axiosInstance.get(`/LoanProductVariationMaster/byproduct/${loanProductId}`);
  return response.data;
};

export const createLoanProductVariation = async (data) => {
  const response = await axiosInstance.post('/LoanProductVariationMaster', data);
  return response.data;
};

export const updateLoanProductVariation = async (id, data) => {
  const response = await axiosInstance.put(`/LoanProductVariationMaster/${id}`, data);
  return response.data;
};

export const deleteLoanProductVariation = async (id) => {
  const response = await axiosInstance.delete(`/LoanProductVariationMaster/${id}`);
  return response.data;
};
