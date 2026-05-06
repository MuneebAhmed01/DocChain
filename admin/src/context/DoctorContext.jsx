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
  const [allBlogs, setAllBlogs] = useState([]);
  const [approvedBlogs, setApprovedBlogs] = useState([]);
  const [rejectedBlogs, setRejectedBlogs] = useState([]);

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

  const joinOnlineAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/doctor/appointments/join-online",
        { appointmentId },
        { headers: { dToken } },
      );

      if (!data.success) {
        toast.error(data.message || "Unable to join call");
        return null;
      }

      getAppointments();
      getDashData();
      return data.meetingLink || null;
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || error.message);
      return null;
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
        headers: { dToken: dToken },
      });

      console.log("API Response:", data);

      if (data.success) {
        setReviewsData(data);
        console.log("Reviews data set:", data);
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
        { headers: { dToken: dToken } },
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
        { headers: { dToken: dToken } },
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
        { headers: { dToken: dToken } },
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

  // Blog related methods
  const getDoctorAllBlogs = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/blogs/doctor/all", {
        headers: { dToken },
      });
      if (data.success) {
        setAllBlogs(data.blogs);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const getDoctorApprovedBlogs = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/blogs/doctor/approved",
        { headers: { dToken } },
      );
      if (data.success) {
        setApprovedBlogs(data.blogs);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const getDoctorRejectedBlogs = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/blogs/doctor/rejected",
        { headers: { dToken } },
      );
      if (data.success) {
        setRejectedBlogs(data.blogs);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const updateDoctorBlog = async (blogId, blogData) => {
    try {
      const { data } = await axios.put(
        backendUrl + `/api/blogs/doctor/${blogId}`,
        blogData,
        { headers: { dToken } },
      );
      if (data.success) {
        toast.success(data.message);
        getDoctorAllBlogs();
        return data;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const deleteDoctorBlog = async (blogId) => {
    try {
      const { data } = await axios.delete(
        backendUrl + `/api/blogs/doctor/${blogId}`,
        { headers: { dToken } },
      );
      if (data.success) {
        toast.success(data.message);
        getDoctorAllBlogs();
        return data;
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
    joinOnlineAppointment,
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
    allBlogs,
    setAllBlogs,
    approvedBlogs,
    setApprovedBlogs,
    rejectedBlogs,
    setRejectedBlogs,
    getDoctorAllBlogs,
    getDoctorApprovedBlogs,
    getDoctorRejectedBlogs,
    updateDoctorBlog,
    deleteDoctorBlog,
  };

  return (
    <DoctorContext.Provider value={value}>
      {props.children}
    </DoctorContext.Provider>
  );
};

export default DoctorContextProvider;
