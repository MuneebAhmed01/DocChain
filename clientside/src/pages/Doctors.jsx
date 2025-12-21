import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const Doctors = () => {
  
  const { speciality } = useParams();
  const [filterDoc, setFilterDoc] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
 const [city, setCity] = useState("All");

  const navigate = useNavigate();

  const { doctors } = useContext(AppContext);

  // const applyFilter = () => {
  //  let filtered = doctors.filter(
  //   (doc) => doc.status !== "suspended"
  // );

  // if (speciality) {
  //   filtered = filtered.filter(
  //     (doc) => doc.speciality === speciality
  //   );
  // }

  // setFilterDoc(filtered);
  // };
  const applyFilter = () => {
    // ✅ Include suspended doctors in the list
    let filtered = [...doctors];

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
  }, [doctors, speciality , city]);

  return (
    <div>
      <div className="flex justify-between items-center">
      <p className="text-gray-600">Browse through the doctors specialist.</p>
        <div className="mb-4">
  <select
    value={city}
    onChange={(e) => setCity(e.target.value)}
    className="border px-3 py-2 rounded text-gray-600"
  >
    <option value="All">All Cities</option>
    <option value="Lahore">Lahore</option>
    <option value="Islamabad">Islamabad</option>
    <option value="Karachi">Karachi</option>
  </select>
</div>
      </div>
      <div className="flex flex-col sm:flex-row items-start gap-5 mt-5">
        <button
          className={`py-1 px-3 border rounded text-sm transition-all sm:hidden ${
            showFilter ? "bg-primary text-white" : ""
          }`}
          onClick={() => setShowFilter((prev) => !prev)}
        >
          Filters
        </button>
        <div
          className={`flex-col gap-4 text-sm text-gray-600 ${
            showFilter ? "flex" : "hidden sm:flex"
          }`}
        >
          <p
            onClick={() =>
              speciality === "General physician"
                ? navigate("/doctors")
                : navigate("/doctors/General physician")
            }
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${
              speciality === "General physician"
                ? "bg-indigo-100 text-black"
                : ""
            }`}
          >
            General physician
          </p>
          <p
            onClick={() =>
              speciality === "Gynecologist"
                ? navigate("/doctors")
                : navigate("/doctors/Gynecologist")
            }
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${
              speciality === "Gynecologist" ? "bg-indigo-100 text-black" : ""
            }`}
          >
            Gynecologist
          </p>
          <p
            onClick={() =>
              speciality === "Dermatologist"
                ? navigate("/doctors")
                : navigate("/doctors/Dermatologist")
            }
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${
              speciality === "Dermatologist" ? "bg-indigo-100 text-black" : ""
            }`}
          >
            Dermatologist
          </p>
          <p
            onClick={() =>
              speciality === "Pediatricians"
                ? navigate("/doctors")
                : navigate("/doctors/Pediatricians")
            }
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${
              speciality === "Pediatricians" ? "bg-indigo-100 text-black" : ""
            }`}
          >
            Pediatricians
          </p>
          <p
            onClick={() =>
              speciality === "Neurologist"
                ? navigate("/doctors")
                : navigate("/doctors/Neurologist")
            }
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${
              speciality === "Neurologist" ? "bg-indigo-100 text-black" : ""
            }`}
          >
            Neurologist
          </p>
          <p
            onClick={() =>
              speciality === "Gastroenterologist"
                ? navigate("/doctors")
                : navigate("/doctors/Gastroenterologist")
            }
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${
              speciality === "Gastroenterologist"
                ? "bg-indigo-100 text-black"
                : ""
            }`}
          >
            Gastroenterologist
          </p>
        </div>


        <div className="w-full grid grid-cols-auto gap-4 gap-y-6">
          {filterDoc.map((item, index) => (
            <div
           onClick={() => {
  if (item.status === "suspended") {
    toast.error("This doctor has been suspended."); // react-toastify syntax
    return;
  } navigate(`/appointment/${item._id}`)}}
              className=" relative border border-blue-200 rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-500"
              key={index}
            >
              <img className="bg-blue-50" src={item.image} alt="" />
              <div className="p-4">
                 {item.status === "suspended" && (
                  <p className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                    Suspended
                  </p>
                )}
                <div
                  className={`flex items-center gap-2 text-sm text-center ${
                    item.available ? "text-green-500" : "text-gray-500"
                  }`}
                >
                  <p
                    className={`w-2 h-2 ${
                      item.available ? "bg-green-500" : "bg-gray-500"
                    } rounded-full`}
                  ></p>
                  <p className={item.status === "suspended" ? "text-red-500 font-semibold" : ""}>
  {item.status === "suspended"
    ? "Suspended"
    : item.available
    ? "Available"
    : "Not Available"}
</p>

                </div>
                <p className="text-gray-900 text-lg font-medium">{item.name}</p>
                <p className="text-gray-600 text-sm ">{item.speciality}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Doctors;
