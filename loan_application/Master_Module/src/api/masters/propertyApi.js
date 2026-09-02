import axiosInstance from '../axiosInstance';

export const getProperties = async () => {
  const response = await axiosInstance.get('/PropertyMaster');
  return response.data;
};

export const getPropertyById = async (id) => {
  const response = await axiosInstance.get(`/PropertyMaster/${id}`);
  return response.data;
};

export const createProperty = async (data) => {
  const response = await axiosInstance.post('/PropertyMaster', data);
  return response.data;
};

export const updateProperty = async (id, data) => {
  const response = await axiosInstance.put(`/PropertyMaster/${id}`, data);
  return response.data;
};

export const deleteProperty = async (id) => {
  const response = await axiosInstance.delete(`/PropertyMaster/${id}`);
  return response.data;
};
