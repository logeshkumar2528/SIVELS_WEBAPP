import axiosInstance from '../axiosInstance';

export const getTitles = async () => {
  const response = await axiosInstance.get('/TitleMaster');
  return response.data;
};

export const getTitleById = async (id) => {
  const response = await axiosInstance.get(`/TitleMaster/${id}`);
  return response.data;
};

export const createTitle = async (data) => {
  const response = await axiosInstance.post('/TitleMaster', data);
  return response.data;
};

export const updateTitle = async (id, data) => {
  const response = await axiosInstance.put(`/TitleMaster/${id}`, data);
  return response.data;
};

export const deleteTitle = async (id) => {
  const response = await axiosInstance.delete(`/TitleMaster/${id}`);
  return response.data;
};
