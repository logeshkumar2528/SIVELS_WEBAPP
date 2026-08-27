import axiosInstance from '../axiosInstance';

export const getStatusRoles = async () => {
  const response = await axiosInstance.get('/StatusRoleMaster');
  return response.data;
};

export const getStatusRoleById = async (id) => {
  const response = await axiosInstance.get(`/StatusRoleMaster/${id}`);
  return response.data;
};

export const createStatusRole = async (data) => {
  const response = await axiosInstance.post('/StatusRoleMaster', data);
  return response.data;
};

export const updateStatusRole = async (id, data) => {
  const response = await axiosInstance.put(`/StatusRoleMaster/${id}`, data);
  return response.data;
};

export const deleteStatusRole = async (id) => {
  const response = await axiosInstance.delete(`/StatusRoleMaster/${id}`);
  return response.data;
};
