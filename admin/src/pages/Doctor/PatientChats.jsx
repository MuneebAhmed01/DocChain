import React from "react";
import DoctorChatList from "../../components/DoctorChatList";
import { DoctorContext } from "../../context/DoctorContext";
import { useContext } from "react";
import useChatNotifications from "../../hooks/useChatNotifications";

const PatientChats = () => {
  const { dToken } = useContext(DoctorContext);

  // Initialize chat notifications for doctors
  useChatNotifications(dToken);

  return (
    <div className="m-4">
      <DoctorChatList dToken={dToken} />
    </div>
  );
};

export default PatientChats;
