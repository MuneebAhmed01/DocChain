import React, { useContext, useState } from "react";
import { assets } from "../../assets/assets";
import { AdminContext } from "../../context/AdminContext";
import { toast } from "react-toastify";
import axios from "axios";

const AddDoctor = () => {
  const [docImg, SetDocImg] = useState(false);
  const [name, SetName] = useState("");
  const [email, SetEmail] = useState("");
  const [password, SetPassword] = useState("");
  const [experience, SetExperience] = useState("1 Year");
  const [fees, SetFees] = useState("");
  const [about, SetAbout] = useState("");
  const [speciality, SetSpeciality] = useState("General physician");
  const [degree, SetDegree] = useState("");
  const [address1, SetAddress1] = useState("");
  const [address2, SetAddress2] = useState("");
  const [city, setCity] = useState("");

  const { backendUrl, aToken } = useContext(AdminContext);

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    try {
      if (!docImg) return toast.error("Image Not Selected");
      if (!city) return toast.error("Please select a city");

      const formData = new FormData();
      formData.append("image", docImg);
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("experience", experience);
      formData.append("fees", Number(fees));
      formData.append("about", about);
      formData.append("speciality", speciality);
      formData.append("degree", degree);
      formData.append("city", city);
      formData.append("address", JSON.stringify({ line1: address1, line2: address2 }));

      const { data } = await axios.post(
        backendUrl + "/api/admin/add-doctor",
        formData,
        { headers: { aToken } }
      );

      if (data.success) {
        toast.success(data.message);
        // Resetting fields
        SetDocImg(false);
        SetName("");
        SetEmail("");
        SetPassword("");
        SetFees("");
        SetAbout("");
        SetDegree("");
        SetAddress1("");
        SetAddress2("");
        setCity("");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={onSubmitHandler} className="m-4 sm:m-6 w-full max-w-5xl">
      <p className="mb-4 text-xl font-semibold text-gray-800">Add Doctor</p>
      
      <div className="bg-white px-4 py-6 sm:px-8 sm:py-8 border rounded shadow-sm w-full">
        
        {/* Upload Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 text-gray-500">
          <label htmlFor="doc-img" className="shrink-0">
            <img
              className="w-20 h-20 bg-gray-100 rounded-full cursor-pointer object-cover border-2 border-dashed border-gray-300 p-1"
              src={docImg ? URL.createObjectURL(docImg) : assets.upload_area}
              alt="Upload"
            />
          </label>
          <input onChange={(e) => SetDocImg(e.target.files[0])} type="file" id="doc-img" hidden />
          <p className="text-center sm:text-left text-sm">
            Upload doctor <br className="hidden sm:block" /> picture
          </p>
        </div>

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 text-gray-600">
          
          {/* Left Column */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Doctor Name</p>
              <input onChange={(e) => SetName(e.target.value)} value={name} className="border rounded px-3 py-2 focus:border-primary outline-none transition-all" type="text" placeholder="Full Name" required />
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Doctor Email</p>
              <input onChange={(e) => SetEmail(e.target.value)} value={email} className="border rounded px-3 py-2 focus:border-primary outline-none transition-all" type="email" placeholder="Email Address" required />
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Doctor Password</p>
              <input onChange={(e) => SetPassword(e.target.value)} value={password} className="border rounded px-3 py-2 focus:border-primary outline-none transition-all" type="password" placeholder="Password" required />
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Experience</p>
              <select onChange={(e) => SetExperience(e.target.value)} value={experience} className="border rounded px-3 py-2 focus:border-primary outline-none bg-white">
                {[...Array(10)].map((_, i) => (
                  <option key={i} value={`${i + 1} Year`}>{i + 1} Year</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Fees</p>
              <input onChange={(e) => SetFees(e.target.value)} value={fees} className="border rounded px-3 py-2 focus:border-primary outline-none transition-all" type="number" placeholder="Consultation Fees" required />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Speciality</p>
              <select onChange={(e) => SetSpeciality(e.target.value)} value={speciality} className="border rounded px-3 py-2 focus:border-primary outline-none bg-white">
                <option value="General physician">General physician</option>
                <option value="Gynecologist">Gynecologist</option>
                <option value="Dermatologist">Dermatologist</option>
                <option value="Pediatricians">Pediatricians</option>
                <option value="Neurologist">Neurologist</option>
                <option value="Gastroenterologist">Gastroenterologist</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Education</p>
              <input onChange={(e) => SetDegree(e.target.value)} value={degree} className="border rounded px-3 py-2 focus:border-primary outline-none transition-all" type="text" placeholder="Degree/Education" required />
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">City</p>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="border rounded px-3 py-2 focus:border-primary outline-none bg-white" required>
                <option value="">Select City</option>
                <option value="Lahore">Lahore</option>
                <option value="Islamabad">Islamabad</option>
                <option value="Karachi">Karachi</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Address</p>
              <input onChange={(e) => SetAddress1(e.target.value)} value={address1} className="border rounded px-3 py-2 mb-2 focus:border-primary outline-none transition-all" type="text" placeholder="Address line 1" required />
              <input onChange={(e) => SetAddress2(e.target.value)} value={address2} className="border rounded px-3 py-2 focus:border-primary outline-none transition-all" type="text" placeholder="Address line 2" required />
            </div>
          </div>
        </div>

        {/* Textarea Section */}
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-gray-600">About Doctor</p>
          <textarea
            onChange={(e) => SetAbout(e.target.value)}
            value={about}
            className="w-full px-4 py-2 border rounded focus:border-primary outline-none transition-all"
            placeholder="Write a brief description about the doctor's background and expertise..."
            rows={5}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto bg-primary px-12 py-3 mt-6 text-white rounded-full hover:bg-opacity-90 transition-all font-medium"
        >
          Add doctor
        </button>
      </div>
    </form>
  );
};

export default AddDoctor;
