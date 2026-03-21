import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import { toast } from "react-toastify";

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const navigate = useNavigate();

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
        toast.success("Payment successful!");
      } else {
        toast.error("Payment verification failed.");
      }
    } catch (err) {
      toast.error("Error verifying payment.");
      console.log(err);
    }

    setTimeout(() => navigate("/my-appointments"), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8 md:p-10 text-center max-w-md w-full">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mt-3 text-sm sm:text-base md:text-lg">
          Redirecting you...
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;