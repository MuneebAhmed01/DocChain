import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";
import ChatWindow from "../components/ChatWindow";
import useChatNotifications from "../hooks/useChatNotifications";
import { formatPkrAmount } from "../constants/payment";

const getAppointmentWindow = (slotDate, slotTime) => {
  if (!slotDate || !slotTime) return null;

  const dateParts = String(slotDate).includes("-")
    ? String(slotDate).split("-").reverse()
    : String(slotDate).split("_");
  if (dateParts.length !== 3) return null;

  const [day, month, year] = dateParts;
  const date = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`,
  );
  if (Number.isNaN(date.getTime())) return null;

  const parsed = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${slotTime}`,
  );
  const start = Number.isNaN(parsed.getTime()) ? new Date(date) : parsed;
  if (Number.isNaN(parsed.getTime())) {
    const [timeValue, meridian = ""] = String(slotTime).split(" ");
    const [hRaw, mRaw] = timeValue.split(":");
    let hour = Number.parseInt(hRaw, 10);
    const minute = Number.parseInt(mRaw, 10);
    const lowerMeridian = String(meridian).toLowerCase();
    if (lowerMeridian === "pm" && hour < 12) hour += 12;
    if (lowerMeridian === "am" && hour === 12) hour = 0;
    start.setHours(hour, minute || 0, 0, 0);
  }

  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const joinStart = new Date(start.getTime() - 10 * 60 * 1000);
  return { start, end, joinStart };
};

const MyAppointments = () => {
  const { token, getDoctorsData } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [selectedChatAppt, setSelectedChatAppt] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelAppt, setSelectedCancelAppt] = useState(null);

  // Initialize chat notifications
  useChatNotifications(token, "user");

  const months = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const slotDateFormat = (slotDate) => {
    const dateArray = slotDate.split("_");
    return (
      dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
    );
  };

  const getUserAppointments = async () => {
    try {
      const { data } = await axiosInstance.get("/api/user/appointments");
      if (data.success) {
        // Sort appointments by booking date (newest first) to show latest bookings at top
        const sortedAppointments = data.appointments.sort((a, b) => {
          // Primary sort: by booking date (newest first)
          // Use 'date' field which is the creation timestamp, or fallback to _id
          const bookingDateA = new Date(a.date || a._id.getTimestamp());
          const bookingDateB = new Date(b.date || b._id.getTimestamp());

          // If booking dates are different, sort by booking date (newest first)
          if (bookingDateA.getTime() !== bookingDateB.getTime()) {
            return bookingDateB.getTime() - bookingDateA.getTime();
          }

          // Secondary sort: if same booking time, sort by appointment datetime
          const createDateTime = (slotDate, slotTime) => {
            if (!slotDate) return new Date(0);

            // Parse slotDate (format: DD_Month_YYYY or DD-MM-YYYY)
            const dateParts = String(slotDate).includes("-")
              ? String(slotDate).split("-").reverse()
              : String(slotDate).split("_");

            if (dateParts.length !== 3) return new Date(0);

            const [day, month, year] = dateParts;
            const date = new Date(
              `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
                2,
                "0",
              )}T00:00:00`,
            );

            if (slotTime) {
              // Parse slotTime and add to date
              const [timeValue, meridian = ""] = String(slotTime).split(" ");
              const [hRaw, mRaw] = timeValue.split(":");
              let hour = Number.parseInt(hRaw, 10);
              const minute = Number.parseInt(mRaw, 10);
              const lowerMeridian = String(meridian).toLowerCase();
              if (lowerMeridian === "pm" && hour < 12) hour += 12;
              if (lowerMeridian === "am" && hour === 12) hour = 0;
              date.setHours(hour, minute || 0, 0, 0);
            }

            return date;
          };

          const appointmentDateTimeA = createDateTime(a.slotDate, a.slotTime);
          const appointmentDateTimeB = createDateTime(b.slotDate, b.slotTime);
          const now = new Date();

          // Check if appointments are in future or past
          const isAFuture = appointmentDateTimeA > now;
          const isBFuture = appointmentDateTimeB > now;

          // If both are future or both are past, sort by appointment datetime
          if (isAFuture && isBFuture) {
            // Both future: earliest appointment first
            return (
              appointmentDateTimeA.getTime() - appointmentDateTimeB.getTime()
            );
          } else if (!isAFuture && !isBFuture) {
            // Both past: latest appointment first
            return (
              appointmentDateTimeB.getTime() - appointmentDateTimeA.getTime()
            );
          } else {
            // One future, one past: future appointments first
            return isAFuture ? -1 : 1;
          }
        });
        setAppointments(sortedAppointments);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const calculateRefundAmount = (appointment) => {
    const totalPaid = Number(
      appointment.paidAmount || appointment.totalAmount || 0,
    );
    const bookingFee = 500;
    const processingFee = 100;
    const totalDeduction = bookingFee + processingFee;
    return Math.max(totalPaid - totalDeduction, 0);
  };

  const openCancelModal = (appointment) => {
    setSelectedCancelAppt(appointment);
    setShowCancelModal(true);
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axiosInstance.post(
        "/api/user/cancel-appointment",
        { appointmentId },
      );

      if (data.success) {
        toast.success(data.message);
        setShowCancelModal(false);
        setSelectedCancelAppt(null);
        getUserAppointments();
        getDoctorsData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };
  const openRateModal = (appt) => {
    setSelectedAppt(appt);
    setRating(0);
    setComment("");
    setShowRateModal(true);
  };

  const submitRating = async () => {
    try {
      if (!rating) {
        return toast.error("Please select a rating");
      }

      const { data } = await axiosInstance.post("/api/user/rate-doctor", {
        appointmentId: selectedAppt._id,
        rating,
        comment,
      });

      if (data.success) {
        toast.success(data.message);
        setShowRateModal(false);
        getUserAppointments(); // refresh list
        getDoctorsData(); // refresh doctor ratings
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.log(err);
      toast.error("Failed to submit review");
    }
  };

  const joinOnlineAppointment = async (appointmentId) => {
    try {
      const { data } = await axiosInstance.post(
        "/api/user/appointments/join-online",
        { appointmentId },
      );
      if (!data.success) {
        toast.error(data.message || "Unable to join call");
        return;
      }
      if (!data.meetingLink) {
        toast.error("Meeting link is not available");
        return;
      }
      window.open(data.meetingLink, "_blank", "noopener,noreferrer");
      getUserAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (token) {
      getUserAppointments();
    }
  }, [token]);

  return (
    <div>
      <p className="pb-3 mt-12 font-medium text-zinc-700 border-b">
        My appointments
      </p>

      <div>
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-500 text-lg font-medium">
              No appointments scheduled
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Book an appointment to see it here
            </p>
          </div>
        ) : (
          appointments.map((item, index) => {
            const appointmentStatus = item.appointmentStatus || item.status;
            const appointmentType =
              item.type ||
              (item.appointmentType === "online" ? "online" : "office");
            const isOnlineAppointment = appointmentType === "online";
            const refundDue = Boolean(
              item.refund_status ||
              item.refundStatus === "PENDING" ||
              (item.refundAmount || 0) > 0,
            );
            const cancellationMessage = refundDue
              ? "Your appointment has been cancelled. You will be refunded."
              : item.cancellationReason || "Appointment cancelled.";
            const now = new Date();
            const window = getAppointmentWindow(item.slotDate, item.slotTime);
            const canJoin = Boolean(
              isOnlineAppointment &&
              !item.cancelled &&
              appointmentStatus === "CONFIRMED" &&
              (
                item.demoActive === true ||
                (
                  window &&
                  now >= window.joinStart &&
                  now <= window.end
                )
              ),
            );
            const isBeforeWindow = Boolean(window && now < window.joinStart);
            const isAfterWindow = Boolean(window && now > window.end);
            const callStatus = isAfterWindow
              ? item.sessionStatus === "completed"
                ? "Completed"
                : item.sessionStatus === "missed"
                  ? "Missed"
                  : "Missed"
              : canJoin
                ? "Join Call"
                : "Not started yet";

            return (
              <div
                className="flex flex-col gap-4 sm:grid sm:grid-cols-[1fr_3fr_1fr] items-center sm:items-start py-5 border-b"
                key={index}
              >
                <div>
                  <img
                    className="w-40 sm:w-32 bg-indigo-50 rounded-lg"
                    src={item.docData.image}
                    alt=""
                  />
                </div>

                <div className="flex-1 text-sm text-zinc-600 text-center sm:text-left">
                  <p className="text-neutral-800 font-semibold">
                    {item.docData.name}
                  </p>
                  <p>{item.docData.speciality}</p>

                  <p className="text-zinc-700 font-medium mt-1">Address:</p>
                  <p className="text-xs">{item.docData.address.line1}</p>
                  <p className="text-xs">{item.docData.address.line2}</p>

                  <p className="text-xs mt-1">
                    <span className="text-sm text-neutral-700 font-medium">
                      Date & Time:
                    </span>{" "}
                    {slotDateFormat(item.slotDate)} | {item.slotTime}
                  </p>

                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-600">
                        Consultation Fee:
                      </span>
                      <span>
                        {formatPkrAmount(item.doctorFee || item.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-600">
                        Platform Fee (Non-Refundable):
                      </span>
                      <span>{formatPkrAmount(item.platformFee || 100)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                      <span>Total Paid:</span>
                      <span>
                        {item.paymentStatus === "PAID"
                          ? formatPkrAmount(
                              item.paidAmount || item.totalAmount || 0,
                            )
                          : item.paymentStatus === "PARTIAL" || item.tokenPaid
                            ? formatPkrAmount(item.paidAmount || 0)
                            : "Pending"}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm mt-2">
                    <span className="font-medium">Payment:</span>{" "}
                    {item.paymentType}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Type:</span>{" "}
                    {appointmentType === "online" ? "Online" : "Office"}
                  </p>
                  {isOnlineAppointment && (
                    <p className="text-sm">
                      <span className="font-medium">Call:</span> {callStatus}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Status:</span>{" "}
                    {item.paymentStatus}
                  </p>
                  {item.paymentType === "TOKEN" && (
                    <p className="text-sm text-amber-600">
                      Remaining at clinic:{" "}
                      {formatPkrAmount(
                        (item.doctorFee || item.amount) -
                          (item.paidAmount - (item.platformFee || 100)),
                      )}
                    </p>
                  )}

                  {(appointmentStatus === "CANCELLED_BY_DOCTOR" ||
                    appointmentStatus === "CANCELLED_BY_ADMIN" ||
                    appointmentStatus === "PAYMENT_FAILED") && (
                    <p
                      id="msg1"
                      className="mt-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded"
                    >
                      {cancellationMessage}
                    </p>
                  )}

                  {appointmentStatus === "CANCELLED_BY_USER" && (
                    <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                      {cancellationMessage}
                    </p>
                  )}

                  {item.paymentStatus === "PAID" && (
                    <span className="inline-block mt-1 px-3 py-1 bg-green-500 text-white rounded text-xs">
                      Paid in full
                    </span>
                  )}
                  {(item.paymentStatus === "PARTIAL" || item.tokenPaid) && (
                    <span className="inline-block mt-1 px-3 py-1 bg-amber-500 text-white rounded text-xs">
                      Token paid
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2 justify-end w-full sm:w-auto">
                  {isOnlineAppointment &&
                    !item.cancelled &&
                    appointmentStatus === "CONFIRMED" &&
                    (canJoin ? (
                      <button
                        onClick={() => joinOnlineAppointment(item._id)}
                        className="text-sm text-white bg-blue-600 text-center w-full sm:min-w-48 py-2.5 rounded hover:bg-blue-700 transition-all"
                      >
                        Join Call
                      </button>
                    ) : (
                      <button
                        disabled
                        className="text-sm text-stone-400 bg-stone-100 text-center w-full sm:min-w-48 py-2.5 border rounded cursor-not-allowed"
                      >
                        {isBeforeWindow
                          ? "Not started yet"
                          : isAfterWindow
                            ? item.sessionStatus === "completed"
                              ? "Completed"
                              : "Missed"
                            : "Not started yet"}
                      </button>
                    ))}
                  {/* SEND REMINDER BUTTON */}
                  {!item.cancelled &&
                    appointmentStatus === "CONFIRMED" && (
                      <button
                        onClick={async () => {
                          try {
                            // For online appointments: force-activate so Join Call appears immediately (demo mode)
                            if (isOnlineAppointment) {
                              console.log("[DEMO] Triggering force-active for appointment", item._id);
                              const { data } = await axiosInstance.post(
                                "/api/user/appointments/force-active",
                                { appointmentId: item._id },
                              );
                              console.log("[DEMO] force-active response:", data);
                              if (data.success) {
                                toast.success("Appointment is now joinable! Click 'Join Call'.");
                                getUserAppointments(); // refresh so demoActive flag is reflected
                              } else {
                                toast.error(data.message || "Failed to activate appointment");
                              }
                            } else {
                              // For office appointments: just send the WhatsApp reminder
                              const { data } = await axiosInstance.post(
                                "/api/user/trigger-reminder",
                                { appointmentId: item._id },
                              );
                              if (data.success) {
                                toast.success("Reminder sent successfully!");
                              } else {
                                toast.error(data.message || "Failed to send reminder");
                              }
                            }
                          } catch (err) {
                            console.error("[DEMO] trigger error:", err);
                            toast.error("Failed to trigger appointment");
                          }
                        }}
                        className="text-sm text-white bg-amber-500 text-center w-full sm:min-w-48 py-2.5 rounded hover:bg-amber-600 transition-all"
                      >
                        {isOnlineAppointment ? "🚀 Trigger Appointment" : "🔔 Send Reminder"}
                      </button>
                    )}

                  {/* CHAT BUTTON */}
                  {!item.cancelled && (
                    <button
                      onClick={() => {
                        setSelectedChatAppt(item);
                        setShowChatWindow(true);
                      }}
                      className="text-sm text-white bg-green-600 text-center w-full sm:min-w-48 py-2.5 rounded hover:bg-green-700 transition-all"
                    >
                      💬 Chat with Doctor
                    </button>
                  )}

                  {/* CANCEL BUTTON */}
                  {!item.cancelled &&
                    appointmentStatus !== "CANCELLED_BY_DOCTOR" &&
                    appointmentStatus !== "CANCELLED_BY_ADMIN" &&
                    !item.isCompleted && (
                      <button
                        onClick={() => openCancelModal(item)}
                        className="text-sm text-stone-500 text-center w-full sm:min-w-48 py-2.5 border rounded hover:bg-red-600 hover:text-white transition-all"
                      >
                        Cancel appointment
                      </button>
                    )}

                  {/* CANCELLED BADGE */}
                  {item.cancelled && !item.isCompleted && (
                    <button className="sm:min-w-48 py-2 border border-red-500 rounded text-red-500">
                      Appointment cancelled
                    </button>
                  )}

                  {/* COMPLETED BADGE */}
                  {/* COMPLETED & RATING */}
                  {item.isCompleted && !item.isRated && (
                    <div className="flex flex-col gap-2">
                      <button className="sm:min-w-48 py-2 border border-green-500 rounded text-green-500">
                        Completed
                      </button>
                      <button
                        onClick={() => openRateModal(item)}
                        className="sm:min-w-48 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        ⭐ Rate Doctor
                      </button>
                    </div>
                  )}

                  {item.isCompleted && item.isRated && (
                    <button className="sm:min-w-48 py-2 border border-gray-400 rounded text-gray-500">
                      Rated
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Window */}
      {showChatWindow && selectedChatAppt && (
        <ChatWindow
          appointmentId={selectedChatAppt._id}
          doctorName={selectedChatAppt.docData.name}
          doctorImage={selectedChatAppt.docData.image}
          onClose={() => {
            setShowChatWindow(false);
            setSelectedChatAppt(null);
          }}
        />
      )}

      {/* ⭐ Rating Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-80">
            <h2 className="text-lg font-semibold mb-3">Rate Doctor</h2>

            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  className={`cursor-pointer text-2xl ${
                    star <= rating ? "text-yellow-400" : "text-gray-300"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>

            <textarea
              placeholder="Write a short review (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded p-2 text-sm mb-3"
              rows={3}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRateModal(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={submitRating}
                className="px-3 py-1 bg-primary text-white rounded"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION CONFIRMATION MODAL */}
      {showCancelModal && selectedCancelAppt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cancel Appointment
              </h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800 font-medium mb-3">
                  ⚠️ Cancellation charges will apply:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Booking fee (non-refundable):
                    </span>
                    <span className="font-medium">Rs. 500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Processing fee (non-refundable):
                    </span>
                    <span className="font-medium">Rs. 100</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>You will be refunded:</span>
                      <span className="text-green-600">
                        Rs. {calculateRefundAmount(selectedCancelAppt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to cancel your appointment with{" "}
                <span className="font-medium">
                  {selectedCancelAppt.docData.name}
                </span>{" "}
                on{" "}
                <span className="font-medium">
                  {slotDateFormat(selectedCancelAppt.slotDate)} at{" "}
                  {selectedCancelAppt.slotTime}
                </span>
                ?
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedCancelAppt(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => cancelAppointment(selectedCancelAppt._id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
