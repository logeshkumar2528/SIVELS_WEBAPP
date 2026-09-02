import axiosInstance from '../axiosInstance';

export const getEducations = async () => {
  const response = await axiosInstance.get('/EducationMaster');
  return response.data;
};

export const getEducationById = async (id) => {
  const response = await axiosInstance.get(`/EducationMaster/${id}`);
  return response.data;
};

export const createEducation = async (data) => {
  const response = await axiosInstance.post('/EducationMaster', data);
  return response.data;
};

export const updateEducation = async (id, data) => {
  const response = await axiosInstance.put(`/EducationMaster/${id}`, data);
  return response.data;
};

export const deleteEducation = async (id) => {
  const response = await axiosInstance.delete(`/EducationMaster/${id}`);
  return response.data;
};
