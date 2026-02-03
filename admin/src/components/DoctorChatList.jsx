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
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Patient Chats</h2>
        {getTotalUnreadCount() > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {getTotalUnreadCount()} unread
          </span>
        )}
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
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
          <p className="text-gray-500">No patient conversations yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Patients will appear here when they start chatting
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => openChat(chat)}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <img
                    src={chat.patientImage || "/default-avatar.png"}
                    alt={chat.patientName}
                    className="w-12 h-12 rounded-full object-cover bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {chat.patientName}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatTime(chat.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {chat.slotDate} • {chat.slotTime}
                    </p>
                    <div className="mt-2">
                      <p className="text-sm text-gray-700 truncate">
                        {chat.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </div>
                {chat.unreadCount > 0 && (
                  <div className="ml-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs rounded-full">
                      {chat.unreadCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
