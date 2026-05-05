import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";
import ChatWindow from "../components/ChatWindow";
import useChatNotifications from "../hooks/useChatNotifications";
import { formatPkrAmount } from "../constants/payment";

const MyAppointments = () => {
  const { token, getDoctorsData } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [selectedChatAppt, setSelectedChatAppt] = useState(null);

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
        setAppointments(data.appointments);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axiosInstance.post(
        "/api/user/cancel-appointment",
        { appointmentId },
      );

      if (data.success) {
        toast.success(data.message);
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
        {appointments.map((item, index) => {
          const appointmentStatus = item.appointmentStatus || item.status;
          const refundDue = Boolean(item.refund_status || item.refundStatus === "PENDING" || (item.refundAmount || 0) > 0);
          const cancellationMessage = refundDue
            ? "Your appointment has been cancelled. You will be refunded."
            : item.cancellationReason || "Appointment cancelled.";

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

                <p className="mt-2">
                  <span className="font-medium">Fee:</span>{" "}
                  {formatPkrAmount(item.amount)}
                </p>

                <p className="text-sm mt-1">
                  <span className="font-medium">Payment:</span> {item.paymentType}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Status:</span> {item.paymentStatus}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Paid:</span> {formatPkrAmount(item.paidAmount || 0)}
                </p>
                {item.paymentType === "TOKEN" && (
                  <p className="text-sm text-amber-600">
                    Remaining at clinic: {formatPkrAmount(item.amount - (item.paidAmount || 0))}
                  </p>
                )}

                {(appointmentStatus === "CANCELLED_BY_DOCTOR" || appointmentStatus === "CANCELLED_BY_ADMIN" || appointmentStatus === "PAYMENT_FAILED") && (
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
                {!item.cancelled && appointmentStatus !== "CANCELLED_BY_DOCTOR" && appointmentStatus !== "CANCELLED_BY_ADMIN" && !item.isCompleted && (
                  <button
                    onClick={() => cancelAppointment(item._id)}
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
        })}
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
    </div>
  );
};

export default MyAppointments;
