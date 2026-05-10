import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { useContext } from "react";

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const paymentType = params.get("payment_type");
  const doctorId = params.get("doc_id");
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying your payment...");
  const { getDoctorsData } = useContext(AppContext);

  const [isVerifying, setIsVerifying] = useState(true);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Start 30s timeout
    timeoutRef.current = setTimeout(() => {
      if (isVerifying) {
        setIsTimedOut(true);
        setIsVerifying(false);
        setMessage("Verification timed out. Please check your appointments later.");
        toast.error("Payment verification is taking longer than expected.");
      }
    }, 30000);

    if (sessionId) {
      verifyPayment();
    } else {
      setIsVerifying(false);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const verifyEndpoint =
        paymentType === "TOKEN"
          ? "/api/stripe/verify-token-payment"
          : "/api/stripe/verify-payment";

      const payload = { sessionId };

      const { data } = await axiosInstance.post(
        verifyEndpoint,
        payload
      );

      if (data.success) {
        setMessage(data.message || "Payment successful!");
        toast.success(data.message || "Payment successful!");
        getDoctorsData();
        if (doctorId) {
          localStorage.removeItem(`appointmentSelection:${doctorId}`);
        }
      } else {
        setMessage(data.message || "Payment verification failed.");
        toast.error(data.message || "Payment verification failed.");
      }
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message || "Error verifying payment.";
      setMessage(apiMessage);
      toast.error(apiMessage);
      console.log(err);
    } finally {
      setIsVerifying(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }

    setTimeout(() => navigate("/my-appointments"), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
      {/* Navigation Block Overlay */}
      {isVerifying && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full mb-4"></div>
          <p className="text-lg font-semibold">Verifying payment, please wait...</p>
          <p className="text-sm opacity-80 mt-2">Do not refresh or leave this page</p>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8 md:p-10 text-center max-w-md w-full">
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold ${isTimedOut ? "text-red-600" : "text-green-600"}`}>
          {isTimedOut ? "Verification Delayed" : (paymentType === "TOKEN" ? "Token Payment Received" : "Payment Successful")}
        </h1>
        <p className="text-gray-600 mt-3 text-sm sm:text-base md:text-lg">
          {message}
        </p>
        {!isVerifying && (
          <button
            onClick={() => navigate("/my-appointments")}
            className="mt-6 w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to My Appointments
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;