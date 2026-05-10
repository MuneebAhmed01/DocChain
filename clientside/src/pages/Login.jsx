import React, { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import { GoogleLogin } from "@react-oauth/google";
import { assets } from "../assets/assets";
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().trim().min(1, "Password is required"),
});

const signupSchema = z.object({
  name: z.string().trim().min(1, "Full name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .trim()
    .min(1, "Password is required")
    .regex(
      /^(?=.*[A-Z]).{8,}$/,
      "Password must be at least 8 characters long and contain at least one uppercase letter",
    ),
});

const getZodFieldErrors = (error) => {
  const fieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path?.[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
};

const Login = () => {
  const { token, setToken } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  const getInitialAuthMode = () => {
    const searchParams = new URLSearchParams(location.search);
    const urlMode = searchParams.get("mode");
    if (urlMode === "login") return "Login";
    if (urlMode === "signup") return "Sign Up";
    return location.state === "Login" ? "Login" : "Sign Up";
  };

  const [state, setState] = useState(getInitialAuthMode());
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    otp: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fpStep, setFpStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirmPassword, setFpConfirmPassword] = useState("");
  const [fpError, setFpError] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpOtpCooldown, setFpOtpCooldown] = useState(0);

  const isSignup = state === "Sign Up";

  // Forgot Password Handlers
  const handleSendFpOtp = async () => {
    if (!fpEmail) {
      setFpError("Email is required");
      return;
    }
    if (!fpEmail.includes("@")) {
      setFpError("Invalid email address");
      return;
    }

    setFpLoading(true);
    setFpError("");
    try {
      const { data } = await axiosInstance.post("/api/user/send-otp-reset", { email: fpEmail });
      if (data.success) {
        setFpStep(2);
        toast.success("OTP sent to your email!");
        setFpOtpCooldown(60);
        const timer = setInterval(() => {
          setFpOtpCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setFpError(data.message);
      }
    } catch (error) {
      setFpError(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setFpLoading(false);
    }
  };

  const handleVerifyFpOtp = async () => {
    if (fpOtp.length !== 6) {
      setFpError("Enter 6-digit OTP");
      return;
    }

    setFpLoading(true);
    setFpError("");
    try {
      const { data } = await axiosInstance.post("/api/user/verify-otp", { 
        email: fpEmail, 
        otp: fpOtp,
        purpose: 'password_reset'
      });
      if (data.success) {
        setFpStep(3);
        toast.success("OTP verified!");
      } else {
        setFpError(data.message);
      }
    } catch (error) {
      setFpError(error.response?.data?.message || "Verification failed");
    } finally {
      setFpLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (fpNewPassword.length < 8) {
      setFpError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(fpNewPassword)) {
      setFpError("Password must contain at least one uppercase letter");
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      setFpError("Passwords do not match");
      return;
    }

    setFpLoading(true);
    setFpError("");
    try {
      const { data } = await axiosInstance.post("/api/user/reset-password", {
        email: fpEmail,
        otp: fpOtp,
        newPassword: fpNewPassword
      });
      if (data.success) {
        toast.success("Password reset successfully! Please login.");
        setShowForgotPassword(false);
        setFpStep(1);
        setFpEmail("");
        setFpOtp("");
        setFpNewPassword("");
        setFpConfirmPassword("");
      } else {
        setFpError(data.message);
      }
    } catch (error) {
      setFpError(error.response?.data?.message || "Failed to reset password");
    } finally {
      setFpLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((c) => ({ ...c, [field]: value }));
    setFormErrors((c) => ({ ...c, [field]: "" }));
  };

  // Send OTP function
  const sendOTP = async () => {
    if (!formData.email) {
      setFormErrors((c) => ({ ...c, email: "Email is required to send OTP" }));
      return;
    }

    if (!formData.email.includes("@")) {
      setFormErrors((c) => ({
        ...c,
        email: "Please enter a valid email address",
      }));
      return;
    }

    setSendingOtp(true);
    setFormErrors((c) => ({ ...c, otp: "" }));

    try {
      const { data } = await axiosInstance.post("/api/user/send-otp", {
        email: formData.email,
      });

      if (data.success) {
        setOtpSent(true);
        toast.success("OTP sent to your email!");

        // Start cooldown timer
        setOtpCooldown(60);
        const timer = setInterval(() => {
          setOtpCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(data.message || "Failed to send OTP");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP function
  const verifyOTP = async () => {
    if (!formData.otp) {
      setFormErrors((c) => ({ ...c, otp: "OTP is required" }));
      return;
    }

    if (formData.otp.length !== 6) {
      setFormErrors((c) => ({ ...c, otp: "OTP must be 6 digits" }));
      return;
    }

    setVerifyingOtp(true);
    setFormErrors((c) => ({ ...c, otp: "" }));

    try {
      const { data } = await axiosInstance.post("/api/user/verify-otp", {
        email: formData.email,
        otp: formData.otp,
      });

      if (data.success) {
        setOtpVerified(true);
        toast.success("Email verified successfully!");
      } else {
        setFormErrors((c) => ({ ...c, otp: data.message || "Invalid OTP" }));
        toast.error(data.message || "Invalid OTP");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to verify OTP";
      setFormErrors((c) => ({ ...c, otp: errorMessage }));
      toast.error(errorMessage);
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Reset OTP state when switching auth mode
  const switchAuthMode = () => {
    setState((c) => (c === "Sign Up" ? "Login" : "Sign Up"));
    setFormErrors({});
    setOtpSent(false);
    setOtpVerified(false);
    setOtpCooldown(0);
    setFormData((c) => ({ ...c, otp: "" }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFormErrors((c) => ({ ...c, profileImage: "" }));

    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setFormErrors((c) => ({
          ...c,
          profileImage: "Image size must be less than 5MB",
        }));
        setProfileImage(null);
        if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
        setProfileImagePreview("");
        return;
      }
    }

    setProfileImage(file);
    if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
    setProfileImagePreview(file ? URL.createObjectURL(file) : "");
  };

  useEffect(() => {
    return () => {
      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
    };
  }, [profileImagePreview]);

  const submitLabel = useMemo(() => {
    if (isSignup) {
      if (!otpVerified) return "Verify Email First";
      return "Create Account";
    }
    return "Sign In";
  }, [isSignup, otpVerified]);

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFormErrors({});

    if (!isSignup) {
      const validation = loginSchema.safeParse({
        email: formData.email,
        password: formData.password,
      });
      if (!validation.success) {
        setFormErrors(getZodFieldErrors(validation.error));
        toast.error("Please fix highlighted fields");
        return;
      }
    }

    if (isSignup) {
      const validation = signupSchema.safeParse(formData);
      const newErrors = validation.success
        ? {}
        : getZodFieldErrors(validation.error);
      if (!profileImage) newErrors.profileImage = "Profile image is required";
      if (!otpVerified) newErrors.otp = "Email verification is required";
      if (Object.keys(newErrors).length > 0) {
        setFormErrors(newErrors);
        toast.error("Please fix highlighted fields");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (isSignup) {
        const signupData = new FormData();
        signupData.append("name", formData.name);
        signupData.append("email", formData.email);
        signupData.append("password", formData.password);
        signupData.append("image", profileImage);
        const { data } = await axiosInstance.post(
          "/api/user/register",
          signupData,
        );
        if (data.success) {
          setToken(data.token, "PENDING_PROFILE");
          navigate("/complete-profile");
        } else toast.error(data.message);
      } else {
        const { data } = await axiosInstance.post("/api/user/login", {
          email: formData.email,
          password: formData.password,
        });
        if (data.success) {
          setToken(data.token, "FULLY_AUTHENTICATED");
          navigate("/");
        } else toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlMode = searchParams.get("mode");
    if (urlMode === "login") setState("Login");
    else if (urlMode === "signup") setState("Sign Up");
  }, [location.search]);

  useEffect(() => {
    if (token && state === "Login") navigate("/");
  }, [token, state, navigate]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .auth-wrap {
          height: calc(100vh - 70px);
          max-height: 90vh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }

        .auth-left {
          flex: 0 0 44%;
          background: linear-gradient(145deg, #0a1628 0%, #0f2549 45%, #0c3d6b 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 30px 38px 0;
          overflow: hidden;
        }
        .auth-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 50% at 15% 8%, rgba(56,189,248,0.16) 0%, transparent 55%),
            radial-gradient(ellipse 50% 70% at 85% 88%, rgba(99,102,241,0.18) 0%, transparent 50%);
          pointer-events: none;
        }
        .grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(56,189,248,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.035) 1px, transparent 1px);
          background-size: 36px 36px;
          pointer-events: none;
        }
        .glow-orb { position: absolute; border-radius: 50%; filter: blur(55px); pointer-events: none; }
        .orb-a { width: 220px; height: 220px; background: rgba(56,189,248,0.1); top: -50px; left: -50px; }
        .orb-b { width: 180px; height: 180px; background: rgba(99,102,241,0.13); bottom: 60px; right: -30px; }

        .left-inner { position: relative; z-index: 2; display: flex; flex-direction: column; height: 100%; }

        .brand { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.3px; line-height: 1; margin-bottom: 18px; }
        .brand-doc { color: #fff; }
        .brand-chain { color: #38bdf8; }

        .pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.22);
          border-radius: 100px; padding: 4px 12px; margin-bottom: 12px;
        }
        .pill-dot { width: 5px; height: 5px; border-radius: 50%; background: #38bdf8; animation: blink 2s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .pill-txt { font-size: 10px; font-weight: 500; color: #7dd3fc; letter-spacing: 0.8px; text-transform: uppercase; }

        .left-heading {
          font-family: 'Syne', sans-serif;
          font-size: clamp(18px, 2.2vw, 26px);
          font-weight: 700; color: #fff; line-height: 1.25;
          margin-bottom: 8px; letter-spacing: -0.3px;
          white-space: pre-line;
        }
        .left-desc {
          font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.45);
          font-weight: 300; max-width: 290px; margin-bottom: 18px;
        }

        .features { display: flex; flex-direction: column; gap: 9px; margin-bottom: 20px; }
        .feat { display: flex; align-items: center; gap: 9px; }
        .feat-icon {
          width: 26px; height: 26px; border-radius: 6px;
          background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.18);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .feat-icon svg { width: 12px; height: 12px; }
        .feat-txt { font-size: 11.5px; color: rgba(255,255,255,0.58); }

        .doc-card {
          position: relative; z-index: 2;
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px;
          padding: 14px 18px 0;
          margin-top: 8px;
          overflow: hidden;
          display: flex; align-items: flex-end; gap: 16px;
        }
        .doc-info { padding-bottom: 14px; }
        .doc-label { font-size: 9px; font-weight: 500; color: rgba(255,255,255,0.32); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
        .doc-name { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 2px; }
        .doc-spec { font-size: 10.5px; color: #38bdf8; }
        .doc-img {
          width: 100px; height: 110px; object-fit: cover; object-position: top;
          border-radius: 8px 8px 0 0; display: block; flex-shrink: 0;
        }

        .auth-right {
          flex: 1; background: #f1f5f9;
          display: flex; align-items: center; justify-content: center;
          padding: 20px 28px; overflow: hidden;
        }

        .form-box { width: 100%; max-width: 390px; }

        .form-top { margin-bottom: 18px; }

        .form-title {
          font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 700;
          color: #0f172a; letter-spacing: -0.4px; line-height: 1.1; margin-bottom: 4px;
        }
        .form-title em { font-style: normal; color: #0ea5e9; }

        .form-sub { font-size: 12px; color: #64748b; margin-bottom: 10px; }

        .switch-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 13px; border-radius: 100px;
          border: 1.5px solid #e2e8f0; background: #fff;
          font-size: 11.5px; font-weight: 500; color: #475569;
          cursor: pointer; transition: all 0.18s; font-family: 'DM Sans', sans-serif;
        }
        .switch-btn:hover { border-color: #0ea5e9; color: #0ea5e9; background: #f0f9ff; }
        .switch-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .fields { display: flex; flex-direction: column; gap: 11px; }

        .field { display: flex; flex-direction: column; gap: 4px; }

        .f-label { font-size: 11.5px; font-weight: 500; color: #374151; letter-spacing: 0.1px; }

        .f-input {
          height: 38px; border-radius: 8px; border: 1.5px solid #e2e8f0;
          background: #fff; padding: 0 13px; font-size: 13px;
          font-family: 'DM Sans', sans-serif; color: #0f172a; outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
          width: 100%; box-sizing: border-box;
        }
        .f-input::placeholder { color: #94a3b8; }
        .f-input:hover { border-color: #cbd5e1; }
        .f-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.1); }
        .f-input.err { border-color: #f43f5e; }
        .f-input.err:focus { box-shadow: 0 0 0 3px rgba(244,63,94,0.08); }
        .f-input:disabled { opacity: 0.6; background: #f8fafc; cursor: not-allowed; }

        .f-error { font-size: 10.5px; color: #f43f5e; font-weight: 500; }

        .upload-label {
          height: 48px; border-radius: 8px; border: 1.5px dashed #cbd5e1;
          background: #fff; display: flex; align-items: center; gap: 10px;
          padding: 0 13px; cursor: pointer; transition: all 0.18s;
        }
        .upload-label:hover { border-color: #0ea5e9; background: #f0f9ff; }
        .upload-label.err { border-color: #f43f5e; background: #fff1f2; }
        .upload-label input { display: none; }

        .upload-icon-box {
          width: 30px; height: 30px; border-radius: 7px; background: #e0f2fe;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: background 0.18s;
        }
        .upload-label:hover .upload-icon-box { background: #bae6fd; }
        .upload-label.err .upload-icon-box { background: #ffe4e6; }
        .upload-icon-box svg { width: 14px; height: 14px; }

        .upload-texts { flex: 1; min-width: 0; }
        .upload-main { font-size: 12px; font-weight: 500; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .upload-hint { font-size: 10px; color: #94a3b8; }

        .upload-thumb img { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 2px solid #0ea5e9; }

        .forgot-row { display: flex; justify-content: flex-end; }
        .forgot-btn {
          font-size: 11px; font-weight: 500; color: #0ea5e9;
          background: none; border: none; cursor: pointer; padding: 0;
          font-family: 'DM Sans', sans-serif; transition: color 0.18s;
        }
        .forgot-btn:hover { color: #0284c7; }

        .submit-btn {
          width: 100%; height: 42px; border-radius: 9px;
          background: linear-gradient(135deg, #0284c7, #0ea5e9);
          border: none; color: #fff; font-size: 13.5px; font-weight: 600;
          font-family: 'Syne', sans-serif; cursor: pointer; transition: all 0.18s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 3px 10px rgba(14,165,233,0.3); letter-spacing: 0.1px;
        }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(14,165,233,0.4); }
        .submit-btn:active:not(:disabled) { transform: none; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

        .spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .google-section { margin-top: 10px; }
        .or-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .or-line { flex: 1; height: 1px; background: #e2e8f0; }
        .or-txt { font-size: 10.5px; color: #94a3b8; white-space: nowrap; }

        @media (max-width: 768px) {
          .auth-wrap { height: auto; max-height: none; flex-direction: column; overflow: auto; }
          .auth-left { display: none; }
          .auth-right { padding: 32px 20px; min-height: 100vh; overflow: auto; }
        }
      `}</style>

      <div className="auth-wrap">
        {/* ── LEFT PANEL ── */}
        <div className="auth-left">
          <div className="grid-bg" />
          <div className="glow-orb orb-a" />
          <div className="glow-orb orb-b" />

          <div className="left-inner">
            <div className="brand">
              <span className="brand-doc">DOC</span>
              <span className="brand-chain">CHAIN</span>
            </div>

            <div className="pill">
              <span className="pill-dot" />
              <span className="pill-txt">Healthcare Platform</span>
            </div>

            <h2 className="left-heading">
              {isSignup
                ? "Your health,\none profile."
                : "Good to see\nyou again."}
            </h2>
            <p className="left-desc">
              {isSignup
                ? "Set up once, access everywhere. Book appointments, track consultations, and manage your health data."
                : "Continue managing appointments, reviewing consultations, and accessing your profile."}
            </p>

            <div className="features">
              {[
                {
                  path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
                  label: "Smart appointment scheduling",
                },
                {
                  path: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                  label: "Verified doctor network",
                },
                {
                  path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
                  label: "Complete medical history",
                },
              ].map((f, i) => (
                <div className="feat" key={i}>
                  <div className="feat-icon">
                    <svg
                      fill="none"
                      stroke="#38bdf8"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={f.path}
                      />
                    </svg>
                  </div>
                  <span className="feat-txt">{f.label}</span>
                </div>
              ))}
            </div>

            <div className="doc-card">
              <div className="doc-info">
                <div className="doc-label">Featured Doctor</div>
                <div className="doc-name">Dr. Sarah Mitchell</div>
                <div className="doc-spec">General Physician · 12 yrs exp</div>
              </div>
              <img src={assets.doc1} alt="Doctor" className="doc-img" />
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="auth-right">
          <div className="form-box">
            <div className="form-top">
              <h3 className="form-title">
                {isSignup ? (
                  <>
                    Create <em>Account</em>
                  </>
                ) : (
                  <>
                    Welcome <em>back</em>
                  </>
                )}
              </h3>
              <p className="form-sub">
                {isSignup
                  ? "All fields are required for registration."
                  : "Sign in to continue to your dashboard."}
              </p>
              <button
                type="button"
                onClick={switchAuthMode}
                disabled={isSubmitting}
                className="switch-btn"
              >
                <svg
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                {isSignup ? "Switch to Login" : "Create account"}
              </button>
            </div>

            <div className="fields">
              {isSignup && (
                <div className="field">
                  <label className="f-label">Full Name</label>
                  <input
                    className={`f-input${formErrors.name ? " err" : ""}`}
                    type="text"
                    disabled={isSubmitting}
                    onChange={(e) => updateField("name", e.target.value)}
                    value={formData.name}
                    placeholder="Enter your full name"
                  />
                  {formErrors.name && (
                    <span className="f-error">⚠ {formErrors.name}</span>
                  )}
                </div>
              )}

              <div className="field">
                <label className="f-label">Email Address</label>
                <input
                  className={`f-input${formErrors.email ? " err" : ""}`}
                  type="email"
                  disabled={isSubmitting}
                  onChange={(e) => updateField("email", e.target.value)}
                  value={formData.email}
                  placeholder="you@example.com"
                />
                {formErrors.email && (
                  <span className="f-error">⚠ {formErrors.email}</span>
                )}
              </div>

              {isSignup && (
                <div className="field">
                  <label className="f-label">Profile Photo</label>
                  <label
                    className={`upload-label${formErrors.profileImage ? " err" : ""}`}
                  >
                    <div className="upload-icon-box">
                      <svg
                        fill="none"
                        stroke={formErrors.profileImage ? "#f43f5e" : "#0ea5e9"}
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <div className="upload-texts">
                      <div className="upload-main">
                        {profileImage
                          ? profileImage.name
                          : "Click to upload photo"}
                      </div>
                      <div className="upload-hint">
                        PNG, JPG, WEBP · max 5MB
                      </div>
                    </div>
                    {profileImagePreview && (
                      <div className="upload-thumb">
                        <img src={profileImagePreview} alt="Preview" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isSubmitting}
                      onChange={handleImageChange}
                    />
                  </label>
                  {formErrors.profileImage && (
                    <span className="f-error">⚠ {formErrors.profileImage}</span>
                  )}
                </div>
              )}

              <div className="field">
                <label className="f-label">Password</label>
                <input
                  className={`f-input${formErrors.password ? " err" : ""}`}
                  type="password"
                  disabled={isSubmitting}
                  onChange={(e) => updateField("password", e.target.value)}
                  value={formData.password}
                  placeholder={
                    isSignup
                      ? "Min 8 chars, one uppercase"
                      : "Enter your password"
                  }
                />
                {formErrors.password && (
                  <span className="f-error">⚠ {formErrors.password}</span>
                )}
                {!isSignup && (
                  <div className="forgot-row">
                    <button
                      type="button"
                      className="forgot-btn"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setFpStep(1);
                        setFpEmail("");
                        setFpError("");
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              {isSignup && (
                <div className="field">
                  <label className="f-label">Email Verification</label>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input
                        className={`f-input${formErrors.otp ? " err" : ""}`}
                        type="text"
                        disabled={isSubmitting || !otpSent || otpVerified}
                        onChange={(e) =>
                          updateField(
                            "otp",
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        value={formData.otp}
                        placeholder={
                          otpSent ? "Enter 6-digit OTP" : "Send OTP first"
                        }
                        maxLength={6}
                      />
                      {formErrors.otp && (
                        <span className="f-error">⚠ {formErrors.otp}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={sendOTP}
                      disabled={
                        sendingOtp ||
                        otpCooldown > 0 ||
                        isSubmitting ||
                        otpVerified
                      }
                      className={`h-[38px] px-4 rounded-lg border font-medium text-xs transition-all whitespace-nowrap min-w-[100px] ${
                        otpVerified 
                          ? "bg-green-500 text-white border-green-500" 
                          : "bg-white text-sky-500 border-gray-200 hover:border-sky-500"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {sendingOtp ? (
                        <div className="flex items-center gap-1.5">
                          <div className="spinner !w-3 !h-3 !border-[1.5px]" />
                          Sending...
                        </div>
                      ) : otpVerified ? (
                        "✓ Verified"
                      ) : otpCooldown > 0 ? (
                        `Resend (${otpCooldown}s)`
                      ) : (
                        "Send OTP"
                      )}
                    </button>
                  </div>

                  {otpSent && !otpVerified && (
                    <button
                      type="button"
                      onClick={verifyOTP}
                      disabled={verifyingOtp || isSubmitting || !formData.otp}
                      className="w-full h-[38px] mt-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifyingOtp ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="spinner !w-3 !h-3 !border-[1.5px]" />
                          Verifying...
                        </div>
                      ) : (
                        "Verify OTP"
                      )}
                    </button>
                  )}
                  {otpVerified && (
                    <div className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
                      ✓ Email verified successfully
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onSubmitHandler}
                disabled={
                  isSubmitting ||
                  (!isSignup && (!formData.email || !formData.password)) ||
                  (isSignup &&
                    (!formData.name ||
                      !formData.email ||
                      !formData.password ||
                      !profileImage ||
                      !otpVerified))
                }
                className="submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner" />
                    {isSignup ? "Creating Account…" : "Signing in…"}
                  </>
                ) : (
                  submitLabel
                )}
              </button>

              {!isSignup && (
                <div className="google-section">
                  <div className="or-row">
                    <div className="or-line" />
                    <span className="or-txt">or continue with</span>
                    <div className="or-line" />
                  </div>
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      try {
                        const { data } = await axiosInstance.post(
                          "/api/user/google-login",
                          { token: credentialResponse.credential },
                        );
                        if (data.success) {
                          if (
                            data.user?.phone_number &&
                            data.user?.age &&
                            data.user?.gender
                          ) {
                            setToken(data.token, "FULLY_AUTHENTICATED");
                            navigate("/");
                          } else {
                            setToken(data.token, "PENDING_PROFILE");
                            navigate("/complete-profile");
                          }
                        } else
                          toast.error(data.message || "Google login failed");
                      } catch (error) {
                        toast.error(
                          error.response?.data?.message ||
                            "Google login failed",
                        );
                      }
                    }}
                    onError={() => toast.error("Google Login Failed")}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-800 font-syne">Reset Password</h3>
              <button 
                onClick={() => setShowForgotPassword(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={fpLoading}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {fpError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100 flex items-center gap-2">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fpError}
                </div>
              )}

              {/* STEP 1: EMAIL */}
              {fpStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Enter your email address and we'll send you an OTP to reset your password.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      className="f-input"
                      placeholder="you@example.com"
                      value={fpEmail}
                      onChange={(e) => {
                        setFpEmail(e.target.value);
                        setFpError("");
                      }}
                      disabled={fpLoading}
                    />
                  </div>
                  <button 
                    onClick={handleSendFpOtp}
                    disabled={fpLoading || !fpEmail}
                    className="submit-btn"
                  >
                    {fpLoading ? <div className="spinner" /> : "Send Reset OTP"}
                  </button>
                </div>
              )}

              {/* STEP 2: OTP */}
              {fpStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    We've sent a 6-digit code to <span className="font-semibold text-gray-800">{fpEmail}</span>. 
                    The code expires in 5 minutes.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Verification Code</label>
                    <input
                      type="text"
                      className="f-input text-center text-lg tracking-[0.5em] font-mono"
                      placeholder="000000"
                      maxLength={6}
                      value={fpOtp}
                      onChange={(e) => {
                        setFpOtp(e.target.value.replace(/\D/g, ""));
                        setFpError("");
                      }}
                      disabled={fpLoading}
                    />
                  </div>
                  <button 
                    onClick={handleVerifyFpOtp}
                    disabled={fpLoading || fpOtp.length !== 6}
                    className="submit-btn"
                  >
                    {fpLoading ? <div className="spinner" /> : "Verify Code"}
                  </button>
                  <div className="text-center mt-2">
                    <button
                      onClick={handleSendFpOtp}
                      disabled={fpLoading || fpOtpCooldown > 0}
                      className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                    >
                      {fpOtpCooldown > 0 ? `Resend OTP in ${fpOtpCooldown}s` : "Resend code"}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: NEW PASSWORD */}
              {fpStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    OTP Verified! Now create a strong new password for your account.
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        className="f-input"
                        placeholder="Min 8 chars, 1 uppercase"
                        value={fpNewPassword}
                        onChange={(e) => {
                          setFpNewPassword(e.target.value);
                          setFpError("");
                        }}
                        disabled={fpLoading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Confirm Password</label>
                      <input
                        type="password"
                        className="f-input"
                        placeholder="Re-enter new password"
                        value={fpConfirmPassword}
                        onChange={(e) => {
                          setFpConfirmPassword(e.target.value);
                          setFpError("");
                        }}
                        disabled={fpLoading}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleResetPassword}
                    disabled={fpLoading || !fpNewPassword || !fpConfirmPassword}
                    className="submit-btn"
                  >
                    {fpLoading ? <div className="spinner" /> : "Update Password"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
