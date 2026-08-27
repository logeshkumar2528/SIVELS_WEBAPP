import axiosInstance from '../axiosInstance';

export const getLoanTypes = async () => {
  const response = await axiosInstance.get('/LoanTypeMaster');
  return response.data;
};

export const getLoanTypeById = async (id) => {
  const response = await axiosInstance.get(`/LoanTypeMaster/${id}`);
  return response.data;
};

export const createLoanType = async (data) => {
  const response = await axiosInstance.post('/LoanTypeMaster', data);
  return response.data;
};

export const updateLoanType = async (id, data) => {
  const response = await axiosInstance.put(`/LoanTypeMaster/${id}`, data);
  return response.data;
};

export const deleteLoanType = async (id) => {
  const response = await axiosInstance.delete(`/LoanTypeMaster/${id}`);
  return response.data;
};
