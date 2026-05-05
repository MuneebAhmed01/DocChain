import { createContext, useEffect, useState } from "react";
// import axios from "axios";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";
import { PAYMENT_CURRENCY, PAYMENT_SYMBOL } from "../constants/payment";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const currencySymbol = `${PAYMENT_SYMBOL} `;
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [doctors, setDoctors] = useState([]);
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem("token");
    return storedToken &&
      storedToken !== "false" &&
      storedToken !== "null" &&
      storedToken !== "undefined"
      ? storedToken
      : false;
  });
  const [userData, setUserData] = useState(false);

  const getDoctorsData = async () => {
    try {
      const { data } = await axiosInstance.get(
        // backendUrl +

        "/api/doctor/list",
      );
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      // Don't show toast for network errors to avoid spamming
      if (error.code !== "ERR_NETWORK" && error.code !== "ECONNREFUSED") {
        toast.error(error.message);
      }
    }
  };

  const loadUserProfileData = async () => {
    try {
      const { data } = await axiosInstance.get(
        // backendUrl +

        "/api/user/get-profile",
        //   , {
        //   headers: { token },
        // }
      );
      if (data.success) {
        setUserData(data.user);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      // If it's a 401 (unauthorized) error, clear the token
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        setToken(false);
        setUserData(false);
        toast.error("Session expired. Please login again.");
      } else {
        toast.error(error.message);
      }
    }
  };

  const refreshUserData = async () => {
    await loadUserProfileData();
  };

  const value = {
    doctors,
    getDoctorsData,
    currencySymbol,
    currencyCode: PAYMENT_CURRENCY,
    token,
    setToken,
    backendUrl,
    userData,
    setUserData,
    loadUserProfileData,
    refreshUserData,
  };

  useEffect(() => {
    getDoctorsData();
  }, []);

  useEffect(() => {
    if (
      token &&
      token !== "false" &&
      token !== "null" &&
      token !== "undefined"
    ) {
      loadUserProfileData();
    } else {
      setUserData(false);
      // Clear invalid token from localStorage
      if (
        token === "false" ||
        token === "null" ||
        token === "undefined" ||
        !token
      ) {
        localStorage.removeItem("token");
        setToken(false);
      }
    }
  }, [token]);

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
