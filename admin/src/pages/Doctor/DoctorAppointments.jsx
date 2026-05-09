import React, { useContext, useEffect } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";

const getAppointmentWindow = (slotDate, slotTime) => {
  if (!slotDate || !slotTime) return null;
  const parts = String(slotDate).split("_");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const parsed = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${slotTime}`,
  );
  const start = Number.isNaN(parsed.getTime())
    ? new Date(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`,
      )
    : parsed;
  if (Number.isNaN(parsed.getTime())) {
    const [timeValue, meridian = ""] = String(slotTime).split(" ");
    const [hRaw, mRaw] = timeValue.split(":");
    let hour = Number.parseInt(hRaw, 10);
    const minute = Number.parseInt(mRaw, 10);
    const meridianLower = String(meridian).toLowerCase();
    if (meridianLower === "pm" && hour < 12) hour += 12;
    if (meridianLower === "am" && hour === 12) hour = 0;
    start.setHours(hour, minute || 0, 0, 0);
  }
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const joinStart = new Date(start.getTime() - 10 * 60 * 1000);
  return { start, end, joinStart };
};

const DoctorAppointments = () => {
  const {
    dToken,
    appointments,
    getAppointments,
    completeAppointment,
    cancelAppointment,
    joinOnlineAppointment,
  } = useContext(DoctorContext);

  const { calculateAge, slotDateFormat, currency } = useContext(AppContext);

  useEffect(() => {
    if (dToken) {
      getAppointments();
    }
  }, [dToken]);

  return (
    <div className="w-full max-w-6xl min-w-0 m-2 sm:m-5 overflow-x-hidden">
      <p className="mb-3 text-lg font-medium text-gray-800">All Appointments</p>

      <div className="bg-white border rounded-xl text-sm overflow-hidden shadow-sm">
        {/* Desktop Header: Hidden on mobile */}
        <div className="hidden sm:grid grid-cols-[50px_250px_70px_70px_50px_200px_70px_100px] gap-3 py-3 px-4 border-b bg-gray-50 font-semibold text-gray-700 text-xs">
          <p className="text-center">#</p>
          <p className="text-left">Patient</p>
          <p className="text-center">Type</p>
          <p className="text-center">Payment</p>
          <p className="text-center">Age</p>
          <p className="text-left">Date & Time</p>
          <p className="text-right">Fees</p>
          <p className="text-center">Action</p>
        </div>

        {/* Appointment Rows/Cards */}
        <div className="max-h-[80vh] overflow-y-auto">
          {appointments.map((item, index) => {
            const isTokenPayment = item.paymentType === "TOKEN";
            const isFullPayment = item.paymentType === "FULL";
            const paymentLabel = isTokenPayment ? "Token" : "Full";
            const paymentBadgeClass = isTokenPayment
              ? "border-blue-500 text-blue-600 bg-blue-50"
              : "border-green-500 text-green-600 bg-green-50";

            const isOnline =
              (item.type ||
                (item.appointmentType === "online" ? "online" : "office")) ===
              "online";
            const now = new Date();
            const window = getAppointmentWindow(item.slotDate, item.slotTime);
            const canJoinCall =
              isOnline &&
              !item.cancelled &&
              !item.isCompleted &&
              (item.appointmentStatus || item.status) === "CONFIRMED" &&
              (
                item.demoActive === true ||
                (
                  window &&
                  now >= window.joinStart &&
                  now <= window.end
                )
              );
            const hasWindowEnded = Boolean(window && now > window.end);

            return (
              <div
                key={index}
                className="flex flex-col gap-2 sm:grid sm:grid-cols-[50px_250px_70px_70px_50px_200px_70px_100px] sm:gap-3 sm:items-center text-gray-500 py-3 px-4 border-b hover:bg-gray-50 transition-colors min-h-[60px]"
              >
                {/* Index */}
                <p className="hidden sm:block text-gray-500 text-center font-medium">
                  {index + 1}
                </p>

                {/* Index & Patient Header (Mobile Only) */}
                <div className="sm:hidden flex justify-between items-center border-b pb-2">
                  <span className="font-bold text-gray-400">#{index + 1}</span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${paymentBadgeClass}`}
                  >
                    {paymentLabel}
                  </span>
                </div>

                {/* Patient Info */}
                <div className="flex items-center gap-2 min-h-[40px]">
                  <img
                    className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                    src={item.userData?.image || assets.default_avatar}
                    alt="Patient"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-900 font-semibold text-xs leading-tight line-clamp-2 break-words">
                      {item.userData?.name || "Unknown Patient"}
                    </p>
                    <p className="sm:hidden text-xs text-gray-400 mt-1">
                      Age:{" "}
                      {item.userData?.dob
                        ? calculateAge(item.userData.dob)
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Type (Desktop Only) */}
                <div className="hidden sm:flex justify-center items-center w-full">
                  <div className="flex justify-center items-center w-full">
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full border w-16 h-5 text-center ${
                        item.appointmentType === "online"
                          ? "text-blue-600 border-blue-300 bg-blue-50"
                          : "text-green-600 border-green-300 bg-green-50"
                      }`}
                    >
                      {item.appointmentType === "online" ? "Online" : "Office"}
                    </span>
                  </div>
                </div>

                {/* Payment (Desktop Only) */}
                <div className="hidden sm:flex justify-center items-center w-full">
                  <div className="flex justify-center items-center w-full">
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full border w-14 h-5 text-center ${paymentBadgeClass}`}
                    >
                      {paymentLabel}
                    </span>
                  </div>
                </div>

                {/* Age (Desktop Only) */}
                <div className="hidden sm:flex justify-center items-center w-full">
                  <p className="text-center font-medium text-xs w-full">
                    {item.userData?.dob
                      ? calculateAge(item.userData.dob)
                      : "N/A"}
                  </p>
                </div>

                {/* Date & Time */}
                <div className="flex justify-between sm:block text-xs">
                  <span className="sm:hidden font-medium text-gray-400 flex-shrink-0">
                    Schedule:
                  </span>
                  <p className="text-gray-700 sm:text-gray-600 leading-tight text-xs">
                    {slotDateFormat(item.slotDate)}, {item.slotTime}
                  </p>
                </div>

                {/* Fees */}
                <div className="flex justify-between sm:justify-end sm:items-center text-xs">
                  <span className="sm:hidden font-medium text-gray-400 flex-shrink-0">
                    Consultation Fee:
                  </span>
                  <p className="text-gray-900 sm:text-gray-600 font-semibold text-right text-xs">
                    {currency}
                    {item.amount}
                  </p>

                  {/* Mobile TOKEN breakdown */}
                  {isTokenPayment && (
                    <div className="sm:hidden mt-2 text-[11px] text-gray-600 space-y-1">
                      <p>
                        <span className="font-semibold text-gray-700">
                          Remaining Amount:
                        </span>{" "}
                        {currency}
                        {Math.max(
                          0,
                          (item.amount || 0) - (item.paidAmount || 0),
                        )}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">
                          Token Received (Wallet):
                        </span>{" "}
                        {currency}
                        {item.paidAmount || 500}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end sm:justify-center sm:items-center pt-1 sm:pt-0 min-h-[36px] w-full">
                  {item.cancelled ? (
                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider text-center min-h-[16px] flex items-center justify-center w-full px-1">
                      {item.appointmentStatus === "CANCELLED_BY_DOCTOR" ||
                      item.status === "CANCELLED_BY_DOCTOR"
                        ? "DR_CANCELLED"
                        : item.appointmentStatus || item.status || "Cancelled"}
                    </p>
                  ) : item.isCompleted ? (
                    <p className="text-green-500 text-[10px] font-bold uppercase tracking-wider text-center min-h-[16px] flex items-center justify-center w-full px-1">
                      Completed
                    </p>
                  ) : (
                    <div className="flex items-center justify-center gap-1 w-full">
                      {isOnline && (
                        <button
                          onClick={async () => {
                            const meetingLink = await joinOnlineAppointment(
                              item._id,
                            );
                            if (meetingLink) {
                              window.open(
                                meetingLink,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }
                          }}
                          disabled={!canJoinCall}
                          className={`text-[10px] px-2 py-1 rounded border ${
                            canJoinCall
                              ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                              : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          }`}
                        >
                          {canJoinCall
                            ? item.doctorJoined
                              ? "Join Call"
                              : "Start Call"
                            : hasWindowEnded
                              ? item.sessionStatus === "completed"
                                ? "Completed"
                                : "Missed"
                              : "Not started"}
                        </button>
                      )}
                      <button
                        onClick={() => cancelAppointment(item._id)}
                        className="transition-transform p-1 hover:bg-red-50 rounded-full hover:scale-110 active:scale-95"
                      >
                        <img
                          className="w-12 h-12"
                          src={assets.cancel_icon}
                          alt="Cancel"
                        />
                      </button>
                      <button
                        onClick={() => completeAppointment(item._id)}
                        className="transition-transform p-1 hover:bg-green-50 rounded-full hover:scale-110 active:scale-95"
                      >
                        <img
                          className="w-12 h-12"
                          src={assets.tick_icon}
                          alt="Complete"
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DoctorAppointments;
