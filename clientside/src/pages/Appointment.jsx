import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets";
import RelatedDoctors from "../components/RelatedDoctors";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";
import { formatPkrAmount } from "../constants/payment";
const Appointment = () => {
  const { docId } = useParams();
  const { doctors, currencySymbol, token, getDoctorsData } =
    useContext(AppContext);
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const navigate = useNavigate();

  const [docInfo, setDocInfo] = useState(null);
  const [docSlots, setDocSlots] = useState([]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [slotTime, setSlotTime] = useState("");
  const [reviews, setReviews] = useState([]);
  const [bookingOptions, setBookingOptions] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const restoreAttemptedRef = useRef(false);

  const fetchDocInfo = async () => {
    const docInfo = doctors.find((doc) => doc._id === docId);
    setDocInfo(docInfo);
  };
  const fetchReviews = async () => {
    try {
      const { data } = await axiosInstance.get(
        `/api/user/doctor-reviews/${docId}`,
      );
      if (data.success) {
        setReviews(data.reviews);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const getAvailableSlots = async () => {
    setDocSlots([]);

    let today = new Date();
    const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    for (let i = 0; i < 7; i++) {
      let currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);

      const dayName = daysOfWeek[currentDate.getDay()];

      // Check if doctor works on this day
      const worksOnThisDay = docInfo.timeSettings?.useCustomSettings
        ? docInfo.timeSettings.workingDays.includes(dayName)
        : true; // Default: works all days

      if (!worksOnThisDay) {
        continue; // Skip this day if doctor doesn't work
      }

      // Set end time based on doctor's settings
      let endTime = new Date();
      endTime.setDate(today.getDate() + i);

      if (docInfo.timeSettings?.useCustomSettings) {
        const [endHour, endMinute] = docInfo.timeSettings.endTime.split(":");
        endTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
      } else {
        endTime.setHours(21, 0, 0, 0); // Default 9 PM
      }

      // Set start time based on doctor's settings
      if (today.getDate() === currentDate.getDate()) {
        // For today, start from next available slot
        if (docInfo.timeSettings?.useCustomSettings) {
          const [startHour, startMinute] =
            docInfo.timeSettings.startTime.split(":");
          currentDate.setHours(
            parseInt(startHour),
            parseInt(startMinute),
            0,
            0,
          );

          // If current time is past start time, move to next slot
          if (currentDate < new Date()) {
            currentDate.setMinutes(
              Math.ceil(
                currentDate.getMinutes() /
                  (docInfo.timeSettings.slotDuration || 30),
              ) * (docInfo.timeSettings.slotDuration || 30),
            );
          }
        } else {
          currentDate.setHours(
            currentDate.getHours() > 14 ? currentDate.getHours() + 1 : 14,
          );
          currentDate.setMinutes(currentDate.getMinutes() > 30 ? 30 : 0);
        }
      } else {
        // For future days, start from doctor's start time
        if (docInfo.timeSettings?.useCustomSettings) {
          const [startHour, startMinute] =
            docInfo.timeSettings.startTime.split(":");
          currentDate.setHours(
            parseInt(startHour),
            parseInt(startMinute),
            0,
            0,
          );
        } else {
          currentDate.setHours(14, 0, 0, 0); // Default 2 PM
        }
      }

      let timeSlots = [];
      const slotDuration = docInfo.timeSettings?.useCustomSettings
        ? docInfo.timeSettings.slotDuration
        : 30; // Default 30 minutes

      while (currentDate < endTime) {
        let formattedTime = currentDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        let day = currentDate.getDate();
        let month = currentDate.getMonth() + 1;
        let year = currentDate.getFullYear();

        const slotDate = day + "_" + month + "_" + year;
        const slotTime = formattedTime;

        const isSlotAvailable =
          docInfo.slots_booked[slotDate] &&
          docInfo.slots_booked[slotDate].includes(slotTime)
            ? false
            : true;

        if (isSlotAvailable) {
          timeSlots.push({
            datetime: new Date(currentDate),
            time: formattedTime,
          });
        }

        // Increment current time by slot duration
        currentDate.setMinutes(currentDate.getMinutes() + slotDuration);
      }

      if (timeSlots.length > 0) {
        setDocSlots((prev) => [...prev, timeSlots]);
      }
    }
  };

  const bookAppointment = async (
    selectedSlotIndex,
    selectedSlotTime,
    selectedDate,
  ) => {
    if (!token) {
      toast.warn("Login to book appointment");
      return navigate("/login");
    }

    if (!selectedSlotTime) {
      toast.error("Please select a time slot");
      return;
    }

    try {
      setIsSubmitting(true);
      const slotDate = selectedDate;

      const { data } = await axiosInstance.post("/api/user/book-appointment", {
        docId,
        slotDate,
        slotTime: selectedSlotTime,
      });
      if (data.success) {
        setBookingOptions({
          ...data,
          slotDate,
          slotTime: selectedSlotTime,
          slotIndex: selectedSlotIndex,
        });
        localStorage.setItem(
          `appointmentSelection:${docId}`,
          JSON.stringify({
            slotIndex: selectedSlotIndex,
            slotTime: selectedSlotTime,
            slotDate,
          }),
        );
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startPayment = async (endpoint, appointmentId) => {
    try {
      setIsSubmitting(true);
      const { data } = await axiosInstance.post(endpoint, {
        appointmentId,
      });

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      toast.error(data.message || "Unable to start payment.");
    } catch (error) {
      console.log(error);
      toast.error("Unable to start payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchDocInfo();
    fetchReviews(); // ⭐ NEW
  }, [doctors, docId]);

  useEffect(() => {
    setBookingOptions(null);
  }, [slotIndex, slotTime]);

  useEffect(() => {
    const syncDoctors = () => {
      if (docId) {
        getDoctorsData();
      }
    };

    syncDoctors();
    const intervalId = window.setInterval(syncDoctors, 30000);

    return () => window.clearInterval(intervalId);
  }, [docId, getDoctorsData]);

  useEffect(() => {
    if (!docSlots.length || restoreAttemptedRef.current) {
      return;
    }

    const savedSelectionRaw = localStorage.getItem(
      `appointmentSelection:${docId}`,
    );
    if (!savedSelectionRaw) {
      restoreAttemptedRef.current = true;
      return;
    }

    try {
      const savedSelection = JSON.parse(savedSelectionRaw);
      const restoredDayIndex = docSlots.findIndex((daySlots) => {
        const firstSlot = daySlots?.[0];
        if (!firstSlot) return false;
        const currentDate = firstSlot.datetime;
        const currentSlotDate = `${currentDate.getDate()}_${currentDate.getMonth() + 1}_${currentDate.getFullYear()}`;
        return currentSlotDate === savedSelection.slotDate;
      });

      if (restoredDayIndex >= 0) {
        const restoredDay = docSlots[restoredDayIndex];
        const restoredSlot = restoredDay.find(
          (item) => item.time === savedSelection.slotTime,
        );
        if (restoredSlot) {
          setSlotIndex(restoredDayIndex);
          setSlotTime(savedSelection.slotTime);
          bookAppointment(
            restoredDayIndex,
            savedSelection.slotTime,
            savedSelection.slotDate,
          );
        }
      }
    } catch (error) {
      console.log("Failed to restore appointment selection:", error);
    } finally {
      restoreAttemptedRef.current = true;
    }
  }, [docSlots, docId]);

  useEffect(() => {
    getAvailableSlots();
  }, [docInfo]);

  return (
    docInfo && (
      <div>
        {/* -------------------- Doctor Details -------------------- */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <img
              className="bg-primary w-full sm:max-w-72 rounded-lg"
              src={docInfo.image}
              alt=""
            />
          </div>

          <div className="flex-1 border border-gray-400 rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[-80px] sm:mt-0">
            <div className="flex items-center justify-between">
              {/* -------------------- Doc Info : name, degree, experience -------------------- */}
              <div>
                <p className="flex items-center gap-2 text-2xl font-medium text-gray-900">
                  {docInfo.name}
                  <img className="w-5" src={assets.verified_icon} alt="" />
                </p>

                {/* ⭐ Rating */}
                <div className="flex items-center gap-1 text-yellow-500 text-sm mt-1">
                  <span>★</span>
                  <span className="text-gray-700">
                    {docInfo.averageRating || "0.0"}
                  </span>
                  <span className="text-gray-500">
                    ({docInfo.ratingCount || 0} reviews)
                  </span>
                </div>
              </div>

              {/* {docInfo.city && ( */}
              <div className="flex items-center gap-2 text-sm mt-2 text-gray-600">
                <span className="font-medium">Location:</span>
                <span>{docInfo.city}</span>
              </div>
              {/* )} */}
            </div>
            <div className="flex items-center gap-2 text-sm mt-1 text-gray-600">
              <p>
                {docInfo.degree} - {docInfo.speciality}
              </p>
              <button className="py-0.5 px-2 border text-xs rounded-full">
                {docInfo.experience}
              </button>
            </div>

            {/* -------------------- Doctor About -------------------- */}
            <div>
              <p className="flex items-center gap-1 text-sm font-medium text-gray-600 mt-3">
                About <img src={assets.info_icon} alt="" />
              </p>
              <p className="text-sm text-gray-500 max-w-[700px] mt-1">
                {docInfo.about}
              </p>
            </div>
            <p className="text-gray-500 font-medium mt-4">
              Appointment fee:{" "}
              <span className="text-gray-600">
                {currencySymbol}
                {docInfo.fees}
              </span>
            </p>
            {/* ⭐ Reviews Section */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Patient Reviews
              </p>

              {reviews.length === 0 && (
                <p className="text-sm text-gray-500">No reviews yet.</p>
              )}

              <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
                {reviews.map((rev, idx) => (
                  <div key={idx} className="border p-3 rounded">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800">
                        {rev.user?.name || "User"}
                      </p>
                      <div className="flex items-center gap-1 text-yellow-500 text-sm">
                        <span>★</span>
                        <span className="text-gray-700">{rev.rating}</span>
                      </div>
                    </div>
                    {rev.comment && (
                      <p className="text-sm text-gray-600 mt-1">
                        {rev.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* -------------------- Booking Slots -------------------- */}
        <div className="sm:ml-72 sm:pl-4 mt-4 font-medium text-gray-700">
          <p>Booking slots</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {docSlots.length &&
              docSlots.map((item, index) => (
                <div
                  onClick={() => setSlotIndex(index)}
                  className={`cursor-pointer rounded-xl border px-3 py-3 text-center transition-all ${
                    slotIndex === index
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-gray-200 bg-white hover:border-primary/40"
                  }`}
                  key={index}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] opacity-80">
                    {item[0] && daysOfWeek[item[0].datetime.getDay()]}
                  </p>
                  <p className="mt-1 text-xl font-semibold leading-none">
                    {item[0] && item[0].datetime.getDate()}
                  </p>
                </div>
              ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {docSlots.length &&
              docSlots[slotIndex].map((item, index) => (
                <div key={index} className="min-w-0">
                  <p
                    onClick={() => {
                      const selectedDate = `${item.datetime.getDate()}_${item.datetime.getMonth() + 1}_${item.datetime.getFullYear()}`;
                      setSlotTime(item.time);
                      setBookingOptions(null);
                      bookAppointment(slotIndex, item.time, selectedDate);
                    }}
                    className={`block w-full cursor-pointer rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-all ${
                      item.time === slotTime
                        ? "bg-primary text-white shadow-sm"
                        : "border border-gray-300 bg-white text-gray-500 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {item.time.toLowerCase()}
                  </p>
                </div>
              ))}
          </div>
          {isSubmitting && (
            <p className="text-sm text-gray-500 mt-4">
              Preparing payment options...
            </p>
          )}
        </div>

        {bookingOptions?.success && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setBookingOptions(null)}
          >
            <div
              className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="payment-options-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 sm:px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                    Select payment method
                  </p>
                  <h3
                    id="payment-options-title"
                    className="text-xl font-semibold text-gray-900 mt-1"
                  >
                    Selected slot: {bookingOptions.slotTime}
                  </h3>
                </div>
                <button
                  onClick={() => setBookingOptions(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center"
                  aria-label="Close payment modal"
                >
                  ✕
                </button>
              </div>

              <div className="px-5 sm:px-6 py-5">
                <p className="text-sm text-gray-500">
                  Pick how you want to confirm this booking. The selected slot
                  will remain held while you complete payment.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                    <p className="font-semibold text-gray-900 text-lg">
                      Pay Full Amount
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Pay now:{" "}
                      {formatPkrAmount(
                        bookingOptions.paymentOptions.option1_full.youPay,
                      )}
                    </p>
                    <button
                      onClick={() =>
                        startPayment(
                          "/api/stripe/create-checkout-session",
                          bookingOptions.appointmentId,
                        )
                      }
                      disabled={isSubmitting}
                      className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                    >
                      Pay Full
                    </button>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
                    <p className="font-semibold text-gray-900 text-lg">
                      Pay Token
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Pay now:{" "}
                      {formatPkrAmount(
                        bookingOptions.paymentOptions.option2_token.youPay,
                      )}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Pay at clinic later:{" "}
                      {formatPkrAmount(
                        bookingOptions.paymentOptions.option2_token
                          .remainingAtClinic,
                      )}
                    </p>
                    <button
                      onClick={() =>
                        startPayment(
                          "/api/stripe/create-token-payment-session",
                          bookingOptions.appointmentId,
                        )
                      }
                      disabled={isSubmitting}
                      className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Pay Token
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- Listing Related Doctors -------------------- */}
        <RelatedDoctors docId={docId} speciality={docInfo.speciality} />
      </div>
    )
  );
};

export default Appointment;
