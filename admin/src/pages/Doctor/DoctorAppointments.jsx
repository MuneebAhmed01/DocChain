import React, { useContext, useEffect } from "react";
import { DoctorContext } from "../../context/DoctorContext";

const DoctorAppointments = () => {
  const { dToken, appointments, getAppointments } = useContext(DoctorContext);

  useEffect(() => {
    if (dToken) {
      getAppointments();
    }
  }, [dToken]);

  return <div>DoctorAppointments</div>;
};

export default DoctorAppointments;
