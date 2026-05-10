import React, { useContext, useEffect, useRef, useState } from "react";
import { AdminContext } from "../../context/AdminContext";

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 inline-block text-primary" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
  </svg>
);

const DoctorsList = () => {
  const { doctors, aToken, getAllDoctors, changeAvailability, changeDoctorStatus } =
    useContext(AdminContext);

  const [loadingMap, setLoadingMap] = useState({});
  const lockRef = useRef({});

  const handleAction = async (doctorId, action, apiFn, ...args) => {
    if (lockRef.current[doctorId]) return;
    lockRef.current[doctorId] = true;
    setLoadingMap((prev) => ({ ...prev, [doctorId]: action }));
    try {
      await apiFn(doctorId, ...args);
    } finally {
      lockRef.current[doctorId] = false;
      setLoadingMap((prev) => ({ ...prev, [doctorId]: null }));
    }
  };

  useEffect(() => {
    if (aToken) {
      getAllDoctors();
    }
  }, [aToken]);

  return (
    <div className="m-4 sm:m-5">
      <h1 className="text-xl font-semibold text-gray-800">All Doctors</h1>
      
      {/* Responsive Grid Container */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pt-5">
        {doctors.map((item, index) => (
          <div
            className="border border-indigo-100 rounded-xl overflow-hidden cursor-pointer group hover:shadow-md transition-all duration-300 bg-white"
            key={index}
          >
            {/* Image Container */}
            <div className="aspect-square overflow-hidden bg-indigo-50 group-hover:bg-primary transition-all duration-500">
              <img
                className="w-full h-full object-cover"
                src={item.image || "/default-avatar.png"} 
                alt={item.name}
              />
            </div>

            {/* Content Container */}
            <div className="p-4">
              <p className="text-neutral-800 text-lg font-medium truncate">
                {item.name}
              </p>
              <p className="text-zinc-600 text-sm mb-3">{item.speciality}</p>
              
              <div className="flex flex-col gap-3">
                {/* Availability Toggle */}
                <div className="flex items-center gap-2 text-sm text-gray-700 h-6">
                  {loadingMap[item._id] === "availability" ? (
                    <Spinner />
                  ) : (
                    <input
                      className="w-4 h-4 cursor-pointer accent-primary"
                      onChange={() => handleAction(item._id, "availability", changeAvailability)}
                      type="checkbox"
                      checked={item.available}
                      disabled={item.status === "suspended" || !!loadingMap[item._id]}
                    />
                  )}
                  <p className={(item.status === "suspended" || !!loadingMap[item._id]) ? "text-gray-400" : ""}>
                    Available
                  </p>
                </div>

                {/* Status Button */}
                <button
                  disabled={!!loadingMap[item._id]}
                  onClick={() =>
                    handleAction(
                      item._id,
                      "status",
                      changeDoctorStatus,
                      item.status === "active" ? "suspended" : "active"
                    )
                  }
                  className={`w-full text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center min-h-[32px] ${
                    item.status === "suspended"
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-red-50 text-red-600 hover:bg-red-100"
                  } ${!!loadingMap[item._id] ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {loadingMap[item._id] === "status" ? (
                    <Spinner />
                  ) : (
                    item.status === "suspended" ? "Activate Doctor" : "Suspend Doctor"
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoctorsList;
