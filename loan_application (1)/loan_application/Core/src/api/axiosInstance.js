import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error("Unauthorized");
          break;

        case 403:
          console.error("Forbidden");
          break;

        case 404:
          console.error("API Not Found");
          break;

        case 500:
          console.error("Internal Server Error");
          break;

        default:
          console.error(error.response.data);
      }
    } else if (error.request) {
      console.error("Unable to connect to the backend.");
    } else {
      console.error(error.message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;