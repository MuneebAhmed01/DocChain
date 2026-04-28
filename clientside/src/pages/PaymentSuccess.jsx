import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import { toast } from "react-toastify";

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const paymentType = params.get("payment_type");
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const { data } = await axiosInstance.post(
        "/api/stripe/verify-payment",
        { sessionId }
      );

      if (data.success) {
        setMessage(data.message || "Payment successful!");
        toast.success(data.message || "Payment successful!");
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
    }

    setTimeout(() => navigate("/my-appointments"), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8 md:p-10 text-center max-w-md w-full">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600">
          {paymentType === "TOKEN" ? "Token Payment Received" : "Payment Successful"}
        </h1>
        <p className="text-gray-600 mt-3 text-sm sm:text-base md:text-lg">
          {message}
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;