import axiosInstance from '../api/axiosInstance';

export const userRoleService = {
  getUserRoles: async (userId) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.get(`/UserRoles/user/${userId}`);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: [
        { id: 1, roleId: 1, name: "Admin" },
        { id: 2, roleId: 2, name: "Customer" }
      ]
    };

    return response.data;
  },
  
  updateUserRoles: async (userId, rolesData) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.put(`/UserRoles/user/${userId}`, rolesData);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: {
        success: true,
        message: "User roles updated successfully"
      }
    };

    return response.data;
  },
  
  getUserEffectivePermissions: async (userId) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.get(`/UserRoles/user/${userId}/permissions/detailed`);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: {
        roles: ["Admin", "Customer"],
        menus: [
          {
            menuName: "Groups",
            permissions: [
              { actionType: "View" },
              { actionType: "Create" },
              { actionType: "Edit" },
              { actionType: "Delete" }
            ]
          },
          {
            menuName: "Roles",
            permissions: [
              { actionType: "View" },
              { actionType: "Create" },
              { actionType: "Edit" },
              { actionType: "Delete" }
            ]
          },
          {
            menuName: "Users",
            permissions: [
              { actionType: "View" },
              { actionType: "Create" }
            ]
          }
        ]
      }
    };

    return response.data;
  }
};

