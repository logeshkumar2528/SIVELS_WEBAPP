import axiosInstance from '../axiosInstance';

export const getCastes = async () => {
  const response = await axiosInstance.get('/masters/CasteMaster');
  return response.data;
};

export const getCasteById = async (id) => {
  const response = await axiosInstance.get(`/masters/CasteMaster/${id}`);
  return response.data;
};

export const createCaste = async (data) => {
  const response = await axiosInstance.post('/masters/CasteMaster', data);
  return response.data;
};

export const updateCaste = async (id, data) => {
  const response = await axiosInstance.put(`/masters/CasteMaster/${id}`, data);
  return response.data;
};

export const deleteCaste = async (id) => {
  const response = await axiosInstance.delete(`/masters/CasteMaster/${id}`);
  return response.data;
};
