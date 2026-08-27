import axiosInstance from '../api/axiosInstance';

export const permissionService = {
  getPermissions: async () => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.get('/Permissions/list');

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: [
        { id: 1, permissionId: 1, name: "Groups_View", description: "View Groups", menuName: "Groups", controllerName: "GroupsController", actionType: "View" },
        { id: 2, permissionId: 2, name: "Groups_Create", description: "Create Groups", menuName: "Groups", controllerName: "GroupsController", actionType: "Create" },
        { id: 3, permissionId: 3, name: "Groups_Edit", description: "Edit Groups", menuName: "Groups", controllerName: "GroupsController", actionType: "Edit" },
        { id: 4, permissionId: 4, name: "Groups_Delete", description: "Delete Groups", menuName: "Groups", controllerName: "GroupsController", actionType: "Delete" },
        { id: 5, permissionId: 5, name: "Roles_View", description: "View Roles", menuName: "Roles", controllerName: "RolesController", actionType: "View" },
        { id: 6, permissionId: 6, name: "Roles_Create", description: "Create Roles", menuName: "Roles", controllerName: "RolesController", actionType: "Create" },
        { id: 7, permissionId: 7, name: "Roles_Edit", description: "Edit Roles", menuName: "Roles", controllerName: "RolesController", actionType: "Edit" },
        { id: 8, permissionId: 8, name: "Roles_Delete", description: "Delete Roles", menuName: "Roles", controllerName: "RolesController", actionType: "Delete" },
        { id: 9, permissionId: 9, name: "Users_View", description: "View Users", menuName: "Users", controllerName: "UsersController", actionType: "View" },
        { id: 10, permissionId: 10, name: "Users_Create", description: "Create Users", menuName: "Users", controllerName: "UsersController", actionType: "Create" }
      ]
    };

    return response.data;
  },
  
  createPermission: async (permissionData) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.post('/Permissions/create', permissionData);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: {
        success: true,
        message: "Permission created successfully",
        data: permissionData
      }
    };

    return response.data;
  },
  
  updatePermission: async (id, permissionData) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.put(`/Permissions/update/${id}`, permissionData);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: {
        success: true,
        message: "Permission updated successfully",
        data: permissionData
      }
    };

    return response.data;
  },
  
  deletePermission: async (id) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.delete(`/Permissions/delete/${id}`);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: {
        success: true,
        message: "Permission deleted successfully"
      }
    };

    return response.data;
  }
};

