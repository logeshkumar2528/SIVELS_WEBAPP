import axiosInstance from '../axiosInstance';

export const getCountries = async () => {
  const response = await axiosInstance.get('/Country');
  return response.data;
};

export const getCountryById = async (id) => {
  const response = await axiosInstance.get(`/Country/${id}`);
  return response.data;
};

export const createCountry = async (data) => {
  const response = await axiosInstance.post('/Country', data);
  return response.data;
};

export const updateCountry = async (id, data) => {
  const response = await axiosInstance.put(`/Country/${id}`, data);
  return response.data;
};

export const deleteCountry = async (id) => {
  const response = await axiosInstance.delete(`/Country/${id}`);
  return response.data;
};
