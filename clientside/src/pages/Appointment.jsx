import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets";
import RelatedDoctors from "../components/RelatedDoctors";
import { toast } from "react-toastify";
import axios from "axios";
import axiosInstance from "../axiosInstance";
const Appointment = () => {
  const { docId } = useParams();
  const { doctors, currencySymbol, backendUrl, token, getDoctorsData } =
    useContext(AppContext);
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const navigate = useNavigate();

  const [docInfo, setDocInfo] = useState(null);
  const [docSlots, setDocSlots] = useState([]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [slotTime, setSlotTime] = useState("");
  const [reviews, setReviews] = useState([]);

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
            currentDate.getHours() > 10 ? currentDate.getHours() + 1 : 10,
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
          currentDate.setHours(10, 0, 0, 0); // Default 10 AM
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

  const bookAppointment = async () => {
    if (!token) {
      toast.warn("Login to book appointment");
      return navigate("/login");
    }

    try {
      const date = docSlots[slotIndex][0].datetime;

      let day = date.getDate();
      let month = date.getMonth() + 1;
      let year = date.getFullYear();

      const slotDate = day + "_" + month + "_" + year;

      const { data } = await axiosInstance.post(
        // backendUrl +
        "/api/user/book-appointment",
        { docId, slotDate, slotTime },
        // { headers: { token } }
      );
      if (data.success) {
        toast.success(data.message);
        getDoctorsData();
        navigate("/my-appointments");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchDocInfo();
    fetchReviews(); // ⭐ NEW
  }, [doctors, docId]);

  useEffect(() => {
    getAvailableSlots();
  }, [docInfo]);

  useEffect(() => {
    console.log(docSlots);
  }, [docSlots]);

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
          <div className="flex gap-3 items-center w-full overflow-x-scroll mt-4">
            {docSlots.length &&
              docSlots.map((item, index) => (
                <div
                  onClick={() => setSlotIndex(index)}
                  className={`text-center py-6 min-w-16 rounded-full cursor-pointer ${
                    slotIndex === index
                      ? "bg-primary text-white"
                      : "border border-gray-200"
                  }`}
                  key={index}
                >
                  <p>{item[0] && daysOfWeek[item[0].datetime.getDay()]}</p>
                  <p>{item[0] && item[0].datetime.getDate()}</p>
                </div>
              ))}
          </div>

          <div className="flex items-center gap-3 w-full overflow-x-scroll mt-4">
            {docSlots.length &&
              docSlots[slotIndex].map((item, index) => (
                <p
                  onClick={() => setSlotTime(item.time)}
                  className={`text-sm font-light flex-shrink-0 px-5 py-2 rounded-full cursor-pointer ${
                    item.time === slotTime
                      ? "bg-primary text-white"
                      : "text-gray-400 border border-gray-300"
                  }`}
                  key={index}
                >
                  {item.time.toLowerCase()}
                </p>
              ))}
          </div>
          <button
            onClick={bookAppointment}
            className="bg-primary text-white text-sm font-light px-14 py-3 rounded-full my-6"
          >
            Book an appointment
          </button>
        </div>

        {/* -------------------- Listing Related Doctors -------------------- */}
        <RelatedDoctors docId={docId} speciality={docInfo.speciality} />
      </div>
    )
  );
};

export default Appointment;
