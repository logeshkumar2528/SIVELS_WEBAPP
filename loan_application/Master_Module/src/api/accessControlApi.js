import axiosInstance from './axiosInstance';

export const getDepartments = async () => {
  const response = await axiosInstance.get('/AccessControl/departments');
  return response.data;
};

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

// legacyType + legacyId find the login behind one master record (e.g. RM 12).
export const getStaffRoles = async ({ search, roleId, legacyType, legacyId } = {}) => {
  const response = await axiosInstance.get('/AccessControl/staff', {
    params: {
      ...(search ? { search } : {}),
      ...(roleId ? { roleId } : {}),
      ...(legacyType ? { legacyType } : {}),
      ...(legacyId ? { legacyId } : {}),
    },
  });
  return response.data;
};

export const changeStaffRole = async (staffId, roleId) => {
  const response = await axiosInstance.put(`/AccessControl/staff/${staffId}/role`, { roleId });
  return response.data;
};
