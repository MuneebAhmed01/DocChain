import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import axios from "axios";

const DoctorChatWindow = ({
  appointmentId,
  patientName,
  patientImage,
  onClose,
  dToken,
}) => {
  // Convert appointmentId to string if it's an object
  const appointmentIdStr =
    typeof appointmentId === "object"
      ? appointmentId._id || appointmentId.toString()
      : appointmentId;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!dToken) return;

    const newSocket = io("http://localhost:4000", {
      auth: {
        token: dToken,
      },
    });

    newSocket.on("connect", () => {
      console.log("Doctor connected to chat server");
      newSocket.emit("join-room", appointmentIdStr);
    });

    newSocket.on("joined-room", (data) => {
      console.log("Doctor joined room:", data);
      loadChatHistory();
    });

    newSocket.on("new-message", (messageData) => {
      setMessages((prev) => [...prev, messageData]);
      scrollToBottom();
    });

    newSocket.on("user-typing", () => {
      setOtherUserTyping(true);
    });

    newSocket.on("user-stop-typing", () => {
      setOtherUserTyping(false);
    });

    newSocket.on("error", (error) => {
      toast.error(error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [appointmentIdStr, dToken]);

  const loadChatHistory = async () => {
    try {
      const { data } = await axios.get(
        `http://localhost:4000/api/chat/patient-history/${appointmentIdStr}`,
        {
          headers: {
            dToken: dToken,
          },
        },
      );

      if (data.success) {
        setMessages(data.messages);
        scrollToBottom();
        // Mark messages as read
        if (data.messages.length > 0) {
          await axios.put(
            "http://localhost:4000/api/chat/mark-read",
            { appointmentId: appointmentIdStr },
            {
              headers: {
                dToken: dToken,
              },
            },
          );
        }
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      toast.error("Failed to load chat history");
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    socket.emit("send-message", {
      appointmentId: appointmentIdStr,
      message: newMessage.trim(),
      messageType: "text",
    });

    setNewMessage("");
    socket.emit("stop-typing", appointmentIdStr);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      socket?.emit("typing", appointmentIdStr);
    }

    if (e.target.value.length === 0) {
      setIsTyping(false);
      socket?.emit("stop-typing", appointmentIdStr);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await axios.post(
        "http://localhost:4000/api/chat/upload-file",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            dToken: dToken,
          },
        },
      );

      if (data.success) {
        socket?.emit("send-message", {
          appointmentId: appointmentIdStr,
          message: `Shared a file: ${data.fileName}`,
          messageType: data.fileType.startsWith("image/")
            ? "image"
            : "document",
          fileUrl: data.fileUrl,
          fileName: data.fileName,
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isMessageFromCurrentUser = (message) => {
    return message.senderType === "doctor";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <img
              src={patientImage}
              alt={patientName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold">{patientName}</h3>
              <p className="text-sm text-gray-500">
                {otherUserTyping ? "Typing..." : "Online"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
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
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${isMessageFromCurrentUser(message) ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isMessageFromCurrentUser(message)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {message.messageType === "image" && message.fileUrl ? (
                  <div>
                    <p className="text-sm mb-2">{message.message}</p>
                    <img
                      src={message.fileUrl}
                      alt="Shared image"
                      className="rounded cursor-pointer"
                      onClick={() => window.open(message.fileUrl, "_blank")}
                    />
                  </div>
                ) : message.messageType === "document" && message.fileUrl ? (
                  <div>
                    <p className="text-sm mb-2">{message.message}</p>
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      📄 {message.fileName}
                    </a>
                  </div>
                ) : (
                  <p>{message.message}</p>
                )}
                <p
                  className={`text-xs mt-1 ${
                    isMessageFromCurrentUser(message)
                      ? "text-blue-100"
                      : "text-gray-500"
                  }`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))}
          {otherUserTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              {uploadingFile ? (
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              ) : (
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
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              )}
            </label>
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
            >
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorChatWindow;
