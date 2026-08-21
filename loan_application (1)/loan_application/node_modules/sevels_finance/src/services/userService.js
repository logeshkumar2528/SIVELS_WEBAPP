import axiosInstance from '../api/axiosInstance';

export const userService = {
  getUsers: async () => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.get('/user/list');

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: [
        { id: 1, userId: 1, firstName: "Thiru", lastName: "S", mobileNumber: "9345638126", gender: "Male", email: "thiru@sivels.com" },
        { id: 2, userId: 2, firstName: "Admin", lastName: "User", mobileNumber: "9876543210", gender: "Male", email: "admin@sivels.com" },
        { id: 3, userId: 3, firstName: "Logesh", lastName: "Kumar", mobileNumber: "9123456789", gender: "Male", email: "logesh@sivels.com" }
      ]
    };

    return response.data;
  },
  
  getCustomerDetails: async (userId) => {
    // ============================
    // ORIGINAL BACKEND API
    // ============================

    // const response = await axiosInstance.get(`/customer/by-user/${userId}`);

    // ============================
    // HARDCODED MOCK RESPONSE
    // ============================

    const response = {
      data: {
        userId: userId,
        firstName: "Thiru",
        lastName: "S",
        mobileNumber: "9345638126",
        gender: "Male",
        email: "thiru@sivels.com"
      }
    };

    return response.data;
  }
};

