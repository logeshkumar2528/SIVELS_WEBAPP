import axiosInstance from '../axiosInstance';

const BASE_URL = '/masters/IndustryTypeMaster';

export const getIndustryTypes = async () => {
  const response = await axiosInstance.get(BASE_URL);
  return response.data;
};

export const getIndustryTypeById = async (id) => {
  const response = await axiosInstance.get(`${BASE_URL}/${id}`);
  return response.data;
};

export const createIndustryType = async (data) => {
  const response = await axiosInstance.post(BASE_URL, data);
  return response.data;
};

export const updateIndustryType = async (id, data) => {
  const response = await axiosInstance.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteIndustryType = async (id) => {
  const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
  return response.data;
};
