import React, { useState } from "react";

const JoinDoctor = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    Object.keys(formData).forEach((key) => {
      form.append(key, formData[key]);
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
              <label className="text-sm font-medium text-gray-700">
                Email
              </label>
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

          {/* Password */}
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
              <label className="text-sm font-medium text-gray-700">
                City
              </label>
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
            <label className="text-sm font-medium text-gray-700">
              About
            </label>
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
                onChange={(e) => setProfilePic(e.target.files[0])}
                className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold">Degree Proof</p>
              <input
                type="file"
                onChange={(e) => setDegreeProof(e.target.files[0])}
                className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
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