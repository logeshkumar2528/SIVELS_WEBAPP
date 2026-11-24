import axiosInstance from '../axiosInstance';

export const getFees = async () => {
  const response = await axiosInstance.get('/FeeMaster');
  return response.data;
};

export const getFeeById = async (id) => {
  const response = await axiosInstance.get(`/FeeMaster/${id}`);
  return response.data;
};

export const createFee = async (data) => {
  const response = await axiosInstance.post('/FeeMaster', data);
  return response.data;
};

export const updateFee = async (id, data) => {
  const response = await axiosInstance.put(`/FeeMaster/${id}`, data);
  return response.data;
};

export const deleteFee = async (id) => {
  const response = await axiosInstance.delete(`/FeeMaster/${id}`);
  return response.data;
};
