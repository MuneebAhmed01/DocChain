import React, { useContext, useState, useRef, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";
import { getProfilePicUrl, getDefaultAvatarUrl } from "../utils/profileHelpers";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  UserCircle,
  Camera,
  Edit2,
  Save,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import healthTips from "../data/healthTips";

const MyProfile = () => {
  const { userData, setUserData, token, backendUrl, loadUserProfileData } =
    useContext(AppContext);

  const [isEdit, setIsEdit] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [localAge, setLocalAge] = useState(18);
  const [tipIndex, setTipIndex] = useState(0);

  // Handle profile picture upload
  const handleProfilePicUpload = async (file) => {
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const { data } = await axiosInstance.post(
        backendUrl + "/api/user/upload-profile-pic",
        formData,
        { headers: { token } },
      );

      if (data.success) {
        toast.success(data.message);
        // Update global state with complete updated user data
        if (data.user) {
          setUserData(data.user);
        } else {
          // Fallback: Update local state with new profile picture
          setUserData((prev) => ({
            ...prev,
            profilePic: data.profilePic,
          }));
        }
        setPreviewImage(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(
        error.response?.data?.message || "Failed to upload profile picture",
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload immediately
      handleProfilePicUpload(file);
    }
  };

  // Update user profile data
  const updateUserProfileData = async () => {
    // Client-side validation
    const newErrors = {};
    if (!userData.name || userData.name.trim().length === 0) {
      newErrors.name = "Name is required";
    }
    if (!userData.phone || userData.phone.trim().length < 6) {
      newErrors.phone = "Valid phone number is required";
    }
    // Address is optional — do not require address.line1 on profile update
    if (!userData.gender || userData.gender === "Not Selected") {
      newErrors.gender = "Please select a gender option";
    }
    // Ensure age >= 18
    const age =
      localAge ||
      (userData.dob !== "Not Selected"
        ? new Date().getFullYear() - new Date(userData.dob).getFullYear()
        : 0);
    if (!age || age < 18) {
      newErrors.dob = "User must be 18 years or older";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the highlighted fields");
      return;
    }

    try {
      const formData = new FormData();

      // Ensure we send a dob derived from the selected age (use Jan 1 of birth year)
      const birthYear = new Date().getFullYear() - age;
      const computedDob = `${birthYear}-01-01`;

      // Normalize phone to Pakistani format with country code 92
      let phoneDigits = (userData.phone || "").toString().replace(/\D/g, "");
      if (phoneDigits.startsWith("0"))
        phoneDigits = phoneDigits.replace(/^0+/, "");
      if (phoneDigits.startsWith("92"))
        phoneDigits = phoneDigits.slice(
          phoneDigits.indexOf("92") === 0 ? 2 : 0,
        );
      // finalPhone will be prefixed with 92
      const finalPhone = phoneDigits ? `92${phoneDigits}` : "";

      formData.append("name", userData.name);
      formData.append("phone", finalPhone);
      formData.append("address", JSON.stringify(userData.address));
      formData.append("gender", userData.gender);
      formData.append("dob", computedDob);

      const { data } = await axiosInstance.post(
        backendUrl + "/api/user/update-profile",
        formData,
        { headers: { token } },
      );

      if (data.success) {
        toast.success(data.message);
        await loadUserProfileData();
        setIsEdit(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  useEffect(() => {
    // Initialize localAge from existing dob when userData loads
    if (userData && userData.dob && userData.dob !== "Not Selected") {
      try {
        const a =
          new Date().getFullYear() - new Date(userData.dob).getFullYear();
        setLocalAge(a >= 18 ? a : 18);
      } catch (e) {
        setLocalAge(18);
      }
    }
  }, [userData]);

  useEffect(() => {
    // pick an initial random tip
    setTipIndex(Math.floor(Math.random() * healthTips.length));
  }, []);

  const pickNewTip = () => {
    if (!healthTips || healthTips.length === 0) return;
    let idx = Math.floor(Math.random() * healthTips.length);
    // ensure different tip
    if (healthTips.length > 1) {
      while (idx === tipIndex)
        idx = Math.floor(Math.random() * healthTips.length);
    }
    setTipIndex(idx);
  };

  // Show default avatar component
  const DefaultAvatar = ({ size = "w-32 h-32" }) => (
    <div
      className={`${size} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white`}
    >
      <UserCircle
        className={`${size === "w-32 h-32" ? "w-20 h-20" : "w-12 h-12"}`}
      />
    </div>
  );

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">
            Manage your personal information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card - Left Side */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              {/* Profile Picture */}
              <div className="relative inline-block mb-6">
                {previewImage || getProfilePicUrl(userData) ? (
                  <img
                    src={previewImage || getProfilePicUrl(userData, true)}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <DefaultAvatar />
                )}

                {/* Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Name */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {userData.name}
              </h2>
              <p className="text-gray-600 mb-6">{userData.email}</p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-blue-600">
                    {userData.gender !== "Not Selected" ? userData.gender : "—"}
                  </p>
                  <p className="text-sm text-gray-600">Gender</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-purple-600">
                    {userData.dob !== "Not Selected"
                      ? new Date().getFullYear() -
                        new Date(userData.dob).getFullYear()
                      : "—"}
                  </p>
                  <p className="text-sm text-gray-600">Age</p>
                </div>
              </div>
            </div>
          </div>

          {/* Information Cards - Right Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Contact Information
                </h3>
                {!isEdit && (
                  <button
                    onClick={() => {
                      setErrors({});
                      setIsEdit(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {/* Email */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Email Address</p>
                    {isEdit ? (
                      <input
                        type="email"
                        value={userData.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        title="Email cannot be changed"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {userData.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                    {isEdit ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-2 rounded-l-lg bg-gray-100 border border-r-0 border-gray-300">
                          +92
                        </span>
                        <input
                          type="tel"
                          value={
                            // display without country code for user convenience
                            (() => {
                              if (!userData.phone) return "";
                              const digits = userData.phone.replace(/\D/g, "");
                              if (digits.startsWith("92"))
                                return digits.slice(2).replace(/^0+/, "");
                              if (digits.startsWith("0"))
                                return digits.replace(/^0+/, "");
                              return digits;
                            })()
                          }
                          onChange={(e) => {
                            const raw = e.target.value || "";
                            // keep user input as-is in the visible field; final normalization happens on save
                            setUserData((prev) => ({ ...prev, phone: raw }));
                            setErrors((prev) => ({
                              ...prev,
                              phone: undefined,
                            }));
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="3XXXXXXXXX or 0300XXXXXXX"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {userData.phone || "Not provided"}
                      </p>
                    )}
                    {errors.phone && isEdit && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Address</p>
                    {isEdit ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={userData.address.line1}
                          onChange={(e) =>
                            setUserData((prev) => ({
                              ...prev,
                              address: {
                                ...prev.address,
                                line1: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Address line 1"
                        />
                        {errors.address && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.address}
                          </p>
                        )}
                        <input
                          type="text"
                          value={userData.address.line2}
                          onChange={(e) =>
                            setUserData((prev) => ({
                              ...prev,
                              address: {
                                ...prev.address,
                                line2: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Address line 2"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {userData.address.line1 ? (
                          <>
                            {userData.address.line1}
                            {userData.address.line2 && <br />}
                            {userData.address.line2}
                          </>
                        ) : (
                          <span className="text-gray-400">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  Basic Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gender */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-6 h-6 text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Gender</p>
                    {isEdit ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value="Male"
                            checked={userData.gender === "Male"}
                            onChange={() =>
                              setUserData((prev) => ({
                                ...prev,
                                gender: "Male",
                              }))
                            }
                            className="accent-blue-600"
                          />
                          <span className="font-semibold text-gray-800">
                            Male
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value="Female"
                            checked={userData.gender === "Female"}
                            onChange={() =>
                              setUserData((prev) => ({
                                ...prev,
                                gender: "Female",
                              }))
                            }
                            className="accent-pink-600"
                          />
                          <span className="font-semibold text-gray-800">
                            Female
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value="Prefer not to say"
                            checked={userData.gender === "Prefer not to say"}
                            onChange={() =>
                              setUserData((prev) => ({
                                ...prev,
                                gender: "Prefer not to say",
                              }))
                            }
                            className="accent-gray-600"
                          />
                          <span className="font-semibold text-gray-800">
                            Prefer not to say
                          </span>
                        </label>
                      </div>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {userData.gender !== "Not Selected"
                          ? userData.gender
                          : "—"}
                      </p>
                    )}
                    {errors.gender && isEdit && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.gender}
                      </p>
                    )}
                  </div>
                </div>

                {/* Health Tip */}
                <div
                  className="flex items-center gap-4"
                  onClick={() => pickNewTip()}
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-600 mb-1">Health Tip</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          pickNewTip();
                        }}
                        title="New tip"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="mt-1">
                      <p className="text-gray-900 font-medium">
                        {healthTips[tipIndex]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {isEdit ? (
                <>
                  <button
                    onClick={updateUserProfileData}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEdit(false);
                      setErrors({});
                      loadUserProfileData(); // Reset to original data
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setErrors({});
                    setIsEdit(true);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-5 h-5" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
