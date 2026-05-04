import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";

const Onboarding = () => {
  const { token, setToken, userData, loadUserProfileData } = useContext(AppContext);
  const navigate = useNavigate();

  // Form state
  const [step, setStep] = useState("phone"); // phone, otp, details
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: "",
    otp_code: "",
    age: "",
    gender: "",
  });

  // UI state
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpId, setOtpId] = useState(null);
  const [showOtpCode, setShowOtpCode] = useState(false); // For development

  // Validation state
  const [errors, setErrors] = useState({});

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // Check if already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data } = await axiosInstance.get("/api/onboarding/status");
        if (data.success && data.onboarding_completed) {
          toast.info("Onboarding already completed!");
          navigate("/");
        }
      } catch (error) {
        console.log("Checking onboarding status...");
      }
    };

    if (token) {
      checkOnboardingStatus();
    }
  }, [token, navigate]);

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, phone_number: value });
    if (errors.phone_number) {
      setErrors({ ...errors, phone_number: "" });
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setFormData({ ...formData, otp_code: value });
    if (errors.otp_code) {
      setErrors({ ...errors, otp_code: "" });
    }
  };

  const handleAgeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, age: value });
    if (errors.age) {
      setErrors({ ...errors, age: "" });
    }
  };

  const handleGenderChange = (e) => {
    setFormData({ ...formData, gender: e.target.value });
    if (errors.gender) {
      setErrors({ ...errors, gender: "" });
    }
  };

  // Validate phone number (E.164 format)
  const validatePhone = (phone) => {
    // Accept formats: +1234567890, +91-1234-567890, etc.
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\D/g, ""));
  };

  const sendOTP = async () => {
    try {
      setLoading(true);
      const newErrors = {};

      if (!formData.phone_number.trim()) {
        newErrors.phone_number = "Phone number is required";
      } else if (!validatePhone(formData.phone_number)) {
        newErrors.phone_number =
          "Invalid phone number. Use format: +14155238886 or +91-9876543210";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      const { data } = await axiosInstance.post("/api/onboarding/send-otp", {
        phone_number: formData.phone_number,
      });

      if (data.success) {
        setOtpSent(true);
        setOtpId(data.otp_id);
        // Show OTP in development
        if (data.otp_code) {
          setShowOtpCode(true);
          toast.success(`OTP: ${data.otp_code} (Development only)`);
        }
        toast.success("OTP sent successfully!");
        setStep("otp");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    try {
      setLoading(true);
      const newErrors = {};

      if (!formData.otp_code.trim()) {
        newErrors.otp_code = "OTP code is required";
      } else if (formData.otp_code.length !== 6) {
        newErrors.otp_code = "OTP must be 6 digits";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      const { data } = await axiosInstance.post("/api/onboarding/verify-otp", {
        phone_number: formData.phone_number,
        otp_code: formData.otp_code,
      });

      if (data.success) {
        setOtpVerified(true);
        toast.success("OTP verified successfully!");
        setStep("details");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      setLoading(true);
      const newErrors = {};

      if (!formData.age) {
        newErrors.age = "Age is required";
      } else if (parseInt(formData.age) < 18 || parseInt(formData.age) > 120) {
        newErrors.age = "Age must be between 18 and 120";
      }

      if (!formData.gender) {
        newErrors.gender = "Gender is required";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      const { data } = await axiosInstance.post(
        "/api/onboarding/complete",
        {
          phone_number: formData.phone_number,
          age: formData.age,
          gender: formData.gender,
        }
      );

      if (data.success) {
        toast.success("Onboarding completed successfully!");
        await loadUserProfileData();
        navigate("/");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtpSent(false);
    setOtpVerified(false);
    setFormData({ ...formData, otp_code: "" });
    setErrors({});
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 border rounded-xl text-zinc-600 text-sm shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
        <p className="text-zinc-500 mb-6">
          We need a few details to get you started
        </p>

        {/* STEP 1: PHONE */}
        {step === "phone" && (
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                placeholder="+14155238886"
                value={formData.phone_number}
                onChange={handlePhoneChange}
                disabled={otpSent}
                className={`w-full p-2 border rounded ${
                  errors.phone_number ? "border-red-500" : "border-zinc-300"
                } focus:outline-none focus:ring-2 focus:ring-primary`}
              />
              {errors.phone_number && (
                <p className="text-xs text-red-500 mt-1">{errors.phone_number}</p>
              )}
              <p className="text-xs text-zinc-400 mt-1">
                E.164 format: +1-10 digits
              </p>
            </div>

            <button
              onClick={sendOTP}
              disabled={loading || otpSent}
              className={`w-full py-2 rounded-md text-white font-medium transition ${
                loading || otpSent
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              {loading ? "Sending..." : otpSent ? "OTP Sent ✓" : "Send OTP"}
            </button>

            {otpSent && (
              <p className="text-xs text-green-600 text-center">
                ✓ OTP sent to {formData.phone_number}
              </p>
            )}
          </div>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === "otp" && (
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Verification Code</label>
              <input
                type="text"
                placeholder="000000"
                value={formData.otp_code}
                onChange={handleOtpChange}
                maxLength={6}
                inputMode="numeric"
                disabled={otpVerified}
                className={`w-full p-2 border rounded text-center text-2xl tracking-widest ${
                  errors.otp_code ? "border-red-500" : "border-zinc-300"
                } focus:outline-none focus:ring-2 focus:ring-primary`}
              />
              {errors.otp_code && (
                <p className="text-xs text-red-500 mt-1">{errors.otp_code}</p>
              )}
              {showOtpCode && (
                <p className="text-xs text-yellow-600 mt-1">
                  Development mode: OTP shown in toast notification
                </p>
              )}
            </div>

            <button
              onClick={verifyOTP}
              disabled={loading || otpVerified}
              className={`w-full py-2 rounded-md text-white font-medium transition ${
                loading || otpVerified
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              {loading
                ? "Verifying..."
                : otpVerified
                ? "OTP Verified ✓"
                : "Verify OTP"}
            </button>

            {otpVerified && (
              <p className="text-xs text-green-600 text-center">
                ✓ Phone number verified
              </p>
            )}

            <button
              onClick={handleResendOTP}
              disabled={loading}
              className="w-full py-2 rounded-md border border-primary text-primary hover:bg-primary/5 transition"
            >
              Resend OTP
            </button>
          </div>
        )}

        {/* STEP 3: DETAILS */}
        {step === "details" && (
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Age</label>
              <input
                type="number"
                placeholder="25"
                value={formData.age}
                onChange={handleAgeChange}
                min="18"
                max="120"
                className={`w-full p-2 border rounded ${
                  errors.age ? "border-red-500" : "border-zinc-300"
                } focus:outline-none focus:ring-2 focus:ring-primary`}
              />
              {errors.age && (
                <p className="text-xs text-red-500 mt-1">{errors.age}</p>
              )}
            </div>

            <div>
              <label className="block font-medium mb-2">Gender</label>
              <select
                value={formData.gender}
                onChange={handleGenderChange}
                className={`w-full p-2 border rounded ${
                  errors.gender ? "border-red-500" : "border-zinc-300"
                } focus:outline-none focus:ring-2 focus:ring-primary`}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && (
                <p className="text-xs text-red-500 mt-1">{errors.gender}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-blue-700">
                ✓ You will receive WhatsApp appointment reminders
              </p>
            </div>

            <button
              onClick={completeOnboarding}
              disabled={loading}
              className={`w-full py-2 rounded-md text-white font-medium transition ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              {loading ? "Completing..." : "Complete Profile"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
