import axiosInstance from '../axiosInstance';

export const getStates = async () => {
  const response = await axiosInstance.get('/State');
  return response.data;
};

export const getStateById = async (id) => {
  const response = await axiosInstance.get(`/State/${id}`);
  return response.data;
};

export const createState = async (data) => {
  const response = await axiosInstance.post('/State', data);
  return response.data;
};

export const updateState = async (id, data) => {
  const response = await axiosInstance.put(`/State/${id}`, data);
  return response.data;
};

export const deleteState = async (id) => {
  const response = await axiosInstance.delete(`/State/${id}`);
  return response.data;
};
