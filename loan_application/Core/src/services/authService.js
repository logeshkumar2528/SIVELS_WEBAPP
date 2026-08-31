import axiosInstance from '../api/axiosInstance';

export const authService = {
  // ──────────────────────────────────────────────────────────────────────────
  // SEND OTP  →  POST /MobileOtp/send-mobile-otp
  // Payload: { phoneNumber: "9876543210" }
  // ──────────────────────────────────────────────────────────────────────────
  sendOtp: async (phoneNumber) => {
    try {
      const response = await axiosInstance.post('/MobileOtp/send-mobile-otp', {
        phoneNumber,
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        const msg =
          error.response.data?.message ||
          error.response.data?.error ||
          `Error ${error.response.status}: Failed to send OTP`;
        throw new Error(msg);
      }

      throw new Error('Network error. Please check your connection and try again.');
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // VERIFY MOBILE OTP  →  POST /MobileOtp/verify-mobile-otp
  // Payload: { mobileNumber: "9345638127", otp: "580232" }
  // ──────────────────────────────────────────────────────────────────────────
  verifyMobileOtp: async (mobileNumberOrPayload, maybeOtp) => {
    let mobileNumber = '';
    let otp = '';

    if (typeof mobileNumberOrPayload === 'object' && mobileNumberOrPayload !== null) {
      mobileNumber = mobileNumberOrPayload.mobileNumber || '';
      otp = mobileNumberOrPayload.otp || '';
    } else if (maybeOtp !== undefined) {
      mobileNumber = mobileNumberOrPayload || '';
      otp = maybeOtp || '';
    } else {
      otp = mobileNumberOrPayload || '';
    }

    try {
      const response = await axiosInstance.post('/MobileOtp/verify-mobile-otp', {
        mobileNumber: String(mobileNumber).trim(),
        otp: String(otp).trim(),
      });
      const data = response.data;

      // Persist auth token if provided by backend response
      const token = data?.token || data?.accessToken || data?.access_token || data?.data?.token;
      if (token) {
        localStorage.setItem('authToken', token);
      }

      return data;
    } catch (error) {
      if (error.response) {
        const msg =
          error.response.data?.message ||
          error.response.data?.error ||
          error.response.data?.title ||
          'Invalid OTP. Please check the code and try again.';
        throw new Error(msg);
      }

      throw new Error('Network error. Please check your connection and try again.');
    }
  },

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

