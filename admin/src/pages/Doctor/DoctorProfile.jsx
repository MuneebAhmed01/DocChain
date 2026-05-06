import React, { useContext, useEffect, useState } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import DoctorOnlineSettings from "../../components/DoctorOnlineSettings.jsx";
import ReviewOverlay from "../../components/ReviewOverlay.jsx";
import { Star, MessageSquare } from "lucide-react";

const DoctorProfile = () => {
  const {
    dToken,
    profileData,
    setProfileData,
    getProfileData,
    backendUrl,
    reviewsData,
    getReviewsData,
    addReviewReply,
    updateReviewReply,
    deleteReviewReply,
  } = useContext(DoctorContext);
  const { currency } = useContext(AppContext);

  const [isEdit, setIsEdit] = useState(false);
  const [isReviewOverlayOpen, setIsReviewOverlayOpen] = useState(false);
  const [timeSettings, setTimeSettings] = useState({
    useCustomSettings: false,
    workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
    startTime: "14:00",
    endTime: "20:00",
    slotDuration: 30,
  });
  const [timeErrors, setTimeErrors] = useState({});
  const [feeError, setFeeError] = useState("");
  const [currentOnlineSettings, setCurrentOnlineSettings] = useState(null);

  const daysOfWeek = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  // Helper function to convert time string to minutes since midnight
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to convert minutes since midnight to time string
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Validate time settings
  const validateTimeSettings = () => {
    const errors = {};

    if (timeSettings.useCustomSettings) {
      // Check if at least one working day is selected
      if (!timeSettings.workingDays || timeSettings.workingDays.length === 0) {
        errors.workingDays = "At least one working day must be selected";
      }

      // Validate time logic
      const startMinutes = timeToMinutes(timeSettings.startTime);
      const endMinutes = timeToMinutes(timeSettings.endTime);

      // Check if end time is after start time
      if (endMinutes <= startMinutes) {
        errors.endTime = "End time must be after start time";
      } else {
        // Check if time slot exceeds 8 hours (480 minutes)
        const duration = endMinutes - startMinutes;
        if (duration > 480) {
          errors.endTime = "Maximum working slot is 8 hours";
        }
      }
    }

    setTimeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate fee
  const validateFee = (fee) => {
    const numFee = Number(fee);
    if (isNaN(numFee) || numFee < 0) {
      return "Appointment fee cannot be negative";
    }
    if (numFee > 99999) {
      return "Appointment fee seems too high";
    }
    return "";
  };

  const handleViewAllReviews = async () => {
    await getReviewsData();
    setIsReviewOverlayOpen(true);
  };

  const updateProfile = async () => {
    try {
      // Validate fee
      const feeValidationError = validateFee(profileData.fees);
      if (feeValidationError) {
        setFeeError(feeValidationError);
        toast.error(feeValidationError);
        return;
      }

      // Clear fee error if validation passes
      setFeeError("");

      // Validate time settings before updating
      if (!validateTimeSettings()) {
        toast.error("Please fix the errors in your schedule settings");
        return;
      }

      const updateData = {
        docId: profileData._id,
        address: profileData.address,
        fees: profileData.fees,
        available: profileData.available,
        timeSettings: timeSettings,
        onlineConsultEnabled:
          currentOnlineSettings?.onlineConsultEnabled ??
          profileData.onlineConsultEnabled,
        averageConsultDuration:
          currentOnlineSettings?.averageConsultDuration ??
          profileData.averageConsultDuration,
      };

      console.log("Sending updateData:", updateData);

      const { data } = await axios.post(
        backendUrl + "/api/doctor/update-profile",
        updateData,
        { headers: { dToken } },
      );

      console.log("Update response:", data);

      if (data.success) {
        toast.success(data.message);
        setIsEdit(false);
        getProfileData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    getProfileData();
  }, [dToken]);

  useEffect(() => {
    if (profileData && profileData.timeSettings) {
      setTimeSettings(profileData.timeSettings);
    }
  }, [profileData]);

  useEffect(() => {
    if (dToken) {
      getReviewsData();
    }
  }, [dToken]);

  useEffect(() => {
    console.log("ReviewsData updated:", reviewsData);
  }, [reviewsData]);

  return (
    <>
      {profileData && (
        <div className="p-4 sm:p-10">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Profile Image Column */}
            <div className="flex flex-col items-center">
              <img
                className="bg-primary/80 w-full max-w-xs lg:max-w-64 rounded-xl shadow-md"
                src={profileData.image}
                alt="Doctor"
              />
            </div>

            {/* Main Info Section */}
            <div className="flex-1 border border-stone-100 rounded-xl p-6 sm:p-8 bg-white shadow-sm">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                {profileData.name}
              </h2>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.round(profileData.averageRating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-700 ml-1 font-bold text-lg">
                    {profileData.averageRating || "0.0"}
                  </span>
                </div>
                <span className="text-gray-500 text-sm">
                  ({profileData.ratingCount || 0} reviews)
                </span>
                <button
                  onClick={handleViewAllReviews}
                  className="text-blue-500 hover:text-blue-600 text-sm font-medium underline"
                >
                  Read All Reviews
                </button>
                <span className="hidden sm:block text-gray-300">|</span>
                <p className="text-gray-600 font-medium">
                  {profileData.degree} - {profileData.speciality}
                </p>
                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs border border-blue-100">
                  {profileData.experience}
                </span>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                  About
                </h4>
                <p className="text-gray-600 mt-2 leading-relaxed text-sm sm:text-base">
                  {profileData.about}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-gray-500 text-sm font-medium">
                    Appointment Fee
                  </p>
                  <div className="text-xl font-bold text-gray-800 mt-1">
                    RS
                    {isEdit ? (
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="99999"
                          className={`ml-2 border rounded px-2 py-1 w-24 text-base focus:ring-2 focus:ring-primary outline-none ${
                            feeError
                              ? "border-red-500 ring-2 ring-red-500"
                              : "border-gray-300"
                          }`}
                          onChange={(e) => {
                            const value = e.target.value;
                            setProfileData((prev) => ({
                              ...prev,
                              fees: value,
                            }));
                            // Clear fee error when user starts typing
                            if (feeError) {
                              setFeeError("");
                            }
                          }}
                          value={profileData.fees}
                        />
                        {feeError && (
                          <p className="mt-1 text-xs text-red-500">
                            {feeError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="ml-1">{profileData.fees}</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-gray-500 text-sm font-medium">Location</p>
                  <div className="text-sm text-gray-700 mt-1 leading-6">
                    {isEdit ? (
                      <div className="flex flex-col gap-2">
                        <input
                          className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary outline-none"
                          type="text"
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              address: {
                                ...prev.address,
                                line1: e.target.value,
                              },
                            }))
                          }
                          value={profileData.address.line1}
                        />
                        <input
                          className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary outline-none"
                          type="text"
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              address: {
                                ...prev.address,
                                line2: e.target.value,
                              },
                            }))
                          }
                          value={profileData.address.line2}
                        />
                      </div>
                    ) : (
                      <>
                        {profileData.address.line1} <br />
                        {profileData.address.line2}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  onChange={() =>
                    isEdit &&
                    setProfileData((prev) => ({
                      ...prev,
                      available: !prev.available,
                    }))
                  }
                  checked={profileData.available}
                  type="checkbox"
                  id="available-check"
                  className="w-4 h-4 text-primary focus:ring-primary rounded"
                />
                <label
                  htmlFor="available-check"
                  className="font-medium text-gray-700"
                >
                  Open for Appointments
                </label>
              </div>

              {/* Time Settings Section */}
              <div className="mt-10 border-t pt-8">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-800">
                    Schedule Settings
                  </h3>
                  <p className="text-sm text-gray-500">
                    Working hours and availability
                  </p>
                </div>

                {isEdit ? (
                  <div className="space-y-6">
                    {/* Custom Schedule Toggle */}
                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg">
                      <label className="inline-flex items-center cursor-pointer">
                        <span className="mr-3 text-sm font-medium text-gray-700">
                          Use Custom Schedule
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={timeSettings.useCustomSettings}
                          onChange={(e) =>
                            setTimeSettings((prev) => ({
                              ...prev,
                              useCustomSettings: e.target.checked,
                            }))
                          }
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                      <span className="text-xs text-gray-500">
                        {timeSettings.useCustomSettings
                          ? "Custom schedule enabled"
                          : "Using default schedule"}
                      </span>
                    </div>

                    {timeSettings.useCustomSettings && (
                      <div className="space-y-6 bg-gray-50 p-4 sm:p-6 rounded-xl">
                        {/* Day Picker: 4 columns on mobile, 7 on desktop */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-3 uppercase">
                            Working Days
                          </label>
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                            {daysOfWeek.map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  const isSelected =
                                    timeSettings.workingDays.includes(day);
                                  setTimeSettings((prev) => ({
                                    ...prev,
                                    workingDays: isSelected
                                      ? prev.workingDays.filter(
                                          (d) => d !== day,
                                        )
                                      : [...prev.workingDays, day],
                                  }));
                                  // Clear working days error when a day is selected
                                  if (timeErrors.workingDays) {
                                    setTimeErrors((prev) => ({
                                      ...prev,
                                      workingDays: "",
                                    }));
                                  }
                                }}
                                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                                  timeSettings.workingDays.includes(day)
                                    ? "bg-primary text-white shadow-md"
                                    : "bg-white text-gray-400 border border-gray-200"
                                } ${timeErrors.workingDays ? "ring-2 ring-red-500" : ""}`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                          {timeErrors.workingDays && (
                            <p className="mt-2 text-xs text-red-500">
                              {timeErrors.workingDays}
                            </p>
                          )}
                        </div>

                        {/* Hours: Stacks on mobile */}
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={timeSettings.startTime}
                              className={`w-full border-gray-200 rounded-lg p-2 focus:ring-primary ${
                                timeErrors.startTime || timeErrors.endTime
                                  ? "ring-2 ring-red-500"
                                  : ""
                              }`}
                              onChange={(e) => {
                                setTimeSettings((prev) => ({
                                  ...prev,
                                  startTime: e.target.value,
                                }));
                                // Clear time errors when time is changed
                                if (
                                  timeErrors.startTime ||
                                  timeErrors.endTime
                                ) {
                                  setTimeErrors((prev) => ({
                                    ...prev,
                                    startTime: "",
                                    endTime: "",
                                  }));
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={timeSettings.endTime}
                              className={`w-full border-gray-200 rounded-lg p-2 focus:ring-primary ${
                                timeErrors.endTime ? "ring-2 ring-red-500" : ""
                              }`}
                              onChange={(e) => {
                                setTimeSettings((prev) => ({
                                  ...prev,
                                  endTime: e.target.value,
                                }));
                                // Clear time errors when time is changed
                                if (timeErrors.endTime) {
                                  setTimeErrors((prev) => ({
                                    ...prev,
                                    endTime: "",
                                  }));
                                }
                              }}
                            />
                            {timeErrors.endTime && (
                              <p className="mt-1 text-xs text-red-500">
                                {timeErrors.endTime}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Time validation info */}
                        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                          <p className="font-semibold text-blue-800 mb-1">
                            Schedule Rules:
                          </p>
                          <ul className="space-y-1">
                            <li>• End time must be after start time</li>
                            <li>• Maximum working slot: 8 hours</li>
                            <li>• At least one working day required</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${timeSettings.useCustomSettings ? "bg-green-500" : "bg-gray-400"}`}
                    ></div>
                    <p className="text-sm text-gray-700 font-medium">
                      {timeSettings.useCustomSettings
                        ? `${timeSettings.workingDays.join(", ")} | ${timeSettings.startTime} - ${timeSettings.endTime}`
                        : "Default: Monday - Friday, 02:00 PM - 08:00 PM"}
                    </p>
                  </div>
                )}
              </div>

              <DoctorOnlineSettings
                profileData={profileData}
                setProfileData={setProfileData}
                getProfileData={getProfileData}
                isEdit={isEdit}
                onOnlineSettingsChange={setCurrentOnlineSettings}
              />

              <button
                onClick={isEdit ? updateProfile : () => setIsEdit(true)}
                className={`w-full sm:w-auto px-10 py-3 rounded-full mt-10 font-bold transition-all shadow-lg active:scale-95 ${
                  isEdit
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-primary text-white hover:opacity-90"
                }`}
              >
                {isEdit ? "Save Changes" : "Edit Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Overlay */}
      <ReviewOverlay
        isOpen={isReviewOverlayOpen}
        onClose={() => setIsReviewOverlayOpen(false)}
        reviewsData={reviewsData}
        onAddReply={addReviewReply}
        onUpdateReply={updateReviewReply}
        onDeleteReply={deleteReviewReply}
      />
    </>
  );
};

export default DoctorProfile;
