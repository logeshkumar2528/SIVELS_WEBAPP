import axiosInstance from '../axiosInstance';

export const getDayBases = async () => {
  const response = await axiosInstance.get('/DayBasisMaster');
  return response.data;
};

export const getDayBasisById = async (id) => {
  const response = await axiosInstance.get(`/DayBasisMaster/${id}`);
  return response.data;
};

export const createDayBasis = async (data) => {
  const response = await axiosInstance.post('/DayBasisMaster', data);
  return response.data;
};

export const updateDayBasis = async (id, data) => {
  const response = await axiosInstance.put(`/DayBasisMaster/${id}`, data);
  return response.data;
};

export const deleteDayBasis = async (id) => {
  const response = await axiosInstance.delete(`/DayBasisMaster/${id}`);
  return response.data;
};
