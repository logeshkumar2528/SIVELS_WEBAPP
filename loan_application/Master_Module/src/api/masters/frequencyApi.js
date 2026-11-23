import axiosInstance from '../axiosInstance';

export const getFrequencies = async () => {
  const response = await axiosInstance.get('/FrequencyMaster');
  return response.data;
};

export const getFrequencyById = async (id) => {
  const response = await axiosInstance.get(`/FrequencyMaster/${id}`);
  return response.data;
};

export const createFrequency = async (data) => {
  const response = await axiosInstance.post('/FrequencyMaster', data);
  return response.data;
};

export const updateFrequency = async (id, data) => {
  const response = await axiosInstance.put(`/FrequencyMaster/${id}`, data);
  return response.data;
};

export const deleteFrequency = async (id) => {
  const response = await axiosInstance.delete(`/FrequencyMaster/${id}`);
  return response.data;
};
