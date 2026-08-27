import axiosInstance from '../axiosInstance';

export const getBanks = async () => {
  const response = await axiosInstance.get('/masters/bank');
  return response.data;
};

export const getBankById = async (id) => {
  const response = await axiosInstance.get(`/masters/bank/${id}`);
  return response.data;
};

export const createBank = async (data) => {
  const response = await axiosInstance.post('/masters/bank', data);
  return response.data;
};

export const updateBank = async (id, data) => {
  const response = await axiosInstance.put(`/masters/bank/${id}`, data);
  return response.data;
};

export const deleteBank = async (id) => {
  const response = await axiosInstance.delete(`/masters/bank/${id}`);
  return response.data;
};
