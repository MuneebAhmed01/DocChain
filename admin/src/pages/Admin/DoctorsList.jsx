import React, { useContext, useEffect } from "react";
import { AdminContext } from "../../context/AdminContext";

const DoctorsList = () => {
  const { doctors, aToken, getAllDoctors, changeAvailability, changeDoctorStatus } =
    useContext(AdminContext);

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
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    className="w-4 h-4 cursor-pointer accent-primary"
                    onChange={() => changeAvailability(item._id)}
                    type="checkbox"
                    checked={item.available}
                    disabled={item.status === "suspended"}
                  />
                  <p className={item.status === "suspended" ? "text-gray-400" : ""}>
                    Available
                  </p>
                </div>

                {/* Status Button */}
                <button
                  onClick={() =>
                    changeDoctorStatus(
                      item._id,
                      item.status === "active" ? "suspended" : "active"
                    )
                  }
                  className={`w-full text-xs font-medium py-2 rounded-lg transition-colors ${
                    item.status === "suspended"
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  {item.status === "suspended" ? "Activate Doctor" : "Suspend Doctor"}
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
