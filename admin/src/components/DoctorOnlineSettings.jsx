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
    onlineConsultFee: 0,
    isOnlineNow: false,
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
        onlineConsultFee: profileData.onlineConsultFee || 0,
        isOnlineNow: profileData.isOnlineNow || false,
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
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Online Consultation Settings
      </h2>

      {/* Settings Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-gray-700 font-medium">
              Enable Online Consultation
            </label>
            <p className="text-sm text-gray-500">
              Allow patients to request instant video consultations
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
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Online Consultation Fee ({currency})
          </label>
          <input
            type="number"
            value={onlineSettings.onlineConsultFee}
            onChange={(e) =>
              setOnlineSettings((prev) => ({
                ...prev,
                onlineConsultFee: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Average Consultation Duration (minutes)
          </label>
          <select
            value={onlineSettings.averageConsultDuration}
            onChange={(e) =>
              setOnlineSettings((prev) => ({
                ...prev,
                averageConsultDuration: parseInt(e.target.value),
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-gray-700 font-medium">Go Online Now</label>
            <p className="text-sm text-gray-500">
              {onlineSettings.isOnlineNow
                ? "You are visible as 'Available Now' to patients"
                : "Patients cannot see you for online consultations"}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={onlineSettings.isOnlineNow}
              onChange={(e) =>
                setOnlineSettings((prev) => ({
                  ...prev,
                  isOnlineNow: e.target.checked,
                }))
              }
              className="sr-only peer"
              disabled={!onlineSettings.onlineConsultEnabled}
            />
            <div
              className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 ${!onlineSettings.onlineConsultEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
            ></div>
          </label>
        </div>

        <button
          onClick={updateOnlineSettings}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Save Settings
        </button>
      </div>

      {/* Incoming Requests Section */}
      {incomingRequests.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">
            Incoming Consultation Requests ({incomingRequests.length})
          </h3>
          <div className="space-y-2">
            {incomingRequests.map((request, index) => (
              <div
                key={index}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <img
                      src={request.patient?.image || "/default-avatar.png"}
                      alt={request.patient?.name || "Patient"}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        e.target.src =
                          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xMiAxNEM5LjMzIDEzLjk4IDcgMTYuNjQgNyAxOVYyMEgxN1YxOUMxNyAxNi42NCAxNC42NyAxMy45OCAxMiAxNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cjwvc3ZnPgo=";
                      }}
                    />
                    <div>
                      <p className="font-medium text-gray-800">
                        {request.patient?.name || "Unknown Patient"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {currency} {request.fee || 0} • ~
                        {request.durationEstimate || 15} min
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRequestModal(true);
                      }}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition"
                    >
                      View
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Consultation Request
            </h3>

            <div className="flex items-center gap-3 mb-4">
              <img
                src={selectedRequest.patient?.image || "/default-avatar.png"}
                alt={selectedRequest.patient?.name || "Patient"}
                className="w-16 h-16 rounded-full"
                onError={(e) => {
                  e.target.src =
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xMiAxNEM5LjMzIDEzLjk4IDcgMTYuNjQgNyAxOVYyMEgxN1YxOUMxNyAxNi42NCAxNC42NyAxMy45OCAxMiAxNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cjwvc3ZnPgo=";
                }}
              />
              <div>
                <p className="font-medium text-gray-800">
                  {selectedRequest.patient?.name || "Unknown Patient"}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedRequest.patient?.email || "No email provided"}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Consultation Fee:</span>
                  <span className="font-medium">
                    {currency} {selectedRequest.fee}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">
                    ~{selectedRequest.durationEstimate} minutes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Requested:</span>
                  <span className="font-medium">
                    {new Date(selectedRequest.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleRequestResponse("accept")}
                disabled={responding}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {responding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  "Accept & Start Call"
                )}
              </button>
              <button
                onClick={() => handleRequestResponse("reject")}
                disabled={responding}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {responding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  "Reject"
                )}
              </button>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
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
