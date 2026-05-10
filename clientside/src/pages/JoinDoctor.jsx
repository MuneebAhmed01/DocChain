import React, { useState } from "react";

const JoinDoctor = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone_number: "",
    experience: "",
    fee: "",
    specialty: "",
    about: "",
    education: "",
    city: "",
    address1: "",
    address2: "",
  });

  const [profilePic, setProfilePic] = useState(null);
  const [degreeProof, setDegreeProof] = useState(null);
  const [phoneError, setPhoneError] = useState("");

  const validateProfilePic = (file) => {
    if (!file) return true;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG and PNG image files are allowed for profile pictures");
      return false;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert("Profile picture size too large. Maximum size is 5MB");
      return false;
    }

    return true;
  };

  const validateDegreeProof = (file) => {
    if (!file) return true;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG images and PDF files are allowed for degree proof");
      return false;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert("Degree proof size too large. Maximum size is 5MB");
      return false;
    }

    return true;
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file && validateProfilePic(file)) {
      setProfilePic(file);
    } else {
      e.target.value = "";
      setProfilePic(null);
    }
  };

  const handleDegreeProofChange = (e) => {
    const file = e.target.files[0];
    if (file && validateDegreeProof(file)) {
      setDegreeProof(file);
    } else {
      e.target.value = "";
      setDegreeProof(null);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    // Prevent negative values for number inputs
    if (type === "number" && name === "experience") {
      if (value < 0) return;
    }
    if (type === "number" && name === "fee") {
      if (value < 0) return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPhoneError("");

    // Phone Number Normalization
    let normalizedPhone = formData.phone_number.trim();
    if (normalizedPhone.startsWith("0") && normalizedPhone.length === 11) {
      normalizedPhone = normalizedPhone.substring(1);
    }

    // Phone Number Validation
    const phoneRegex = /^3[0-9]{9}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      setPhoneError("Enter a valid Pakistani mobile number (e.g. 3001234567)");
      return;
    }

    const finalPhone = "+92" + normalizedPhone;

    const form = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "phone_number") {
        form.append("phone_number", finalPhone);
      } else {
        form.append(key, formData[key]);
      }
    });
    form.append("profilePic", profilePic);
    form.append("degreeProof", degreeProof);

    try {
      const res = await fetch("/api/pending-doctor/join", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        alert("Request submitted. Waiting for admin approval.");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6 md:mb-10 text-center text-gray-800">
          Join as a Doctor
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white shadow-xl rounded-2xl p-5 sm:p-8 md:p-10 border border-gray-100"
        >
          {/* Full Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="Dr. John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                placeholder="doctor@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Password & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700">
                WhatsApp Number (Pakistani)
              </label>
              <div className="flex shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  +92
                </span>
                <input
                  type="tel"
                  name="phone_number"
                  placeholder="3001234567"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  className="flex-1 border border-gray-300 p-3 rounded-r-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              {phoneError && (
                <p className="text-red-500 text-xs mt-1">{phoneError}</p>
              )}
            </div>
          </div>

          {/* Experience & Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700">
                Experience (Years)
              </label>
              <input
                type="number"
                name="experience"
                placeholder="e.g. 5"
                value={formData.experience}
                onChange={handleChange}
                required
                min="0"
                className="w-full border border-gray-300 p-3 rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700">
                Consultation Fee
              </label>
              <input
                type="number"
                name="fee"
                placeholder="e.g. 100"
                value={formData.fee}
                onChange={handleChange}
                required
                min="0"
                className="w-full border border-gray-300 p-3 rounded-lg"
              />
            </div>
          </div>

          {/* Specialty & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700">
                Specialty
              </label>
              <select
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg bg-white"
              >
                <option value="">Select Specialty</option>
                <option value="General Physician">General Physician</option>
                <option value="Gynecologist">Gynecologist</option>
                <option value="Dermatologist">Dermatologist</option>
                <option value="Pediatrician">Pediatrician</option>
                <option value="Neurologist">Neurologist</option>
                <option value="Orthopedic">Orthopedic</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700">City</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg bg-white"
              >
                <option value="">Select City</option>
                <option value="Lahore">Lahore</option>
                <option value="Islamabad">Islamabad</option>
                <option value="Karachi">Karachi</option>
              </select>
            </div>
          </div>

          {/* About */}
          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium text-gray-700">About</label>
            <textarea
              name="about"
              placeholder="Brief description about yourself"
              value={formData.about}
              onChange={handleChange}
              rows="4"
              className="w-full border border-gray-300 p-3 rounded-lg outline-none resize-none"
            />
          </div>

          {/* Education */}
          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium text-gray-700">
              Education
            </label>
            <input
              type="text"
              name="education"
              placeholder="MBBS, MD, etc."
              value={formData.education}
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded-lg"
            />
          </div>

          {/* Address Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <input
              type="text"
              name="address1"
              placeholder="Address Line 1"
              value={formData.address1}
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded-lg"
            />
            <input
              type="text"
              name="address2"
              placeholder="Address Line 2"
              value={formData.address2}
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded-lg"
            />
          </div>

          {/* File Uploads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold">Profile Picture</p>
              <input
                type="file"
                onChange={handleProfilePicChange}
                accept=".jpg,.jpeg,.png"
                className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500">JPG, PNG only (Max 5MB)</p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold">Degree Proof</p>
              <input
                type="file"
                onChange={handleDegreeProofChange}
                accept=".jpg,.jpeg,.png,.pdf"
                className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500">
                JPG, PNG, PDF only (Max 5MB)
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 sm:py-4 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
          >
            Submit Registration
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinDoctor;
