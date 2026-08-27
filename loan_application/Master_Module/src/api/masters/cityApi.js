import axiosInstance from '../axiosInstance';

export const getCities = async () => {
  const response = await axiosInstance.get('/City');
  return response.data;
};

export const getCityById = async (id) => {
  const response = await axiosInstance.get(`/City/${id}`);
  return response.data;
};

export const createCity = async (data) => {
  const response = await axiosInstance.post('/City', data);
  return response.data;
};

export const updateCity = async (id, data) => {
  const response = await axiosInstance.put(`/City/${id}`, data);
  return response.data;
};

export const deleteCity = async (id) => {
  const response = await axiosInstance.delete(`/City/${id}`);
  return response.data;
};
