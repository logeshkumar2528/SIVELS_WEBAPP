import axiosInstance from '../axiosInstance';

export const getMortgageStatuses = async () => {
  const response = await axiosInstance.get('/MortgageStatusMaster');
  return response.data;
};

export const getMortgageStatusById = async (id) => {
  const response = await axiosInstance.get(`/MortgageStatusMaster/${id}`);
  return response.data;
};

export const createMortgageStatus = async (data) => {
  const response = await axiosInstance.post('/MortgageStatusMaster', data);
  return response.data;
};

export const updateMortgageStatus = async (id, data) => {
  const response = await axiosInstance.put(`/MortgageStatusMaster/${id}`, data);
  return response.data;
};

export const deleteMortgageStatus = async (id) => {
  const response = await axiosInstance.delete(`/MortgageStatusMaster/${id}`);
  return response.data;
};
