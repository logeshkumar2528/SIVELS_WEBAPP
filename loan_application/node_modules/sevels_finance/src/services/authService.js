import axiosInstance from '../api/axiosInstance';

export const authService = {
  // ──────────────────────────────────────────────────────────────────────────
  // LOGIN  →  POST /api/user/login
  // baseURL is already "http://localhost:5118/api", so endpoint = "/user/login"
  // ──────────────────────────────────────────────────────────────────────────
  login: async (mobileNumber) => {
    try {
      const response = await axiosInstance.post('/user/login', { mobileNumber });
      const data = response.data;

      // If the backend returns a token, persist it so subsequent requests
      // (via the existing axiosInstance interceptor) attach it automatically.
      const token = data?.token || data?.accessToken || data?.access_token;
      if (token) {
        localStorage.setItem('authToken', token);
      }

      return data;
    } catch (error) {
      if (error.response) {
        // Backend returned a structured error — surface the message
        const msg =
          error.response.data?.message ||
          error.response.data?.error ||
          `Error ${error.response.status}: Login failed`;
        throw new Error(msg);
      }
      // Network / CORS / timeout
      throw new Error('Network error. Please check your connection and try again.');
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

