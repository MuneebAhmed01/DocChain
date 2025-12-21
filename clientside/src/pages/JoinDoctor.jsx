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
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Join as a Doctor
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <input
          type="text"
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        />

        {/* Email */}
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        />

        {/* Password */}
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        />

        {/* Experience & Fee */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="number"
            name="experience"
            placeholder="Years of Experience"
            min="0"
            value={formData.experience}
            onChange={handleChange}
            required
            className="border p-3 rounded"
          />
          <input
            type="number"
            name="fee"
            placeholder="Consultation Fee"
            min="0"
            value={formData.fee}
            onChange={handleChange}
            required
            className="border p-3 rounded"
          />
        </div>

        {/* Specialty (Dropdown only) */}
        <select
          name="specialty"
          value={formData.specialty}
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        >
          <option value="">Select Specialty</option>
          <option value="General Physician">General Physician</option>
          <option value="Gynecologist">Gynecologist</option>
          <option value="Dermatologist">Dermatologist</option>
          <option value="Pediatrician">Pediatrician</option>
          <option value="Neurologist">Neurologist</option>
          <option value="Orthopedic">Orthopedic</option>
        </select>

        {/* About */}
        <textarea
          name="about"
          placeholder="About Doctor"
          value={formData.about}
          onChange={handleChange}
          rows="4"
          className="w-full border p-3 rounded"
        />

        {/* Education */}
        <input
          type="text"
          name="education"
          placeholder="Education"
          value={formData.education}
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        />

        {/* City */}
        <select
          name="city"
          value={formData.city}
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        >
          <option value="">Select City</option>
          <option value="Lahore">Lahore</option>
          <option value="Islamabad">Islamabad</option>
          <option value="Karachi">Karachi</option>
        </select>

        {/* Address */}
        <input
          type="text"
          name="address1"
          placeholder="Address Line 1"
          value={formData.address1}
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        />
        <input
          type="text"
          name="address2"
          placeholder="Address Line 2 (optional)"
          value={formData.address2}
          onChange={handleChange}
          className="w-full border p-3 rounded"
        />

        {/* Profile Picture */}
        <div>
          <label className="block mb-1 font-medium">
            Profile Picture
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProfilePic(e.target.files[0])}
            required
          />
        </div>

        {/* Degree Proof */}
        <div>
          <label className="block mb-1 font-medium">
            Degree / Credential Proof
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setDegreeProof(e.target.files[0])}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded font-semibold"
        >
          Submit for Approval
        </button>
      </form>
    </div>
  );
};

export default JoinDoctor;
