import axiosInstance from '../api/axiosInstance';

export const roleService = {
  getRoles: async () => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.get('/Roles/list');

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: [
        { id: 1, roleId: 1, name: "Admin", roleName: "Admin", usersCount: 3 },
        { id: 2, roleId: 2, name: "Customer", roleName: "Customer", usersCount: 15 },
        { id: 3, roleId: 3, name: "Agent", roleName: "Agent", usersCount: 5 },
        { id: 4, roleId: 4, name: "Relationship Manager", roleName: "Relationship Manager", usersCount: 2 }
      ]
    };

    return response.data;
  },
  
  createRole: async (roleData) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.post('/Roles/create', roleData);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: {
        success: true,
        message: "Role created successfully",
        data: roleData
      }
    };

    return response.data;
  },
  
  updateRole: async (id, roleData) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.put(`/Roles/update/${id}`, roleData);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: {
        success: true,
        message: "Role updated successfully",
        data: roleData
      }
    };

    return response.data;
  },
  
  deleteRole: async (id) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.delete(`/Roles/delete/${id}`);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: {
        success: true,
        message: "Role deleted successfully"
      }
    };

    return response.data;
  },

  getRolePermissions: async (id) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.get(`/Roles/${id}/permissions`);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: [1, 2, 3, 5, 9]
    };

    return response.data;
  },

  updateRolePermissions: async (id, permissionsData) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.put(`/Roles/${id}/permissions`, permissionsData);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: {
        success: true,
        message: "Role permissions updated successfully"
      }
    };

    return response.data;
  }
};

