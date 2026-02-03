import React, { useContext, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";

const OnlineConsultSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { backendUrl, token } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);

  const sessionId = searchParams.get("session_id");
  const doctorId = searchParams.get("doctor_id");

  useEffect(() => {
    if (!sessionId || !doctorId) {
      setError("Missing payment information");
      setLoading(false);
      return;
    }

    verifyPaymentAndCreateSession();
  }, [sessionId, doctorId]);

  const verifyPaymentAndCreateSession = async () => {
    try {
      const { data } = await axiosInstance.post(
        `${backendUrl}/api/stripe/verify-online-consult-payment`,
        {
          sessionId,
          doctorId,
        },
        { headers: { token } },
      );

      if (data.success) {
        setSessionData({
          sessionId: data.sessionId,
          roomId: data.roomId,
        });
        toast.success("Payment successful! Waiting for doctor to accept...");
      } else {
        setError(data.message || "Failed to create consultation session");
      }
    } catch (error) {
      console.error("Session creation error:", error);
      setError(
        error.response?.data?.message ||
          "Failed to create consultation session",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoToWaitingRoom = () => {
    if (sessionData) {
      navigate(`/consult-waiting/${sessionData.roomId}`);
    }
  };

  const handleGoBack = () => {
    navigate("/online-consulting");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Processing your consultation request...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Payment Failed
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleGoBack}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
        <div className="text-green-500 text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Payment Successful!
        </h2>
        <p className="text-gray-600 mb-6">
          Your consultation request has been sent to the doctor. You'll be
          notified once they accept.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleGoToWaitingRoom}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
          >
            Go to Waiting Room
          </button>

          <button
            onClick={handleGoBack}
            className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
          >
            Browse Other Doctors
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>What happens next?</strong>
          </p>
          <ul className="text-xs text-blue-700 mt-2 text-left space-y-1">
            <li>• Doctor will receive your consultation request</li>
            <li>• You'll be notified when doctor accepts</li>
            <li>• Video call will start automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OnlineConsultSuccess;
