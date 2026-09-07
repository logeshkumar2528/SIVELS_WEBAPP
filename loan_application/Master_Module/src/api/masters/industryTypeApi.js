import axiosInstance from '../axiosInstance';

export const getIndustryTypes = async () => {
  const response = await axiosInstance.get('/IndustryTypeMaster');
  return response.data;
};

export const getIndustryTypeById = async (id) => {
  const response = await axiosInstance.get(`/IndustryTypeMaster/${id}`);
  return response.data;
};

export const createIndustryType = async (data) => {
  const response = await axiosInstance.post('/IndustryTypeMaster', data);
  return response.data;
};

export const updateIndustryType = async (id, data) => {
  const response = await axiosInstance.put(`/IndustryTypeMaster/${id}`, data);
  return response.data;
};

export const deleteIndustryType = async (id) => {
  const response = await axiosInstance.delete(`/IndustryTypeMaster/${id}`);
  return response.data;
};
