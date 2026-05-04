import React, { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import { GoogleLogin } from "@react-oauth/google";
import { z } from "zod";

const GENDER_OPTIONS = ["Male", "Female", "Prefer not to say"];

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
  phone_number: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      if (digits.startsWith("0")) {
        return /^03\d{9}$/.test(digits); // 11 digits with leading zero
      }
      return /^3\d{9}$/.test(digits); // 10 digits without leading zero
    }, "Use 03XXXXXXXXX or 3XXXXXXXXX"),
  age: z
    .string()
    .refine((value) => !Number.isNaN(parseInt(value, 10)), "Age is required")
    .refine((value) => parseInt(value, 10) >= 18, "User cannot be below 18"),
  gender: z.enum(["Male", "Female", "Prefer not to say"], {
    errorMap: () => ({ message: "Gender selection is required" }),
  }),
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

const normalizePakistanPhone = (input) => {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return "";

  // Allow these user inputs:
  // 3XXXXXXXXX, 03XXXXXXXXX, 92XXXXXXXXXX
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

const Login = () => {
  const { token, setToken } = useContext(AppContext);
  const navigate = useNavigate();

  const [state, setState] = useState("Sign Up");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone_number: "",
    age: "",
    gender: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const isSignup = state === "Sign Up";

  const switchAuthMode = () => {
    setState((current) => (current === "Sign Up" ? "Login" : "Sign Up"));
    setFormErrors({});
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setProfileImage(file);
    setFormErrors((current) => ({ ...current, profileImage: "" }));
    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
    }
    setProfileImagePreview(file ? URL.createObjectURL(file) : "");
  };

  useEffect(() => {
    return () => {
      if (profileImagePreview) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, [profileImagePreview]);

  const submitLabel = useMemo(
    () => (isSignup ? "Create Account" : "Login"),
    [isSignup],
  );

  const onSubmitHandler = async (event) => {
    event.preventDefault();

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
      const localPhone = getLocalPakistanPhone(formData.phone_number);
      const validation = signupSchema.safeParse({
        ...formData,
        phone_number: localPhone,
      });

      const newErrors = validation.success
        ? {}
        : getZodFieldErrors(validation.error);

      if (!profileImage) {
        newErrors.profileImage = "Profile image is required";
      }

      if (Object.keys(newErrors).length > 0) {
        setFormErrors(newErrors);
        toast.error("Please fix highlighted fields");
        return;
      }
    }

    try {
      if (isSignup) {
        const normalizedPhone = normalizePakistanPhone(formData.phone_number);
        const signupData = new FormData();
        signupData.append("name", formData.name);
        signupData.append("email", formData.email);
        signupData.append("password", formData.password);
        signupData.append("phone_number", normalizedPhone);
        signupData.append("age", formData.age);
        signupData.append("gender", formData.gender);
        signupData.append("image", profileImage);

        const { data } = await axiosInstance.post(
          "/api/user/register",
          signupData,
        );
        if (data.success) {
          localStorage.setItem("token", data.token);
          setToken(data.token);
          navigate("/");
        } else {
          toast.error(data.message);
        }
      } else {
        const { data } = await axiosInstance.post("/api/user/login", {
          email: formData.email,
          password: formData.password,
        });
        if (data.success) {
          localStorage.setItem("token", data.token);
          setToken(data.token);
          navigate("/");
        } else {
          toast.error(data.message);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (token && state === "Login") {
      navigate("/");
    }
  }, [token, state, navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <form
        onSubmit={onSubmitHandler}
        noValidate
        className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.12)]"
      >
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-[#5e8af7] p-8 text-white lg:p-12">
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "radial-gradient(circle at top left, rgba(255,255,255,0.45), transparent 34%), radial-gradient(circle at bottom right, rgba(255,255,255,0.22), transparent 28%)",
              }}
            />
            <div className="relative z-10 flex h-full flex-col justify-between gap-10">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/75">
                  DocChain
                </p>
                <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight md:text-5xl">
                  {isSignup ? "Create your patient profile" : "Welcome back"}
                </h1>
                <p className="mt-4 max-w-md text-base text-white/85 md:text-lg">
                  {isSignup
                    ? "Add your details once and keep the full experience ready for bookings, reminders, and profile access."
                    : "Sign in to continue managing appointments, profile data, and consultations."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Phone", "Use your sandbox number"],
                  ["Age", "Required for care setup"],
                  ["Image", "Visible on your profile"],
                ].map(([title, copy]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"
                  >
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-xs text-white/80">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-semibold text-zinc-900">
                  {isSignup ? "Create Account" : "Login"}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {isSignup
                    ? "All fields are required for registration."
                    : "Use your email and password to continue."}
                </p>
              </div>
              <button
                type="button"
                onClick={switchAuthMode}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-primary hover:text-primary"
              >
                {isSignup ? "Switch to Login" : "Switch to Sign Up"}
              </button>
            </div>

            <div className="space-y-4">
              {isSignup && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Full Name
                  </label>
                  <input
                    className={`w-full rounded-xl border bg-white p-3 text-sm outline-none transition focus:border-primary ${
                      formErrors.name ? "border-red-500" : "border-zinc-300"
                    }`}
                    type="text"
                    onChange={(e) => updateField("name", e.target.value)}
                    value={formData.name}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-500">
                      {formErrors.name}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Email
                </label>
                <input
                  className={`w-full rounded-xl border bg-white p-3 text-sm outline-none transition focus:border-primary ${
                    formErrors.email ? "border-red-500" : "border-zinc-300"
                  }`}
                  type="email"
                  onChange={(e) => updateField("email", e.target.value)}
                  value={formData.email}
                />
                {formErrors.email && (
                  <p className="mt-1 text-xs text-red-500">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {isSignup && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Phone Number
                  </label>
                  <div className="flex items-center">
                    <span className="rounded-l-xl border border-r-0 border-zinc-300 bg-zinc-100 px-3 py-3 text-sm font-medium text-zinc-700">
                      +92
                    </span>
                    <input
                      className={`w-full rounded-r-xl border bg-white p-3 text-sm outline-none transition focus:border-primary ${
                        formErrors.phone_number
                          ? "border-red-500"
                          : "border-zinc-300"
                      }`}
                      type="tel"
                      placeholder="3XXXXXXXXX or 03XXXXXXXXX"
                      onChange={(e) =>
                        updateField("phone_number", (() => {
                          const digits = e.target.value.replace(/\D/g, "");
                          return digits.startsWith("0")
                            ? digits.slice(0, 11)
                            : digits.slice(0, 10);
                        })())
                      }
                      value={getLocalPakistanPhone(formData.phone_number)}
                    />
                  </div>
                  {formErrors.phone_number && (
                    <p className="mt-1 text-xs text-red-500">
                      {formErrors.phone_number}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
                    Pakistan code is fixed to +92. Enter with 0 or without 0.
                  </p>
                </div>
              )}

              {isSignup && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">
                      Age
                    </label>
                    <div
                      className={`rounded-xl border bg-white p-3 ${
                        formErrors.age ? "border-red-500" : "border-zinc-300"
                      }`}
                    >
                      <input
                        className="w-full accent-primary"
                        type="range"
                        min="18"
                        max="120"
                        step="1"
                        onChange={(e) => updateField("age", e.target.value)}
                        value={formData.age || 18}
                      />
                      <p className="mt-1 text-sm font-semibold text-zinc-700">
                        {formData.age || 18} years
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      User cannot be below 18.
                    </p>
                    {formErrors.age && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.age}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">
                      Gender
                    </label>
                    <div
                      className={`rounded-xl border bg-white p-3 ${
                        formErrors.gender ? "border-red-500" : "border-zinc-300"
                      }`}
                    >
                      <div className="space-y-2">
                        {GENDER_OPTIONS.map((gender) => (
                          <label
                            key={gender}
                            className="flex cursor-pointer items-center gap-2"
                          >
                            <input
                              type="radio"
                              name="gender"
                              value={gender}
                              checked={formData.gender === gender}
                              onChange={(e) =>
                                updateField("gender", e.target.value)
                              }
                              className="accent-primary"
                            />
                            <span className="font-semibold tracking-wide text-zinc-800">
                              {gender}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {formErrors.gender && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.gender}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isSignup && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Profile Image
                  </label>
                  <label
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border-2 border-dashed bg-zinc-50 p-4 transition hover:border-primary hover:bg-primary/5 ${
                      formErrors.profileImage
                        ? "border-red-500"
                        : "border-zinc-300"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {profileImage
                          ? profileImage.name
                          : "Upload a clear profile photo"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        PNG, JPG, or WEBP
                      </p>
                    </div>
                    {profileImagePreview ? (
                      <img
                        src={profileImagePreview}
                        alt="Profile preview"
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        Add image
                      </span>
                    )}
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                  {formErrors.profileImage && (
                    <p className="mt-1 text-xs text-red-500">
                      {formErrors.profileImage}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Password
                </label>
                <input
                  className={`w-full rounded-xl border bg-white p-3 text-sm outline-none transition focus:border-primary ${
                    formErrors.password ? "border-red-500" : "border-zinc-300"
                  }`}
                  type="password"
                  onChange={(e) => updateField("password", e.target.value)}
                  value={formData.password}
                />
                {formErrors.password && (
                  <p className="mt-1 text-xs text-red-500">
                    {formErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-primary py-3 text-base font-semibold text-white transition hover:opacity-95"
              >
                {submitLabel}
              </button>

              {!isSignup && (
                <div className="pt-2">
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      const { data } = await axiosInstance.post(
                        "/api/user/google-login",
                        {
                          token: credentialResponse.credential,
                        },
                      );

                      if (data.success) {
                        localStorage.setItem("token", data.token);
                        setToken(data.token);
                        navigate("/");
                      } else {
                        toast.error("Google login failed");
                      }
                    }}
                    onError={() => toast.error("Google Login Failed")}
                  />
                </div>
              )}
            </div>

            <p className="mt-6 text-sm text-zinc-500">
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <span
                    onClick={switchAuthMode}
                    className="cursor-pointer font-medium text-primary underline"
                  >
                    Login here
                  </span>
                </>
              ) : (
                <>
                  Create a new account?{" "}
                  <span
                    onClick={switchAuthMode}
                    className="cursor-pointer font-medium text-primary underline"
                  >
                    Click here
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Login;
