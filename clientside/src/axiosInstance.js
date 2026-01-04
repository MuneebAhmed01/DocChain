import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:4000",
  withCredentials: true, // needed if your backend uses cookies (optional for JWT)
});

// Interceptor to automatically add token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // get the latest token
    console.log("Token in localStorage:", token);

    if (token) {
      // Always use "Authorization" with "Bearer <token>"
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    console.log("Config headers before request:", config.headers);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
