import axiosInstance from '../axiosInstance';

export const getScheduleMethods = async () => {
  const response = await axiosInstance.get('/ScheduleMethodMaster');
  return response.data;
};

export const getScheduleMethodById = async (id) => {
  const response = await axiosInstance.get(`/ScheduleMethodMaster/${id}`);
  return response.data;
};

export const createScheduleMethod = async (data) => {
  const response = await axiosInstance.post('/ScheduleMethodMaster', data);
  return response.data;
};

export const updateScheduleMethod = async (id, data) => {
  const response = await axiosInstance.put(`/ScheduleMethodMaster/${id}`, data);
  return response.data;
};

export const deleteScheduleMethod = async (id) => {
  const response = await axiosInstance.delete(`/ScheduleMethodMaster/${id}`);
  return response.data;
};
