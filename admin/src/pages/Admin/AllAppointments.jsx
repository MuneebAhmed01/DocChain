import React, { useContext, useEffect } from "react";
import { AdminContext } from "../../context/AdminContext";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";

const AllAppointments = () => {
  const { aToken, appointments, getAllAppointments, cancelAppointment } = useContext(AdminContext);
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext);

  useEffect(() => {
    if (aToken) {
      getAllAppointments();
    }
  }, [aToken]);

  return (
    <div className="w-full m-2 sm:m-5 ">
      <p className="mb-3 text-lg font-medium">All Appointments</p>

      <div className="bg-white border rounded text-sm max-h-[80vh] min-h-[50vh] overflow-y-auto">
        
        {/* Header: Desktop Only */}
        <div className="hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] grid-flow-col py-3 px-6 border-b bg-gray-50">
          <p>#</p>
          <p>Patient</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Doctor</p>
          <p>Fees</p>
          <p>Actions</p>
        </div>

        {appointments.map((item, index) => (
          <div
            className="flex flex-col sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50 gap-3 sm:gap-0"
            key={index}
          >
            {/* 1. Index: Hidden on very small screens, visible on Desktop */}
            <p className="hidden sm:block">{index + 1}</p>
            
            {/* 2. Patient: Always Visible */}
            <div className="flex items-center gap-2 w-full">
              <img className="w-8 rounded-full" src={item.userData.image} alt="" />
              <p className="text-gray-800 font-medium sm:font-normal">{item.userData.name}</p>
            </div>

            {/* 3. Age: Desktop Only (or labeled for mobile) */}
            <p className="hidden sm:block">{calculateAge(item.userData.dob)}</p>

            {/* 4. Date & Time: Always Visible */}
            <div className="w-full">
               <span className="sm:hidden text-xs font-bold text-gray-400 block">Date & Time: </span>
               <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
            </div>

            {/* 5. Doctor: Always Visible */}
            <div className="flex items-center gap-2 w-full">
               <span className="sm:hidden text-xs font-bold text-gray-400 block">Doctor: </span>
               <img className="w-8 rounded-full bg-gray-200" src={item.docData.image} alt="" />
               <p>{item.docData.name}</p>
            </div>

            {/* 6. Fees: Always Visible */}
            <div className="w-full">
               <span className="sm:hidden text-xs font-bold text-gray-400">Fees: </span>
               <span>{currency}{item.amount}</span>
            </div>

            {/* 7. Actions: Always Visible */}
            <div className="w-full flex justify-end sm:justify-start">
              {item.cancelled ? (
                <p className="text-red-400 text-xs font-medium">Cancelled</p>
              ) : item.isCompleted ? (
                <p className="text-green-500 text-xs font-medium">Completed</p>
              ) : (
                <img
                  onClick={() => cancelAppointment(item._id)}
                  className="w-10 cursor-pointer"
                  src={assets.cancel_icon}
                  alt=""
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllAppointments;
