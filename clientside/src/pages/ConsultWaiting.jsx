import React, { useContext, useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";
import { io } from "socket.io-client";

const ConsultWaiting = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { backendUrl, token } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [doctorAccepted, setDoctorAccepted] = useState(false);
  const [doctorRejected, setDoctorRejected] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchSessionData();
    initializeSocket();

    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId]);

  const fetchSessionData = async () => {
    try {
      const { data } = await axiosInstance.get(
        `${backendUrl}/api/online-consult/my-sessions`,
        { headers: { token } },
      );

      const currentSession = data.sessions.find(
        (session) => session.roomId === roomId,
      );
      if (currentSession) {
        setSessionData(currentSession);

        if (currentSession.status === "accepted") {
          setDoctorAccepted(true);
          // Don't auto-redirect, let patient click the join button
        } else if (currentSession.status === "rejected") {
          setDoctorRejected(true);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch session data:", error);
      setLoading(false);
    }
  };

  const initializeSocket = () => {
    const socket = io(backendUrl, {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to socket server");
      socket.emit("join-consult-room", roomId);
    });

    socket.on("patient:consult_response", (data) => {
      if (data.roomId === roomId) {
        if (data.action === "accept") {
          setDoctorAccepted(true);
          toast.success(
            `Dr. ${data.doctor.name} has accepted your consultation!`,
          );
          // Don't auto-redirect, let patient click the join button
        } else if (data.action === "reject") {
          setDoctorRejected(true);
          toast.error(`Dr. ${data.doctor.name} is currently unavailable`);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCancelRequest = async () => {
    try {
      await axiosInstance.post(
        `${backendUrl}/api/online-consult/cancel`,
        { roomId },
        { headers: { token } },
      );
      toast.info("Consultation request cancelled");
      navigate("/online-consulting");
    } catch (error) {
      console.error("Failed to cancel request:", error);
      toast.error("Failed to cancel request");
    }
  };

  const handleGoBack = () => {
    navigate("/online-consulting");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading consultation room...</p>
        </div>
      </div>
    );
  }

  if (doctorRejected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Consultation Rejected
          </h2>
          <p className="text-gray-600 mb-6">
            The doctor is currently unavailable. Your payment will be refunded.
          </p>
          <button
            onClick={handleGoBack}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Find Another Doctor
          </button>
        </div>
      </div>
    );
  }

  if (doctorAccepted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-green-500 text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Consultation Accepted!
          </h2>
          <p className="text-gray-600 mb-6">
            Redirecting you to the video consultation room...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4">
        {/* Doctor Info */}
        {sessionData?.doctorId && (
          <div className="mb-6">
            <img
              src={sessionData.doctorId.image}
              alt={sessionData.doctorId.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-blue-200"
            />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Dr. {sessionData.doctorId.name}
            </h2>
            <p className="text-gray-600">{sessionData.doctorId.speciality}</p>
          </div>
        )}

        {/* Waiting Status */}
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              {doctorAccepted ? (
                <>
                  <div className="animate-pulse absolute inline-flex h-16 w-16 rounded-full bg-green-400 opacity-75"></div>
                  <div className="relative inline-flex rounded-full h-16 w-16 bg-green-500 items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </>
              ) : (
                <>
                  <div className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-blue-400 opacity-75"></div>
                  <div className="relative inline-flex rounded-full h-16 w-16 bg-blue-500 items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </>
              )}
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {doctorAccepted ? "Doctor Accepted!" : "Waiting for Doctor"}
          </h3>
          <p className="text-gray-600">
            {doctorAccepted
              ? `Dr. ${sessionData?.doctorId?.name || "Your doctor"} has accepted your consultation! Click below to join the video call.`
              : "Your consultation request has been sent. Please wait for the doctor to accept."}
          </p>
        </div>

        {/* Timer */}
        <div className="mb-8">
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Time elapsed</p>
            <p className="text-2xl font-mono font-bold text-blue-600">
              {formatTime(timeElapsed)}
            </p>
          </div>
        </div>

        {/* Consultation Details */}
        <div className="mb-8 text-left bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">
            Consultation Details
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Room ID:</span>
              <span className="font-mono text-gray-800">{roomId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="text-gray-800">
                ~{sessionData?.durationEstimate || 15} minutes
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fee:</span>
              <span className="text-gray-800">${sessionData?.fee || 0}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate(`/consult-room/${roomId}`)}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
          >
            {doctorAccepted ? (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Join Video Call
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Try Joining Video Room
              </>
            )}
          </button>

          <button
            onClick={handleCancelRequest}
            className="w-full bg-red-100 text-red-700 px-6 py-3 rounded-lg hover:bg-red-200 transition font-medium"
          >
            Cancel Request
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-xs text-gray-500">
          <p>
            If the doctor doesn't respond within 30 minutes, the request will
            automatically expire.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConsultWaiting;
