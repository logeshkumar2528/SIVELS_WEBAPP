import axiosInstance from '../axiosInstance';

export const getReligions = async () => {
  const response = await axiosInstance.get('/masters/ReligionMaster');
  return response.data;
};

export const getReligionById = async (id) => {
  const response = await axiosInstance.get(`/masters/ReligionMaster/${id}`);
  return response.data;
};

export const createReligion = async (data) => {
  const response = await axiosInstance.post('/masters/ReligionMaster', data);
  return response.data;
};

export const updateReligion = async (id, data) => {
  const response = await axiosInstance.put(`/masters/ReligionMaster/${id}`, data);
  return response.data;
};

export const deleteReligion = async (id) => {
  const response = await axiosInstance.delete(`/masters/ReligionMaster/${id}`);
  return response.data;
};
