import axiosInstance from '../axiosInstance';

export const getEmploymentTypes = async () => {
  const response = await axiosInstance.get('/EmploymentType');
  return response.data;
};

export const getEmploymentTypeById = async (id) => {
  const response = await axiosInstance.get(`/EmploymentType/${id}`);
  return response.data;
};

export const createEmploymentType = async (data) => {
  const response = await axiosInstance.post('/EmploymentType', data);
  return response.data;
};

export const updateEmploymentType = async (id, data) => {
  const response = await axiosInstance.put(`/EmploymentType/${id}`, data);
  return response.data;
};

export const deleteEmploymentType = async (id) => {
  const response = await axiosInstance.delete(`/EmploymentType/${id}`);
  return response.data;
};
