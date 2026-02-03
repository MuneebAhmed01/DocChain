import React, { useContext, useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";

const ConsultRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { backendUrl, token } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [jitsiLoaded, setJitsiLoaded] = useState(false);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    validateRoomAccess();
    loadJitsiScript();
  }, [roomId]);

  const loadJitsiScript = () => {
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => {
      setJitsiLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  };

  const validateRoomAccess = async () => {
    try {
      const { data } = await axiosInstance.get(
        `${backendUrl}/api/online-consult/${roomId}/validate`,
        { headers: { token } },
      );

      if (data.success) {
        setSessionInfo(data.session);
        setLoading(false);
      } else {
        setError(data.message || "Access denied");
        setLoading(false);
      }
    } catch (error) {
      console.error("Room validation error:", error);
      setError(
        error.response?.data?.message || "Failed to validate room access",
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jitsiLoaded && sessionInfo && jitsiContainerRef.current) {
      initializeJitsi();
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, [jitsiLoaded, sessionInfo]);

  const initializeJitsi = () => {
    const domain = "meet.jit.si";
    const options = {
      roomName: roomId,
      width: "100%",
      height: "100%",
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        prejoinPageEnabled: false,
        startWithAudioMuted: true,
        startWithVideoMuted: true,
        enableClosePage: false,
        hideConferenceSubject: true,
        disableInitialGUM: false,
        enableFeaturesBasedOnToken: true,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          "microphone",
          "camera",
          "closedcaptions",
          "desktop",
          "fullscreen",
          "fodeviceselection",
          "hangup",
          "profile",
          "info",
          "chat",
          "recording",
          "livestreaming",
          "etherpad",
          "sharedvideo",
          "settings",
          "raisehand",
          "videoquality",
          "filmstrip",
          "invite",
          "feedback",
          "stats",
          "shortcuts",
          "tileview",
          "videobackgroundblur",
          "download",
          "help",
          "mute-everyone",
          "e2ee",
        ],
        SETTINGS_SECTIONS: ["devices", "language", "profile", "moderator"],
        SHOW_CHROME_EXTENSION_BANNER: false,
      },
      userInfo: {
        displayName: sessionInfo.userRole === "doctor" ? "Doctor" : "Patient",
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    jitsiApiRef.current = api;

    api.addEventListener("videoConferenceJoined", () => {
      console.log("Video conference joined");
      toast.success("Connected to consultation room");
    });

    api.addEventListener("participantLeft", () => {
      console.log("Participant left");
      // Handle participant leaving logic
    });

    api.addEventListener("readyToClose", () => {
      console.log("Ready to close");
      handleEndConsultation();
    });
  };

  const handleEndConsultation = () => {
    // Navigate back after consultation ends
    if (sessionInfo?.userRole === "patient") {
      navigate("/my-appointments");
    } else {
      navigate("/doctor-appointments");
    }
  };

  const handleLeaveRoom = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand("hangup");
    } else {
      handleEndConsultation();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating consultation room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-800">
            Online Consultation Room
          </h1>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
            {sessionInfo?.userRole === "doctor" ? "Doctor" : "Patient"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Room: <span className="font-mono">{roomId}</span>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-2"
          >
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Leave Room
          </button>
        </div>
      </div>

      {/* Jitsi Container */}
      <div className="flex-1 relative">
        {!jitsiLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-white">Loading video conference...</p>
            </div>
          </div>
        ) : (
          <div
            ref={jitsiContainerRef}
            className="w-full h-full"
            style={{ height: "calc(100vh - 80px)" }}
          />
        )}
      </div>

      {/* Instructions Overlay */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded-lg max-w-xs">
        <p className="text-sm">
          <strong>Instructions:</strong>
        </p>
        <ul className="text-xs mt-1 space-y-1">
          <li>• Allow camera and microphone access when prompted</li>
          <li>• Use the toolbar to control audio/video</li>
          <li>• Click "Leave Room" to end consultation</li>
        </ul>
      </div>
    </div>
  );
};

export default ConsultRoom;
