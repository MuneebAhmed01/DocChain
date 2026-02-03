import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import DoctorChatWindow from "./DoctorChatWindow";

const DoctorChatList = ({ dToken }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showChatWindow, setShowChatWindow] = useState(false);

  useEffect(() => {
    if (dToken) {
      fetchDoctorChats();
    }
  }, [dToken]);

  const fetchDoctorChats = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        "http://localhost:4000/api/chat/doctor-chats",
        {
          headers: {
            dToken: dToken,
          },
        },
      );

      if (data.success) {
        setChats(data.chats);
      } else {
        toast.error("Failed to fetch chats");
      }
    } catch (error) {
      console.error("Error fetching doctor chats:", error);
      toast.error("Failed to fetch chats");
    } finally {
      setLoading(false);
    }
  };

  const openChat = (chat) => {
    setSelectedChat(chat);
    setShowChatWindow(true);
  };

  const closeChatWindow = () => {
    setShowChatWindow(false);
    setSelectedChat(null);
    // Refresh chat list to update unread counts
    fetchDoctorChats();
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getTotalUnreadCount = () => {
    return chats.reduce((total, chat) => total + chat.unreadCount, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          {getTotalUnreadCount() > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              {getTotalUnreadCount()}
            </span>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
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
            <p className="text-gray-500 font-medium">No conversations yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Patients will appear here when they message you
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {chats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => openChat(chat)}
                className={`relative hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedChat?._id === chat._id ? "bg-blue-50" : ""
                }`}
              >
                <div className="px-4 py-3">
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={chat.patientImage || "/default-avatar.png"}
                        alt={chat.patientName}
                        className="w-12 h-12 rounded-full object-cover bg-gray-200 ring-2 ring-white"
                      />
                      {chat.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
                          <span className="text-white text-xs font-medium">
                            {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3
                          className={`font-semibold text-gray-900 truncate ${
                            chat.unreadCount > 0 ? "font-bold" : ""
                          }`}
                        >
                          {chat.patientName}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTime(chat.lastMessageTime)}
                        </span>
                      </div>

                      {/* Appointment info */}
                      <p className="text-xs text-gray-500 mb-1">
                        {chat.slotDate} • {chat.slotTime}
                      </p>

                      {/* Last message */}
                      <div className="flex items-center">
                        <p
                          className={`text-sm truncate ${
                            chat.unreadCount > 0
                              ? "text-gray-900 font-medium"
                              : "text-gray-600"
                          }`}
                        >
                          {chat.lastMessage || "Start a conversation"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unread indicator line */}
                {chat.unreadCount > 0 && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Window */}
      {showChatWindow && selectedChat && (
        <DoctorChatWindow
          appointmentId={selectedChat.appointmentId}
          patientName={selectedChat.patientName}
          patientImage={selectedChat.patientImage}
          onClose={closeChatWindow}
          dToken={dToken}
        />
      )}
    </div>
  );
};

export default DoctorChatList;
