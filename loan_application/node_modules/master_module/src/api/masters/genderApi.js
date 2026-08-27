import axiosInstance from '../axiosInstance';

export const getGenders = async () => {
  const response = await axiosInstance.get('/gender');
  return response.data;
};

export const getGenderById = async (id) => {
  const response = await axiosInstance.get(`/gender/${id}`);
  return response.data;
};

export const createGender = async (data) => {
  const response = await axiosInstance.post('/gender', data);
  return response.data;
};

export const updateGender = async (id, data) => {
  const response = await axiosInstance.put(`/gender/${id}`, data);
  return response.data;
};

export const deleteGender = async (id) => {
  const response = await axiosInstance.delete(`/gender/${id}`);
  return response.data;
};
