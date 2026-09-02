import axiosInstance from '../axiosInstance';

export const getPropertyUsages = async () => {
  const response = await axiosInstance.get('/PropertyUsageMaster');
  return response.data;
};

export const getPropertyUsageById = async (id) => {
  const response = await axiosInstance.get(`/PropertyUsageMaster/${id}`);
  return response.data;
};

export const createPropertyUsage = async (data) => {
  const response = await axiosInstance.post('/PropertyUsageMaster', data);
  return response.data;
};

export const updatePropertyUsage = async (id, data) => {
  const response = await axiosInstance.put(`/PropertyUsageMaster/${id}`, data);
  return response.data;
};

export const deletePropertyUsage = async (id) => {
  const response = await axiosInstance.delete(`/PropertyUsageMaster/${id}`);
  return response.data;
};
