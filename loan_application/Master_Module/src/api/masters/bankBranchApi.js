import axiosInstance from '../axiosInstance';

export const getBankBranches = async () => {
  const response = await axiosInstance.get('/BankBranch');
  return response.data;
};

export const getBankBranchById = async (id) => {
  const response = await axiosInstance.get(`/BankBranch/${id}`);
  return response.data;
};

export const createBankBranch = async (data) => {
  const response = await axiosInstance.post('/BankBranch', data);
  return response.data;
};

export const updateBankBranch = async (id, data) => {
  const response = await axiosInstance.put(`/BankBranch/${id}`, data);
  return response.data;
};

export const deleteBankBranch = async (id) => {
  const response = await axiosInstance.delete(`/BankBranch/${id}`);
  return response.data;
};
