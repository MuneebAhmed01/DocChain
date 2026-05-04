import React, { useContext, useEffect, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import DoctorCard from "../components/DoctorCard";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const resetWindowScrollInstantly = () => {
  const html = document.documentElement;
  const body = document.body;
  const previousHtmlBehavior = html.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;

  html.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";

  window.scrollTo(0, 0);
  html.scrollTop = 0;
  body.scrollTop = 0;

  window.requestAnimationFrame(() => {
    html.style.scrollBehavior = previousHtmlBehavior;
    body.style.scrollBehavior = previousBodyBehavior;
  });
};

const Doctors = () => {
  const { speciality } = useParams();
  const [filterDoc, setFilterDoc] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [city, setCity] = useState("All");

  const location = useLocation();
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
  }, [doctors, speciality, city]);

  useLayoutEffect(() => {
    // Always reset the speciality listing to the top on navigation.
    resetWindowScrollInstantly();

    const resetAfterPaint = () => {
      resetWindowScrollInstantly();
    };

    const frameId = window.requestAnimationFrame(resetAfterPaint);
    const timeoutId = window.setTimeout(resetAfterPaint, 50);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [location.pathname, location.state, speciality]);

  return (
    <div className="pb-16 sm:pb-24">
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

        <div className="w-full min-h-[48vh]">
          {filterDoc.length > 0 ? (
            <div className="grid grid-cols-auto gap-4 gap-y-6">
              {filterDoc.map((item, index) => (
                <DoctorCard key={index} doctor={item} showOnlineBadge={true} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[48vh] items-center justify-center px-4 text-center">
              <div className="max-w-md rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-sm">
                <p className="text-lg sm:text-xl font-semibold text-gray-800">
                  No doctors available right now
                </p>
                <p className="mt-2 text-sm sm:text-base text-gray-500">
                  Please check back later or try another speciality.
                </p>
                <button
                  onClick={() => {
                    navigate("/doctors");
                    setCity("All");
                  }}
                  className="mt-4 px-6 py-2 border border-gray-300 rounded transition-all cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
                >
                  Clear Filter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Doctors;
