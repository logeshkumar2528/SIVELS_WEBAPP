import axiosInstance from '../axiosInstance';

export const getStatuses = async () => {
  const response = await axiosInstance.get('/StatusMaster');
  return response.data;
};

export const getStatusById = async (id) => {
  const response = await axiosInstance.get(`/StatusMaster/${id}`);
  return response.data;
};

export const createStatus = async (data) => {
  const response = await axiosInstance.post('/StatusMaster', data);
  return response.data;
};

export const updateStatus = async (id, data) => {
  const response = await axiosInstance.put(`/StatusMaster/${id}`, data);
  return response.data;
};

export const deleteStatus = async (id) => {
  const response = await axiosInstance.delete(`/StatusMaster/${id}`);
  return response.data;
};
