import React, { useContext, useEffect, useState } from "react";
import { DoctorContext } from "../context/DoctorContext";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

const DoctorOnlineSettings = ({
  profileData,
  setProfileData,
  getProfileData,
}) => {
  const { dToken, backendUrl } = useContext(DoctorContext);
  const { currency } = useContext(AppContext);

  const [onlineSettings, setOnlineSettings] = useState({
    onlineConsultEnabled: false,
    averageConsultDuration: 15,
  });

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [socket, setSocket] = useState(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (profileData) {
      setOnlineSettings({
        onlineConsultEnabled: profileData.onlineConsultEnabled || false,
        averageConsultDuration: profileData.averageConsultDuration || 15,
      });
    }
  }, [profileData]);

  useEffect(() => {
    if (dToken && !socket) {
      initializeSocket();
      fetchIncomingRequests();
    }

    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    };
  }, [dToken]);

  const initializeSocket = () => {
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(backendUrl, {
      auth: { token: dToken },
    });

    newSocket.on("connect", () => {
      console.log("Doctor connected to socket");
    });

    newSocket.on(`doctor:${profileData?._id}:incoming_consult`, (data) => {
      console.log("Incoming consult request:", data);

      // Check if this request already exists to prevent duplicates
      setIncomingRequests((prev) => {
        const exists = prev.find((req) => req.sessionId === data.sessionId);
        if (!exists) {
          return [data, ...prev];
        }
        return prev;
      });

      setShowRequestModal(true);
      setSelectedRequest(data);
      toast.info(`New consultation request from ${data.patient.name}`);
    });

    newSocket.on("disconnect", () => {
      console.log("Doctor disconnected from socket");
    });

    setSocket(newSocket);
  };

  const fetchIncomingRequests = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/online-consult/doctor-sessions`,
        { headers: { dToken } },
      );

      if (data.success) {
        const pendingRequests = data.sessions.filter(
          (session) => session.status === "pending_doctor_accept",
        );
        setIncomingRequests(pendingRequests);
      }
    } catch (error) {
      console.error("Failed to fetch incoming requests:", error);
    }
  };

  const updateOnlineSettings = async () => {
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/online-consult/doctor-settings`,
        onlineSettings,
        { headers: { dToken } },
      );

      if (data.success) {
        toast.success("Online consultation settings updated successfully");
        getProfileData(); // Refresh profile data
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update settings");
    }
  };

  const handleRequestResponse = async (action) => {
    if (!selectedRequest || responding) return;

    setResponding(true);

    try {
      console.log("Sending doctor response:", {
        sessionId: selectedRequest.sessionId,
        action,
      });

      const { data } = await axios.post(
        `${backendUrl}/api/online-consult/respond`,
        {
          sessionId: selectedRequest.sessionId,
          action,
        },
        { headers: { dToken } },
      );

      console.log("Doctor response received:", data);

      if (data.success) {
        toast.success(`Consultation ${action}ed successfully`);

        if (action === "accept") {
          // Redirect to consultation room in client app
          const clientUrl =
            import.meta.env.VITE_CLIENT_URL || "http://localhost:5173";
          window.open(
            `${clientUrl}/consult-room/${selectedRequest.roomId}`,
            "_blank",
          );
        }

        // Remove request from list
        setIncomingRequests((prev) =>
          prev.filter((req) => req.sessionId !== selectedRequest.sessionId),
        );
        setShowRequestModal(false);
        setSelectedRequest(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Doctor response error:", error);
      toast.error(
        error.response?.data?.message || "Failed to respond to request",
      );
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 sm:p-8 rounded-2xl shadow-lg border border-blue-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white"
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
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Consultation Settings
          </h2>
          <p className="text-sm text-gray-600">
            Manage your video consultation preferences
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-gray-800 font-semibold text-lg flex items-center gap-2">
                <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-green-600"
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
                </span>
                Enable Online Consultation
              </label>
              <p className="text-sm text-gray-600 mt-2 ml-10">
                Allow patients to request Online video consultations
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={onlineSettings.onlineConsultEnabled}
                onChange={(e) =>
                  setOnlineSettings((prev) => ({
                    ...prev,
                    onlineConsultEnabled: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600 shadow-inner"></div>
            </label>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <label className="text-gray-800 font-semibold text-lg flex items-center gap-2 mb-4">
            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            Average Consultation Duration
          </label>
          <select
            value={onlineSettings.averageConsultDuration}
            onChange={(e) =>
              setOnlineSettings((prev) => ({
                ...prev,
                averageConsultDuration: parseInt(e.target.value),
              }))
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium"
          >
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>

        <button
          onClick={updateOnlineSettings}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
        >
          Save Settings
        </button>
      </div>

      {/* Incoming Requests Section */}
      {incomingRequests.length > 0 && (
        <div className="mt-8 pt-8 border-t border-blue-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                Incoming Requests ({incomingRequests.length})
              </h3>
              <p className="text-sm text-gray-600">
                New consultation requests from patients
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {incomingRequests.map((request, index) => (
              <div
                key={index}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={request.patient?.image || "/default-avatar.png"}
                        alt={request.patient?.name || "Patient"}
                        className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                        onError={(e) => {
                          e.target.src =
                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xMiAxNEM5LjMzIDEzLjk4IDcgMTYuNjQgNyAxOVYyMEgxN1YxOUMxNyAxNi42NCAxNC42NyAxMy45OCAxMiAxNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cjwvc3ZnPgo=";
                        }}
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-lg">
                        {request.patient?.name || "Unknown Patient"}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                            />
                          </svg>
                          {currency} {request.fee || 0}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          ~{request.durationEstimate || 15} min
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRequestModal(true);
                      }}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-green-600 hover:to-green-700 transition shadow-md hover:shadow-lg"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl transform transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  Consultation Request
                </h3>
                <p className="text-sm text-gray-600">
                  Patient is waiting for your response
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <img
                    src={
                      selectedRequest.patient?.image || "/default-avatar.png"
                    }
                    alt={selectedRequest.patient?.name || "Patient"}
                    className="w-16 h-16 rounded-full border-3 border-white shadow-lg"
                    onError={(e) => {
                      e.target.src =
                        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xMiAxNEM5LjMzIDEzLjk4IDcgMTYuNjQgNyAxOVYyMEgxN1YxOUMxNyAxNi42NCAxNC42NyAxMy45OCAxMiAxNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cjwvc3ZnPgo=";
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-lg">
                    {selectedRequest.patient?.name || "Unknown Patient"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.patient?.email || "No email provided"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-gray-600 text-sm font-medium flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                    Consultation Fee
                  </span>
                  <span className="font-bold text-green-600 text-lg">
                    {currency} {selectedRequest.fee}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-gray-600 text-sm font-medium flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Duration
                  </span>
                  <span className="font-bold text-blue-600">
                    ~{selectedRequest.durationEstimate} minutes
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-gray-600 text-sm font-medium flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Requested
                  </span>
                  <span className="font-bold text-purple-600 text-sm">
                    {new Date(selectedRequest.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleRequestResponse("accept")}
                disabled={responding}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {responding ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Accept & Start Call
                  </>
                )}
              </button>
              <button
                onClick={() => handleRequestResponse("reject")}
                disabled={responding}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {responding ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Reject
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setSelectedRequest(null);
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorOnlineSettings;
