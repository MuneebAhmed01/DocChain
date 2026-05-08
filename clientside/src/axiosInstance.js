import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:4000",
  withCredentials: true, // needed if your backend uses cookies (optional for JWT)
});

// Interceptor to automatically add token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // get the latest token

    if (token) {
      // Always use "Authorization" with "Bearer <token>"
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle aborted requests silently
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if the error is due to request abortion (common during redirects)
    if (error.code === 'ERR_CANCELED' || 
        error.message?.includes('canceled') ||
        error.message?.includes('aborted') ||
        (error.response?.status === 0 && error.message)) {
      // Completely suppress aborted request errors to prevent toast notifications
      return new Promise(() => {}); // Never resolves or rejects
    }
    
    // For other errors, let them propagate normally
    return Promise.reject(error);
  }
);

export default axiosInstance;
