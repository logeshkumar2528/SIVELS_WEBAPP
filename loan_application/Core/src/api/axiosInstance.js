import axios from "axios";
import { API_BASE_URL, isApiUrl } from "./apiConfig";
import { handleSessionExpired, notifyBlockedResponse, notifyForbidden } from "../auth/authEvents";
import { getTokenForRequest, isAuthEndpoint, recoverFromUnauthorized } from "../auth/refreshSession";
import { getAccessToken } from "../auth/tokenStore";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

function requestUrl(config) {
  const url = String(config?.url || "");
  if (/^https?:\/\//i.test(url)) return url;
  return `${config?.baseURL || ""}${url}`;
}

function setAuthorization(config, token) {
  if (!config.headers) return;
  if (token) {
    if (typeof config.headers.set === "function") {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else if (typeof config.headers.delete === "function") {
    config.headers.delete("Authorization");
  } else {
    delete config.headers.Authorization;
  }
}

// Request Interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    const url = requestUrl(config);

    if (isApiUrl(url)) {
      const token = isAuthEndpoint(url) ? getAccessToken() : await getTokenForRequest();
      config._sentToken = token;
      setAuthorization(config, token);
    }

    if (config.data instanceof FormData) {
      if (config.headers && typeof config.headers.delete === 'function') {
        config.headers.delete("Content-Type");
      } else if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

async function retryAfterUnauthorized(error) {
  const config = error.config;
  const retryToken = await recoverFromUnauthorized(config._sentToken);
  if (!retryToken) {
    return Promise.reject(error);
  }
  config._authRetried = true;
  return axiosInstance(config);
}

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (error.response) {
      switch (error.response.status) {
        case 401: {
          if (!config || !isApiUrl(requestUrl(config))) break;
          if (isAuthEndpoint(requestUrl(config)) || config._authRetried) {
            handleSessionExpired();
            break;
          }
          return retryAfterUnauthorized(error);
        }

        case 403:
          notifyForbidden(error.response.data?.message);
          break;

        case 409:
        case 429:
          notifyBlockedResponse(error.response.status, error.response.data);
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
