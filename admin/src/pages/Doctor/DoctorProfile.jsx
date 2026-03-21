import React, { useContext, useEffect, useState } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import DoctorOnlineSettings from "../../components/DoctorOnlineSettings.jsx";

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
        { headers: { dToken } }
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
              <div className="flex items-center text-yellow-500">
                <span>★</span>
                <span className="text-gray-700 ml-1 font-medium">
                  {profileData.averageRating || "0.0"}
                </span>
              </div>
              <span className="text-gray-400 text-sm">
                ({profileData.ratingCount || 0} reviews)
              </span>
              <span className="hidden sm:block text-gray-300">|</span>
              <p className="text-gray-600 font-medium">
                {profileData.degree} - {profileData.speciality}
              </p>
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs border border-blue-100">
                {profileData.experience}
              </span>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">About</h4>
              <p className="text-gray-600 mt-2 leading-relaxed text-sm sm:text-base">
                {profileData.about}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-gray-500 text-sm font-medium">Appointment Fee</p>
                <div className="text-xl font-bold text-gray-800 mt-1">
                  {currency}
                  {isEdit ? (
                    <input
                      type="number"
                      className="ml-2 border border-gray-300 rounded px-2 py-1 w-24 text-base focus:ring-2 focus:ring-primary outline-none"
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, fees: e.target.value }))
                      }
                      value={profileData.fees}
                    />
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
                            address: { ...prev.address, line1: e.target.value },
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
                            address: { ...prev.address, line2: e.target.value },
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
                  setProfileData((prev) => ({ ...prev, available: !prev.available }))
                }
                checked={profileData.available}
                type="checkbox"
                id="available-check"
                className="w-4 h-4 text-primary focus:ring-primary rounded"
              />
              <label htmlFor="available-check" className="font-medium text-gray-700">
                Open for Appointments
              </label>
            </div>

            {/* Time Settings Section */}
            <div className="mt-10 border-t pt-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Schedule Settings</h3>
                  <p className="text-sm text-gray-500">Working hours and availability</p>
                </div>
                {isEdit && (
                  <label className="inline-flex items-center cursor-pointer bg-gray-100 p-2 rounded-lg">
                    <span className="mr-3 text-sm font-medium text-gray-700">Custom Schedule</span>
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={timeSettings.useCustomSettings}
                      onChange={(e) => setTimeSettings(prev => ({ ...prev, useCustomSettings: e.target.checked }))}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                )}
              </div>

              {isEdit && timeSettings.useCustomSettings ? (
                <div className="space-y-6 bg-gray-50 p-4 sm:p-6 rounded-xl">
                  {/* Day Picker: 4 columns on mobile, 7 on desktop */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase">Working Days</label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {daysOfWeek.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const isSelected = timeSettings.workingDays.includes(day);
                            setTimeSettings(prev => ({
                              ...prev,
                              workingDays: isSelected 
                                ? prev.workingDays.filter(d => d !== day) 
                                : [...prev.workingDays, day]
                            }));
                          }}
                          className={`py-2 rounded-lg text-xs font-bold transition-all ${
                            timeSettings.workingDays.includes(day)
                              ? "bg-primary text-white shadow-md"
                              : "bg-white text-gray-400 border border-gray-200"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hours: Stacks on mobile */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Start Time</label>
                      <input 
                        type="time" 
                        value={timeSettings.startTime}
                        className="w-full border-gray-200 rounded-lg p-2 focus:ring-primary"
                        onChange={(e) => setTimeSettings(prev => ({ ...prev, startTime: e.target.value }))}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">End Time</label>
                      <input 
                        type="time" 
                        value={timeSettings.endTime}
                        className="w-full border-gray-200 rounded-lg p-2 focus:ring-primary"
                        onChange={(e) => setTimeSettings(prev => ({ ...prev, endTime: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${timeSettings.useCustomSettings ? 'bg-green-500' : 'bg-gray-400'}`}></div>
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
    )
  );
};

export default DoctorProfile;
