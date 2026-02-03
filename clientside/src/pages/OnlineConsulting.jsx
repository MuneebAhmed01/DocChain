import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import DoctorCard from "../components/DoctorCard";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";

const OnlineConsulting = () => {
  const navigate = useNavigate();
  const { doctors, token, backendUrl } = useContext(AppContext);
  
  const [filterDoc, setFilterDoc] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [speciality, setSpeciality] = useState("");
  const [city, setCity] = useState("All");
  const [loading, setLoading] = useState(false);

  const specialities = [
    "General physician",
    "Gynecologist", 
    "Dermatologist",
    "Pediatricians",
    "Neurologist",
    "Gastroenterologist"
  ];

  const cities = ["All", "Lahore", "Islamabad", "Karachi"];

  const applyFilter = () => {
    let filtered = doctors.filter(doc => doc.status !== "suspended");

    // Filter for doctors who have online consultation enabled
    filtered = filtered.filter(doc => doc.onlineConsultEnabled);

    if (speciality) {
      filtered = filtered.filter((doc) => doc.speciality === speciality);
    }

    if (city !== "All") {
      filtered = filtered.filter((doc) => doc.city === city);
    }

    setFilterDoc(filtered);
  };

  useEffect(() => {
    applyFilter();
  }, [doctors, speciality, city]);

  const handleOnlineConsultClick = async (doctor) => {
    if (!token) {
      toast.error("Please login to start online consultation");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      
      // Create Stripe checkout session for online consultation
      const { data } = await axiosInstance.post(
        `${backendUrl}/api/stripe/create-online-consult-checkout`,
        {
          doctorId: doctor._id,
          fee: doctor.onlineConsultFee,
          doctorName: doctor.name
        }
      );

      if (data.success) {
        window.location.href = data.url;
      } else {
        toast.error(data.message || "Failed to create payment session");
      }
    } catch (error) {
      console.error("Online consult error:", error);
      toast.error(error.response?.data?.message || "Failed to start consultation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Online Consulting</h1>
          <p className="text-gray-600 mt-1">
            Connect with doctors instantly through video calls
          </p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border px-3 py-2 rounded text-gray-600"
          >
            {cities.map((cityOption) => (
              <option key={cityOption} value={cityOption}>
                {cityOption}
              </option>
            ))}
          </select>

          <button
            className={`py-1 px-3 border rounded text-sm transition-all sm:hidden ${
              showFilter ? "bg-primary text-white" : ""
            }`}
            onClick={() => setShowFilter((prev) => !prev)}
          >
            Filters
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-5 mt-5">
        {/* Speciality Filter */}
        <div
          className={`flex-col gap-4 text-sm text-gray-600 ${
            showFilter ? "flex" : "hidden sm:flex"
          }`}
        >
          <p
            onClick={() => setSpeciality("")}
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${
              !speciality ? "bg-indigo-100 text-black" : ""
            }`}
          >
            All Specialities
          </p>

          {specialities.map((spec) => (
            <p
              key={spec}
              onClick={() => setSpeciality(spec)}
              className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${
                speciality === spec ? "bg-indigo-100 text-black" : ""
              }`}
            >
              {spec}
            </p>
          ))}
        </div>

        {/* Doctors Grid */}
        <div className="flex-1">
          {filterDoc.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-lg">
                No doctors available for online consultation at the moment.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Please check back later or try different filters.
              </p>
            </div>
          ) : (
            <div className="w-full grid grid-cols-auto gap-4 gap-y-6">
              {filterDoc.map((doctor, index) => (
                <DoctorCard
                  key={index}
                  doctor={doctor}
                  showOnlineConsultButton={true}
                  showOnlineBadge={true}
                  onOnlineConsultClick={handleOnlineConsultClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-12 bg-blue-50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-3">
          How Online Consulting Works
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Choose a Doctor</h3>
              <p className="text-sm text-gray-600">
                Select from available doctors marked "Available Now"
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Pay & Wait</h3>
              <p className="text-sm text-gray-600">
                Complete payment and wait for doctor acceptance
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Start Video Call</h3>
              <p className="text-sm text-gray-600">
                Connect instantly through secure video consultation
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineConsulting;
