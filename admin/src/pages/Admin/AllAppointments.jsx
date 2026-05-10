import React, { useContext, useEffect, useRef, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 inline-block text-red-500" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
  </svg>
);

const AllAppointments = () => {
  const { aToken, appointments, getAllAppointments, cancelAppointment } =
    useContext(AdminContext);
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext);

  const [loadingMap, setLoadingMap] = useState({});
  const lockRef = useRef({});

  useEffect(() => {
    if (aToken) {
      getAllAppointments();
    }
  }, [aToken]);

  const handleCancel = async (appointmentId) => {
    if (lockRef.current[appointmentId]) return;
    lockRef.current[appointmentId] = true;
    setLoadingMap((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      await cancelAppointment(appointmentId);
    } finally {
      lockRef.current[appointmentId] = false;
      setLoadingMap((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  return (
    <div className="w-full m-1 sm:m-3 ">
      <p className="mb-2 text-sm font-medium">All Appointments</p>

      <div className="bg-white border rounded text-sm">
        {/* Header: Desktop Only */}
        <div className="hidden sm:grid grid-cols-[40px_180px_50px_70px_180px_160px_70px_100px] gap-2 py-2 px-3 border-b bg-gray-50 font-semibold text-gray-700 text-xs">
          <p className="text-center">#</p>
          <p className="text-left">Patient</p>
          <p className="text-center">Age</p>
          <p className="text-center">Type</p>
          <p className="text-left">Date & Time</p>
          <p className="text-left">Doctor</p>
          <p className="text-right">Fees</p>
          <p className="text-center">Actions</p>
        </div>

        {appointments.map((item, index) => (
          <div
            className="flex flex-col gap-2 sm:grid sm:grid-cols-[40px_180px_50px_70px_180px_160px_70px_100px] sm:gap-2 sm:items-center text-gray-500 py-2 px-3 border-b hover:bg-gray-50 min-h-[60px]"
            key={index}
          >
            {/* 1. Index: Hidden on very small screens, visible on Desktop */}
            <p className="hidden sm:block text-gray-500 text-center font-medium">
              {index + 1}
            </p>

            {/* 2. Patient: Always Visible */}
            <div className="flex items-center gap-2 min-h-[36px]">
              <img
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                src={item.userData?.image || assets.default_avatar}
                alt="Patient"
              />
              <div className="min-w-0 flex-1">
                <p className="text-gray-900 font-semibold text-xs leading-tight">
                  {item.userData?.name || "Unknown Patient"}
                </p>
              </div>
            </div>

            {/* 3. Age: Desktop Only (or labeled for mobile) */}
            <div className="hidden sm:flex justify-center items-center w-full">
              <p className="text-center font-medium text-sm w-full">
                {item.userData?.dob ? calculateAge(item.userData.dob) : "N/A"}
              </p>
            </div>

            {/* Type: Desktop Only (or labeled for mobile) */}
            <div className="hidden sm:flex justify-center items-center w-full">
              <div className="flex justify-center items-center w-full">
                <span
                  className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full border w-20 h-7 text-center ${
                    item.appointmentType === "online"
                      ? "text-blue-600 border-blue-300 bg-blue-50"
                      : "text-green-600 border-green-300 bg-green-50"
                  }`}
                >
                  {item.appointmentType === "online" ? "Online" : "Physical"}
                </span>
              </div>
            </div>
            <div className="sm:hidden w-full">
              <span className="text-xs font-bold text-gray-400 block mb-1">
                Type:
              </span>
              <span
                className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${
                  item.appointmentType === "online"
                    ? "text-blue-600 border-blue-300 bg-blue-50"
                    : "text-green-600 border-green-300 bg-green-50"
                }`}
              >
                {item.appointmentType === "online" ? "Online" : "Physical"}
              </span>
            </div>

            {/* 4. Date & Time: Always Visible */}
            <div className="flex justify-between sm:block text-xs">
              <span className="sm:hidden font-medium text-gray-400 flex-shrink-0">
                Date & Time:
              </span>
              <p className="text-gray-700 sm:text-gray-600 leading-tight text-xs">
                {slotDateFormat(item.slotDate)}, {item.slotTime}
              </p>
            </div>

            {/* 5. Doctor: Always Visible */}
            <div className="flex items-center gap-2 min-h-[36px]">
              <span className="sm:hidden font-medium text-gray-400 flex-shrink-0">
                Doctor:
              </span>
              <img
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                src={item.docData?.image || assets.default_avatar}
                alt="Doctor"
              />
              <div className="min-w-0 flex-1">
                <p className="text-gray-900 font-medium text-xs leading-tight">
                  {item.docData?.name || "Unknown Doctor"}
                </p>
              </div>
            </div>

            {/* 6. Fees: Always Visible */}
            <div className="flex justify-between sm:justify-end sm:items-center text-xs">
              <span className="sm:hidden font-medium text-gray-400 flex-shrink-0">
                Fees:
              </span>
              <span className="text-gray-900 sm:text-gray-600 font-semibold text-right text-xs">
                {currency}
                {item.amount}
              </span>
            </div>

            {/* 7. Actions: Always Visible */}
            <div className="flex justify-end sm:justify-center sm:items-center min-h-[36px] w-full">
              {item.cancelled ? (
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider text-center min-h-[16px] flex items-center justify-center w-full px-1">
                  {item.appointmentStatus === "CANCELLED_BY_DOCTOR" ||
                  item.status === "CANCELLED_BY_DOCTOR"
                    ? "DOC_CANCELLED"
                    : item.appointmentStatus || item.status || "Cancelled"}
                </p>
              ) : item.isCompleted ? (
                <p className="text-green-500 text-[10px] font-bold uppercase tracking-wider text-center min-h-[16px] flex items-center justify-center w-full px-1">
                  Completed
                </p>
              ) : (
                <button
                  disabled={!!loadingMap[item._id]}
                  onClick={() => handleCancel(item._id)}
                  className="transition-transform p-1 hover:bg-red-50 rounded-full hover:scale-110 active:scale-95 flex items-center justify-center"
                >
                  {loadingMap[item._id] ? (
                    <Spinner />
                  ) : (
                    <img
                      className="w-5 h-5"
                      src={assets.cancel_icon}
                      alt="Cancel"
                    />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllAppointments;
