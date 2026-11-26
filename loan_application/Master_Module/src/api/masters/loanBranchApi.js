import axiosInstance from '../axiosInstance';

export const getLoanBranches = async () => {
  const response = await axiosInstance.get('/LoanBranchMaster');
  return response.data;
};

export const getLoanBranchById = async (id) => {
  const response = await axiosInstance.get(`/LoanBranchMaster/${id}`);
  return response.data;
};

export const createLoanBranch = async (data) => {
  const response = await axiosInstance.post('/LoanBranchMaster', data);
  return response.data;
};

export const updateLoanBranch = async (id, data) => {
  const response = await axiosInstance.put(`/LoanBranchMaster/${id}`, data);
  return response.data;
};

export const deleteLoanBranch = async (id) => {
  const response = await axiosInstance.delete(`/LoanBranchMaster/${id}`);
  return response.data;
};
