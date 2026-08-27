import axiosInstance from '../axiosInstance';

export const getSourcingChannels = async () => {
  const response = await axiosInstance.get('/SourcingChannelMaster');
  return response.data;
};

export const getSourcingChannelById = async (id) => {
  const response = await axiosInstance.get(`/SourcingChannelMaster/${id}`);
  return response.data;
};

export const createSourcingChannel = async (data) => {
  const response = await axiosInstance.post('/SourcingChannelMaster', data);
  return response.data;
};

export const updateSourcingChannel = async (id, data) => {
  const response = await axiosInstance.put(`/SourcingChannelMaster/${id}`, data);
  return response.data;
};

export const deleteSourcingChannel = async (id) => {
  const response = await axiosInstance.delete(`/SourcingChannelMaster/${id}`);
  return response.data;
};
