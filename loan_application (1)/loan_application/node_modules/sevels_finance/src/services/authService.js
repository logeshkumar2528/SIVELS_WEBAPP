import axiosInstance from '../api/axiosInstance';

export const authService = {
  login: async (mobileNumber) => {
    try {
      // ============================
      // ORIGINAL BACKEND API
      // ============================

      // const response = await axiosInstance.post('/user/login', { mobileNumber });

      // ============================
      // HARDCODED MOCK RESPONSE
      // ============================

      const response = {
        data: {
          id: 1,
          userId: 1,
          mobileNumber: mobileNumber || "9345638126",
          firstName: "Thiru",
          lastName: "S",
          role: "CUSTOMER",
          token: "mock-jwt-token-9345638126"
        }
      };

      return response.data;
    } catch (error) {
      if (error.response) {
        // Backend returned an error response (400, 404, 500, etc.)
        throw new Error(error.response.data.message || 'An error occurred during login');
      }
      // Network error or other issues
      throw new Error('Network error. Please try again.');
    }
  },

  register: async (userData) => {
    try {
      // ============================
      // ORIGINAL BACKEND API
      // ============================

      // const response = await axiosInstance.post('/user/register', userData);

      // ============================
      // HARDCODED MOCK RESPONSE
      // ============================

      const response = {
        data: {
          success: true,
          message: "User registered successfully",
          user: userData
        }
      };

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'An error occurred during registration');
      }
      throw new Error('Network error. Please try again.');
    }
  }
};

