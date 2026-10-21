import axiosInstance from './axiosInstance';

export const getPermissionCatalog = async () => {
  const response = await axiosInstance.get('/AccessControl/permissions');
  return response.data;
};

export const getRoles = async () => {
  const response = await axiosInstance.get('/AccessControl/roles');
  return response.data;
};

export const getRole = async (roleId) => {
  const response = await axiosInstance.get(`/AccessControl/roles/${roleId}`);
  return response.data;
};

export const createRole = async (data) => {
  const response = await axiosInstance.post('/AccessControl/roles', data);
  return response.data;
};

export const updateRole = async (roleId, data) => {
  const response = await axiosInstance.put(`/AccessControl/roles/${roleId}`, data);
  return response.data;
};

export const resetRoleDefaults = async (roleId) => {
  const response = await axiosInstance.post(`/AccessControl/roles/${roleId}/reset-defaults`);
  return response.data;
};

export const deactivateRole = async (roleId) => {
  const response = await axiosInstance.delete(`/AccessControl/roles/${roleId}`);
  return response.data;
};

export const getStaffRoles = async ({ search, roleId } = {}) => {
  const response = await axiosInstance.get('/AccessControl/staff', {
    params: {
      ...(search ? { search } : {}),
      ...(roleId ? { roleId } : {}),
    },
  });
  return response.data;
};

export const changeStaffRole = async (staffId, roleId) => {
  const response = await axiosInstance.put(`/AccessControl/staff/${staffId}/role`, { roleId });
  return response.data;
};
