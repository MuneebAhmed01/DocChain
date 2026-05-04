import { createContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const DoctorContext = createContext();

const DoctorContextProvider = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [dToken, setDToken] = useState(
    localStorage.getItem("dToken") ? localStorage.getItem("dToken") : "",
  );
  const [appointments, setAppointments] = useState([]);
  const [dashData, setDashData] = useState(false);
  const [profileData, setProfileData] = useState(false);
  const [reviewsData, setReviewsData] = useState(null);

  const getAppointments = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/doctor/appointments",
        { headers: { dToken } },
      );
      if (data.success) {
        setAppointments(data.appointments);
        console.log(data.appointments);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const completeAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/doctor/complete-appointment",
        { appointmentId },
        { headers: { dToken } },
      );

      if (data.success) {
        toast.success(data.message);
        getAppointments();
        getDashData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/doctor/cancel-appointment",
        { appointmentId },
        { headers: { dToken } },
      );

      if (data.success) {
        toast.success(data.message);
        getAppointments();
        getDashData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const getDashData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/dashboard", {
        headers: { dToken },
      });

      if (data.success) {
        setDashData(data.dashData);
        console.log(data.dashData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const getProfileData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/profile", {
        headers: { dToken },
      });
      if (data.success) {
        setProfileData(data.profileData);
        console.log(data.profileData);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const getReviewsData = async () => {
    try {
      console.log("Fetching reviews from:", backendUrl + "/api/doctor/reviews");
      console.log("Token available:", !!dToken);

      const { data } = await axios.get(backendUrl + "/api/doctor/reviews", {
        headers: { dtoken: dToken },
      });

      console.log("API Response:", data);

      if (data.success) {
        setReviewsData(data.data);
        console.log("Reviews data set:", data.data);
      } else {
        console.log("API Error:", data.message);
        toast.error(data.message);
      }
    } catch (error) {
      console.log("Fetch Error:", error);
      toast.error(error.message);
    }
  };

  const addReviewReply = async (reviewId, replyText) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/review/reply",
        { reviewId, replyText },
        { headers: { dtoken: dToken } },
      );
      if (data.success) {
        toast.success(data.message);
        getReviewsData(); // Refresh reviews data
        return data.data;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const updateReviewReply = async (reviewId, replyText) => {
    try {
      const { data } = await axios.put(
        backendUrl + "/api/review/reply",
        { reviewId, replyText },
        { headers: { dtoken: dToken } },
      );
      if (data.success) {
        toast.success(data.message);
        getReviewsData(); // Refresh reviews data
        return data.data;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const deleteReviewReply = async (reviewId) => {
    try {
      const { data } = await axios.delete(
        backendUrl + `/api/review/reply/${reviewId}`,
        { headers: { dtoken: dToken } },
      );
      if (data.success) {
        toast.success(data.message);
        getReviewsData(); // Refresh reviews data
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const value = {
    dToken,
    setDToken,
    backendUrl,
    appointments,
    setAppointments,
    getAppointments,
    completeAppointment,
    cancelAppointment,
    dashData,
    setDashData,
    getDashData,
    profileData,
    setProfileData,
    getProfileData,
    reviewsData,
    setReviewsData,
    getReviewsData,
    addReviewReply,
    updateReviewReply,
    deleteReviewReply,
  };

  return (
    <DoctorContext.Provider value={value}>
      {props.children}
    </DoctorContext.Provider>
  );
};

export default DoctorContextProvider;
