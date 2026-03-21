import React, { useContext, useEffect } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";

const DoctorAppointments = () => {
  const {
    dToken,
    appointments,
    getAppointments,
    completeAppointment,
    cancelAppointment,
  } = useContext(DoctorContext);

  const { calculateAge, slotDateFormat, currency } = useContext(AppContext);

  useEffect(() => {
    if (dToken) {
      getAppointments();
    }
  }, [dToken]);

  return (
    <div className="w-full max-w-6xl m-2 sm:m-5">
      <p className="mb-3 text-lg font-medium text-gray-800">All Appointments</p>

      <div className="bg-white border rounded-xl text-sm overflow-hidden shadow-sm">
        {/* Desktop Header: Hidden on mobile */}
        <div className="hidden sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 py-3 px-6 border-b bg-gray-50 font-semibold text-gray-600">
          <p>#</p>
          <p>Patient</p>
          <p>Payment</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Fees</p>
          <p className="text-center">Action</p>
        </div>

        {/* Appointment Rows/Cards */}
        <div className="max-h-[80vh] overflow-y-auto">
          {[...appointments].reverse().map((item, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 sm:grid sm:grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] sm:gap-1 sm:items-center text-gray-500 py-4 px-6 border-b hover:bg-gray-50 transition-colors"
            >
              {/* Index & Patient Header (Mobile Only) */}
              <div className="sm:hidden flex justify-between items-center border-b pb-2">
                <span className="font-bold text-gray-400">#{index + 1}</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    item.isPaid ? "bg-green-100 text-green-700" : "bg-blue-100 text-primary"
                  }`}>
                  {item.isPaid ? "Paid" : item.payment ? "Online" : "CASH"}
                </span>
              </div>

              {/* Patient Info */}
              <div className="flex items-center gap-3">
                <img
                  className="w-10 h-10 sm:w-8 sm:h-8 rounded-full object-cover border"
                  src={item.userData.image}
                  alt="Patient"
                />
                <div>
                  <p className="text-gray-900 font-semibold sm:font-medium">{item.userData.name}</p>
                  <p className="sm:hidden text-xs text-gray-400">Age: {calculateAge(item.userData.dob)}</p>
                </div>
              </div>

              {/* Payment (Desktop Only) */}
              <div className="hidden sm:block">
                <p className={`text-xs inline border px-2 rounded-full ${
                    item.isPaid ? "border-green-500 text-green-500" : "border-primary text-gray-500"
                  }`}>
                  {item.isPaid ? "Paid" : item.payment ? "Online" : "CASH"}
                </p>
              </div>

              {/* Age (Desktop Only) */}
              <p className="hidden sm:block">{calculateAge(item.userData.dob)}</p>

              {/* Date & Time */}
              <div className="flex justify-between sm:block text-xs sm:text-sm">
                <span className="sm:hidden font-medium text-gray-400">Schedule:</span>
                <p className="text-gray-700 sm:text-gray-500">
                  {slotDateFormat(item.slotDate)}, {item.slotTime}
                </p>
              </div>

              {/* Fees */}
              <div className="flex justify-between sm:block text-xs sm:text-sm">
                <span className="sm:hidden font-medium text-gray-400">Consultation Fee:</span>
                <p className="text-gray-900 sm:text-gray-500 font-medium">
                  {currency}{item.amount}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end sm:justify-center pt-2 sm:pt-0">
                {item.cancelled ? (
                  <p className="text-red-400 text-xs font-bold uppercase tracking-wider">Cancelled</p>
                ) : item.isCompleted ? (
                  <p className="text-green-500 text-xs font-bold uppercase tracking-wider">Completed</p>
                ) : (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => cancelAppointment(item._id)} 
                      className="hover:scale-110 transition-transform p-1 hover:bg-red-50 rounded-full"
                    >
                      <img className="w-8 sm:w-10" src={assets.cancel_icon} alt="Cancel" />
                    </button>
                    <button 
                      onClick={() => completeAppointment(item._id)}
                      className="hover:scale-110 transition-transform p-1 hover:bg-green-50 rounded-full"
                    >
                      <img className="w-8 sm:w-10" src={assets.tick_icon} alt="Complete" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoctorAppointments;
