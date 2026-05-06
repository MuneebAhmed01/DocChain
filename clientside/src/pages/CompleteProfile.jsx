import React, { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";

const CompleteProfile = () => {
  const { token, setToken, setAuthStatus } = useContext(AppContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phone_number: "",
    age: "",
    gender: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const GENDER_OPTIONS = ["Male", "Female", "Prefer not to say"];

  const normalizePakistanPhone = (input) => {
    const digits = String(input || "").replace(/\D/g, "");
    if (!digits) return "";

    if (digits.startsWith("92")) {
      return `92${digits.slice(2).replace(/^0+/, "")}`;
    }
    if (digits.startsWith("0")) {
      return `92${digits.replace(/^0+/, "")}`;
    }
    return `92${digits}`;
  };

  const getLocalPakistanPhone = (input) => {
    const digits = String(input || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("92")) return digits.slice(2);
    if (digits.startsWith("0")) return digits.replace(/^0+/, "");
    return digits;
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validateForm = () => {
    console.log("Validating form:", formData);
    const newErrors = {};

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = "Phone number is required";
    } else {
      const digits = formData.phone_number.replace(/\D/g, "");
      console.log("Phone digits:", digits);
      // More lenient validation - just check if it's 10 digits and starts with 3
      if (digits.length !== 10 || !digits.startsWith("3")) {
        newErrors.phone_number =
          "Use 3XXXXXXXXX format (10 digits starting with 3)";
      }
    }

    if (!formData.age || parseInt(formData.age, 10) < 18) {
      newErrors.age = "Age must be 18 or above";
    }

    if (!formData.gender) {
      newErrors.gender = "Gender selection is required";
    }

    console.log("Validation errors:", newErrors);
    return newErrors;
  };

  const handleSubmit = async () => {
    console.log("handleSubmit called", formData);
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix highlighted fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizePakistanPhone(formData.phone_number);
      console.log("Submitting profile data:", {
        phone_number: normalizedPhone,
        age: formData.age,
        gender: formData.gender,
      });

      const { data } = await axiosInstance.post("/api/user/complete-profile", {
        phone_number: normalizedPhone,
        age: formData.age,
        gender: formData.gender,
      });

      console.log("API response:", data);

      if (data.success) {
        console.log("Profile completed, updating auth status");
        // Update auth status to fully authenticated
        setToken(token, "FULLY_AUTHENTICATED");

        toast.success("Profile completed successfully!");
        console.log("Navigating to home");
        navigate("/");
      } else {
        toast.error(data.message || "Failed to complete profile");
      }
    } catch (error) {
      console.error("Error completing profile:", error);
      toast.error(
        error.response?.data?.message || "Failed to complete profile",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setToken(false);
    setAuthStatus("NONE");
    localStorage.removeItem("token");
    localStorage.removeItem("authStatus");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center px-8 py-8">
      <div className="w-full max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-semibold text-gray-900 mb-4">
            Complete Your
            <span className="text-blue-500"> Profile</span>
          </h1>
          <p className="text-lg text-gray-500">
            Please complete your profile to continue using the platform
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-10 pt-2">
          <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8 lg:py-4">
            {/* Phone Number - Left Column */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="flex items-center">
                <span className="rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                  +92
                </span>
                <input
                  className={`w-full rounded-r-lg border bg-white px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phone_number
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  type="tel"
                  placeholder="3001234567"
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    console.log("Input changed:", digits);
                    updateField("phone_number", digits.slice(0, 10));
                  }}
                  value={formData.phone_number}
                />
              </div>
              {errors.phone_number && (
                <p className="mt-2 text-xs text-red-500 font-medium">
                  {errors.phone_number}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Enter your 10-digit mobile number starting with 3
              </p>
              {/* Back to Login - Only visible on mobile */}
              <div className="mt-4 lg:hidden text-center">
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  Cancel and return to login
                </button>
              </div>
            </div>

            {/* Age Slider - Middle Column */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              <div
                className={`rounded-lg border bg-white p-6 transition-all duration-200 ${
                  errors.age
                    ? "border-red-500 focus:ring-2 focus:ring-red-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-gray-500">18</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {formData.age || 18} years
                  </span>
                  <span className="text-xs text-gray-500">80</span>
                </div>
                <input
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-gray-300 transition-colors"
                  type="range"
                  min="18"
                  max="80"
                  step="1"
                  onChange={(e) => updateField("age", e.target.value)}
                  value={formData.age || 18}
                />
              </div>
              {errors.age && (
                <p className="mt-2 text-xs text-red-500 font-medium">
                  {errors.age}
                </p>
              )}
            </div>

            {/* Gender - Right Column */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <div className="space-y-2">
                {GENDER_OPTIONS.map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => updateField("gender", gender)}
                    className={`w-full px-4 py-3 text-sm font-medium rounded-lg border transition-all duration-200 text-left ${
                      formData.gender === gender
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
              {errors.gender && (
                <p className="mt-2 text-xs text-red-500 font-medium">
                  {errors.gender}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button - Full Width */}
          <div >
            <button
              onClick={() => {
                console.log("Button clicked!");
                handleSubmit();
              }}
              disabled={
                isSubmitting ||
                !formData.phone_number ||
                !formData.gender ||
                !formData.age
              }
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-base font-semibold text-white transition-all duration-200 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm hover:shadow-md"
            >
              {isSubmitting ? "Completing Profile..." : "Complete Profile"}
            </button>
          </div>

          {/* Back to Login - Only visible on desktop */}
          <div className="mt-6 text-center hidden lg:block">
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              Cancel and return to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
