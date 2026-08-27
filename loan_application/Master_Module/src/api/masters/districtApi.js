import axiosInstance from '../axiosInstance';

export const getDistricts = async () => {
  const response = await axiosInstance.get('/District');
  return response.data;
};

export const getDistrictById = async (id) => {
  const response = await axiosInstance.get(`/District/${id}`);
  return response.data;
};

export const createDistrict = async (data) => {
  const response = await axiosInstance.post('/District', data);
  return response.data;
};

export const updateDistrict = async (id, data) => {
  const response = await axiosInstance.put(`/District/${id}`, data);
  return response.data;
};

export const deleteDistrict = async (id) => {
  const response = await axiosInstance.delete(`/District/${id}`);
  return response.data;
};
