import axiosInstance from '../axiosInstance';

export const getDivisions = async () => {
  const response = await axiosInstance.get('/DivisionMaster');
  return response.data;
};

export const getDivisionById = async (id) => {
  const response = await axiosInstance.get(`/DivisionMaster/${id}`);
  return response.data;
};

export const createDivision = async (data) => {
  const response = await axiosInstance.post('/DivisionMaster', data);
  return response.data;
};

export const updateDivision = async (id, data) => {
  const response = await axiosInstance.put(`/DivisionMaster/${id}`, data);
  return response.data;
};

export const deleteDivision = async (id) => {
  const response = await axiosInstance.delete(`/DivisionMaster/${id}`);
  return response.data;
};
