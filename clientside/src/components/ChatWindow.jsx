import React, { useState, useEffect, useRef, useContext } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";

const ChatWindow = ({ appointmentId, doctorName, doctorImage, onClose }) => {
  // Extract userId from JWT token since AppContext doesn't provide it
  const token = localStorage.getItem("token");
  let userId = null;
  if (token) {
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      userId = decoded.userId;
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  }
  console.log("ChatWindow mounted with userId:", userId);
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
    const token = localStorage.getItem("token");
    if (!token) return;

    const newSocket = io("http://localhost:4000", {
      auth: {
        token: token,
      },
    });

    newSocket.on("connect", () => {
      console.log("Connected to chat server");
      newSocket.emit("join-room", appointmentId);
    });

    newSocket.on("joined-room", (data) => {
      console.log("Joined room:", data);
      loadChatHistory();
    });

    newSocket.on("new-message", (messageData) => {
      setMessages((prev) => [...prev, messageData]);
      scrollToBottom();

      // Show toast notification for patient when doctor replies
      if (
        messageData.senderType === "doctor" &&
        messageData.receiverType === "patient"
      ) {
        toast.info(
          `New message from Dr. ${doctorName}: ${messageData.message.substring(0, 50)}${messageData.message.length > 50 ? "..." : ""}`,
          {
            autoClose: 5000,
            position: "top-right",
            closeButton: true,
          },
        );
      }
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
  }, [appointmentId]);

  const loadChatHistory = async () => {
    try {
      console.log("Loading chat history for appointment:", appointmentId);
      const { data } = await axiosInstance.get(
        `/api/chat/patient-history/${appointmentId}`,
      );
      console.log("Chat history response:", data);

      if (data.success) {
        setMessages(data.messages);
        scrollToBottom();
        // Mark messages as read
        if (data.messages.length > 0) {
          await axiosInstance.put("/api/chat/mark-read", { appointmentId });
        }
      } else {
        console.error("Chat history failed:", data.message);
        toast.error(data.message || "Failed to load chat history");
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to load chat history";
      toast.error(errorMessage);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    socket.emit("send-message", {
      appointmentId,
      message: newMessage.trim(),
      messageType: "text",
    });

    setNewMessage("");
    socket.emit("stop-typing", appointmentId);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      socket?.emit("typing", appointmentId);
    }

    if (e.target.value.length === 0) {
      setIsTyping(false);
      socket?.emit("stop-typing", appointmentId);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await axiosInstance.post(
        "/api/chat/upload-file",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (data.success) {
        socket?.emit("send-message", {
          appointmentId,
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
    const isFromCurrentUser =
      message.senderType === "patient" && message.senderId === userId;
    console.log("Message Debug:", {
      messageId: message._id,
      messageSenderType: message.senderType,
      messageSenderId: message.senderId,
      currentUserId: userId,
      isMatch: message.senderId === userId,
      isPatientType: message.senderType === "patient",
      finalResult: isFromCurrentUser,
    });
    return isFromCurrentUser;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <img
              src={doctorImage}
              alt={doctorName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold">{doctorName}</h3>
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

export default ChatWindow;
