import React from "react";
import DoctorChatList from "../../components/DoctorChatList";
import { DoctorContext } from "../../context/DoctorContext";
import { useContext } from "react";
import useChatNotifications from "../../hooks/useChatNotifications";

const PatientChats = () => {
  const { dToken } = useContext(DoctorContext);

  
  useChatNotifications(dToken);

  return (
  
    <div className="w-full h-[calc(100vh-70px)] sm:h-[calc(100vh-100px)] flex flex-col p-2 sm:p-5">
      <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {/* We wrap the ChatList in a relative container to ensure its absolute elements (if any) stay contained */}
        <div className="h-full w-full relative">
          <DoctorChatList dToken={dToken} />
        </div>
      </div>
    </div>
  );
};

export default PatientChats;
