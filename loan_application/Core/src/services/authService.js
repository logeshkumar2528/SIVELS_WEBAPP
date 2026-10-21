import axiosInstance from '../api/axiosInstance';
import { saveTokens } from '../auth/tokenStore';

function apiErrorMessage(error, fallback) {
  if (error?.response) {
    return (
      error.response.data?.message ||
      error.response.data?.error ||
      error.response.data?.title ||
      fallback
    );
  }
  if (error?.isAxiosError || error?.request) {
    return 'Network error. Please check your connection and try again.';
  }
  return error?.message || fallback;
}

export const authService = {
  // ──────────────────────────────────────────────────────────────────────────
  // SEND OTP  →  POST /MobileOtp/send-mobile-otp
  // Payload: { phoneNumber: "9876543210", purpose: "Login" }
  // The backend checks the account exists and is active; failures come back as
  // { success: false, message }.
  // ──────────────────────────────────────────────────────────────────────────
  sendOtp: async (phoneNumber) => {
    try {
      const response = await axiosInstance.post('/MobileOtp/send-mobile-otp', {
        phoneNumber,
        purpose: 'Login',
      });

      return response.data;
    } catch (error) {
      throw new Error(
        apiErrorMessage(error, `Error ${error?.response?.status ?? ''}: Failed to send OTP`.trim())
      );
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // VERIFY MOBILE OTP  →  POST /MobileOtp/verify-mobile-otp
  // Success has no `success` field: it is identified by the presence of `token`.
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

    let data;
    try {
      const response = await axiosInstance.post('/MobileOtp/verify-mobile-otp', {
        mobileNumber: String(mobileNumber).trim(),
        otp: String(otp).trim(),
        purpose: 'Login',
      });
      data = response.data;
    } catch (error) {
      throw new Error(apiErrorMessage(error, 'Invalid OTP. Please check the code and try again.'));
    }

    if (!data?.token) {
      throw new Error(
        data?.message ||
        data?.error ||
        data?.title ||
        'Invalid OTP. Please check the code and try again.'
      );
    }

    saveTokens(data);
    return data;
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
