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
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <h1 className="text-3xl font-bold text-green-600">Payment Successful!</h1>
      <p className="text-gray-600 mt-2">Redirecting you...</p>
    </div>
  );
};

export default PaymentSuccess;
