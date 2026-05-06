import React from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Home from "./pages/Home";
import Doctors from "./pages/Doctors";
import Login from "./pages/Login";
import About from "./pages/About";
import Contact from "./pages/Contact";
import MyProfile from "./pages/MyProfileModern";
import MyAppointments from "./pages/MyAppointments";
import Appointment from "./pages/Appointment";
import CompleteProfile from "./pages/CompleteProfile";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BlogList from "./pages/Blogs/BlogList";
import BlogDetail from "./pages/Blogs/BlogDetail";
import PaymentSuccess from "./pages/PaymentSuccess";
import JoinDoctor from "./pages/JoinDoctor";
import ScrollToTop from "./components/ScrollToTop";

const LegacyBlogRedirect = () => {
  const { idOrSlug } = useParams();

  return <Navigate replace to={`/blogs/${idOrSlug}`} />;
};

const App = () => {
  return (
    <div className="px-4 sm:px-[2%] w-full max-w-full overflow-x-hidden">
      <ToastContainer />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:speciality" element={<Doctors />} />
        <Route path="/login" element={<Login />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/onboarding" element={<Navigate replace to="/login" />} />
        <Route path="/about" element={<About />} />
        <Route path="/join-doctor" element={<JoinDoctor />} />

        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* Blog route */}
        <Route path="/blogs" element={<BlogList />} />
        <Route path="/blogs/:id" element={<BlogDetail />} />
        <Route path="/blog/:idOrSlug" element={<LegacyBlogRedirect />} />

        <Route path="/contact" element={<Contact />} />

        {/* Protected Routes */}
        <Route
          path="/my-profile"
          element={
            <ProtectedRoute>
              <MyProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-appointments"
          element={
            <ProtectedRoute>
              <MyAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointment/:docId"
          element={
            <ProtectedRoute>
              <Appointment />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ScrollToTop />
      <Footer />
    </div>
  );
};

export default App;
