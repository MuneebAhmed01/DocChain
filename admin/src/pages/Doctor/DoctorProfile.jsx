import React, { useContext, useEffect, useState } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const DoctorProfile = () => {
  const { dToken, profileData, setProfileData, getProfileData, backendUrl } =
    useContext(DoctorContext);
  const { currency } = useContext(AppContext);

  const [isEdit, setIsEdit] = useState(false);
  const [timeSettings, setTimeSettings] = useState({
    useCustomSettings: false,
    workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
    startTime: "14:00",
    endTime: "20:00",
    slotDuration: 30,
  });

  const daysOfWeek = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const updateProfile = async () => {
    try {
      const updateData = {
        address: profileData.address,
        fees: profileData.fees,
        available: profileData.available,
        timeSettings: timeSettings,
      };

      const { data } = await axios.post(
        backendUrl + "/api/doctor/update-profile",
        updateData,
        { headers: { dToken } },
      );

      if (data.success) {
        toast.success(data.message);
        setIsEdit(false);
        getProfileData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
      console.log(error);
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

  return (
    profileData && (
      <div>
        <div className="flex flex-col gap-4 m-5">
          <div>
            <img
              className="bg-primary/80 w-full sm:max-w-64 rounded-lg"
              src={profileData.image}
              alt=""
            />
          </div>

          <div className="flex-1 border border-stone-100 rounded-lg p-8 py-7 bg-white">
            {/* ------- Doc Info: name, degree, experience ------- */}

            <p className="flex items-center gap-2 text-3xl font-medium text-gray-700">
              {profileData.name}
            </p>

            {/* ⭐ Rating */}
            <div className="flex items-center gap-1 text-yellow-500 mt-1">
              <span>★</span>
              <span className="text-gray-700">
                {profileData.averageRating || "0.0"}
              </span>
              <span className="text-gray-500 text-sm">
                ({profileData.ratingCount || 0} reviews)
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-gray-600">
              <p>
                {profileData.degree} - {profileData.speciality}
              </p>
              <button className="py-0.5 px-2 border text-xs rounded-full">
                {profileData.experience}
              </button>
            </div>

            {/* ------- Doc About ------- */}
            <div>
              <p className="flex items-center gap-1 text-sm font-medium text-neutral-800 mt-3">
                About:
              </p>
              <p className="text-sm text-gray-600 max-w-[700px] mt-1">
                {profileData.about}
              </p>
            </div>

            <p className="text-gray-600 font-medium mt-4">
              Appointment fee:{" "}
              <span className="text-gray-800">
                {currency}{" "}
                {isEdit ? (
                  <input
                    type="number"
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        fees: e.target.value,
                      }))
                    }
                    value={profileData.fees}
                  />
                ) : (
                  profileData.fees
                )}
              </span>
            </p>

            <div className="flex gap-2 py-2">
              <p>Address:</p>
              <p className="text-sm">
                {isEdit ? (
                  <input
                    type="text"
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        address: { ...prev.address, line1: e.target.value },
                      }))
                    }
                    value={profileData.address.line1}
                  />
                ) : (
                  profileData.address.line1
                )}
                <br />
                {isEdit ? (
                  <input
                    type="text"
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        address: { ...prev.address, line2: e.target.value },
                      }))
                    }
                    value={profileData.address.line2}
                  />
                ) : (
                  profileData.address.line2
                )}
              </p>
            </div>

            <div className="flex gap-1 pt-2">
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
                name=""
                id=""
              />
              <label htmlFor="">Available</label>
            </div>

            {/* Time Settings Section */}
            <div className="mt-8 border-t pt-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    Schedule Settings
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure your working hours and availability
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      timeSettings.useCustomSettings
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {timeSettings.useCustomSettings
                      ? "Custom Schedule"
                      : "Default Schedule"}
                  </span>
                </div>
              </div>

              {isEdit ? (
                <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                  {/* Custom Settings Toggle */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium text-gray-700">
                          Use Custom Schedule
                        </label>
                        <p className="text-sm text-gray-500 mt-1">
                          Override default working hours
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timeSettings.useCustomSettings}
                          onChange={(e) =>
                            setTimeSettings((prev) => ({
                              ...prev,
                              useCustomSettings: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  {timeSettings.useCustomSettings && (
                    <>
                      {/* Working Days */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <label className="font-medium text-gray-700 block mb-3">
                          Working Days
                        </label>
                        <div className="grid grid-cols-7 gap-2">
                          {daysOfWeek.map((day) => {
                            const isSelected =
                              timeSettings.workingDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setTimeSettings((prev) => ({
                                      ...prev,
                                      workingDays: prev.workingDays.filter(
                                        (d) => d !== day,
                                      ),
                                    }));
                                  } else {
                                    setTimeSettings((prev) => ({
                                      ...prev,
                                      workingDays: [...prev.workingDays, day],
                                    }));
                                  }
                                }}
                                className={`py-2 px-1 text-center rounded-lg text-sm font-medium transition-all ${
                                  isSelected
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Working Hours */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <label className="font-medium text-gray-700 block mb-3">
                          Working Hours
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-600 block mb-2">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={timeSettings.startTime}
                              onChange={(e) =>
                                setTimeSettings((prev) => ({
                                  ...prev,
                                  startTime: e.target.value,
                                }))
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600 block mb-2">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={timeSettings.endTime}
                              onChange={(e) =>
                                setTimeSettings((prev) => ({
                                  ...prev,
                                  endTime: e.target.value,
                                }))
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Slot Duration */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <label className="font-medium text-gray-700 block mb-3">
                          Appointment Duration
                        </label>
                        <div className="grid grid-cols-4 gap-3">
                          {[15, 30, 45, 60].map((duration) => (
                            <button
                              key={duration}
                              type="button"
                              onClick={() =>
                                setTimeSettings((prev) => ({
                                  ...prev,
                                  slotDuration: duration,
                                }))
                              }
                              className={`py-2 px-3 text-center rounded-lg text-sm font-medium transition-all ${
                                timeSettings.slotDuration === duration
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {duration} min
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6">
                  {timeSettings.useCustomSettings ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Custom Schedule Active
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Working Days:</span>
                          <p className="font-medium text-gray-800 mt-1">
                            {timeSettings.workingDays.join(", ")}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Hours:</span>
                          <p className="font-medium text-gray-800 mt-1">
                            {timeSettings.startTime} - {timeSettings.endTime}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Slot Duration:</span>
                          <p className="font-medium text-gray-800 mt-1">
                            {timeSettings.slotDuration} minutes
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Default Schedule
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Monday - Friday, 2:00 PM - 8:00 PM (30-minute
                        appointments)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isEdit ? (
              <button
                onClick={updateProfile}
                className="px-4 py-1 border border-primary text-sm rounded-full mt-5 hover:bg-primary hover:text-white transition-all"
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => setIsEdit(true)}
                className="px-4 py-1 border border-primary text-sm rounded-full mt-5 hover:bg-primary hover:text-white transition-all"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    )
  );
};

export default DoctorProfile;
