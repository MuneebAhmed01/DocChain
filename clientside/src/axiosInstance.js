import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:4000",
    withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  console.log("Token in localStorage:", localStorage.getItem("token"));


  console.log("Sending token:", token);


  console.log("Sending token 2:", token);
console.log("Config headers before request:", config.headers);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // <-- must be "Authorization"
  }

  return config;
});

export default axiosInstance;
