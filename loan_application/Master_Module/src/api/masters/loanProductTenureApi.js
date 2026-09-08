import axiosInstance from '../axiosInstance';

const BASE_URL = '/masters/LoanProductTenureMaster';

export const getLoanProductTenures = async () => {
  const response = await axiosInstance.get(BASE_URL);
  return response.data;
};

export const getLoanProductTenureById = async (id) => {
  const response = await axiosInstance.get(`${BASE_URL}/${id}`);
  return response.data;
};

export const getLoanProductTenuresByProduct = async (loanProductId) => {
  const response = await axiosInstance.get(`${BASE_URL}/product/${loanProductId}`);
  return response.data;
};

export const createLoanProductTenure = async (data) => {
  const response = await axiosInstance.post(BASE_URL, data);
  return response.data;
};

export const updateLoanProductTenure = async (id, data) => {
  const response = await axiosInstance.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteLoanProductTenure = async (id) => {
  const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
  return response.data;
};
