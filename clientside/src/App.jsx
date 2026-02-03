import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Doctors from "./pages/Doctors";
import Login from "./pages/Login";
import About from "./pages/About";
import Contact from "./pages/Contact";
import MyProfile from "./pages/MyProfile";
import MyAppointments from "./pages/MyAppointments";
import Appointment from "./pages/Appointment";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BlogList from "./pages/Blogs/BlogList";
import BlogDetail from "./pages/Blogs/BlogDetail";
import PaymentSuccess from "./pages/PaymentSuccess";
import JoinDoctor from "./pages/JoinDoctor";
import OnlineConsulting from "./pages/OnlineConsulting";
import OnlineConsultSuccess from "./pages/OnlineConsultSuccess";
import ConsultRoom from "./pages/ConsultRoom";
import ConsultWaiting from "./pages/ConsultWaiting";
import ScrollToTop from "./components/ScrollToTop";

const App = () => {
  return (
    <div className="mx-4 sm:mx-[3%]  ">
      <ToastContainer />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:speciality" element={<Doctors />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/join-doctor" element={<JoinDoctor />} />

        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* Blog route */}

        <Route path="/blogs" element={<BlogList />} />
        <Route path="/blog/:idOrSlug" element={<BlogDetail />} />

        <Route path="/contact" element={<Contact />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/appointment/:docId" element={<Appointment />} />

        <Route path="/online-consulting" element={<OnlineConsulting />} />
        <Route
          path="/online-consult-success"
          element={<OnlineConsultSuccess />}
        />
        <Route path="/consult-room/:roomId" element={<ConsultRoom />} />
        <Route path="/consult-waiting/:roomId" element={<ConsultWaiting />} />
      </Routes>
      <ScrollToTop />
      <Footer />
    </div>
  );
};

export default App;
