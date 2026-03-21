import React, { useContext, useEffect } from "react";
import { AdminContext } from "../../context/AdminContext";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";

const Dashboard = () => {
  const { aToken, getDashData, cancelAppointment, dashData } =
    useContext(AdminContext);

  const { slotDateFormat } = useContext(AppContext);

  useEffect(() => {
    if (aToken) {
      getDashData();
    }
  }, [aToken]);

  return (
    dashData && (
      <div className="m-4 sm:m-5">
        {/* Statistics Cards Section */}
        <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
          
          {/* Doctors Card */}
          <div className="flex items-center gap-4 bg-white p-4 w-full sm:min-w-64 sm:flex-1 rounded border border-gray-100 shadow-sm cursor-pointer hover:scale-[1.02] transition-all">
            <img className="w-14 bg-blue-50 rounded-full p-2" src={assets.doctor_icon} alt="" />
            <div>
              <p className="text-xl font-bold text-gray-700">{dashData.doctors}</p>
              <p className="text-gray-500 text-sm">Doctors Registered</p>
            </div>
          </div>

          {/* Appointments Card */}
          <div className="flex items-center gap-4 bg-white p-4 w-full sm:min-w-64 sm:flex-1 rounded border border-gray-100 shadow-sm cursor-pointer hover:scale-[1.02] transition-all">
            <img className="w-14 bg-green-50 rounded-full p-2" src={assets.appointments_icon} alt="" />
            <div>
              <p className="text-xl font-bold text-gray-700">{dashData.appointments}</p>
              <p className="text-gray-500 text-sm">Total Appointments</p>
            </div>
          </div>

          {/* Patients Card */}
          <div className="flex items-center gap-4 bg-white p-4 w-full sm:min-w-64 sm:flex-1 rounded border border-gray-100 shadow-sm cursor-pointer hover:scale-[1.02] transition-all">
            <img className="w-14 bg-red-50 rounded-full p-2" src={assets.patients_icon} alt="" />
            <div>
              <p className="text-xl font-bold text-gray-700">{dashData.patients}</p>
              <p className="text-gray-500 text-sm">Unique Patients</p>
            </div>
          </div>
        </div>

        {/* Latest Bookings Section */}
        <div className="bg-white mt-10 rounded border shadow-sm">
          <div className="flex items-center gap-2.5 px-4 py-4 rounded-t border-b bg-gray-50/50">
            <img className="w-5" src={assets.list_icon} alt="" />
            <p className="font-semibold text-gray-800">Latest Bookings</p>
          </div>

          <div className="pt-2">
            {dashData.latestAppointments.map((item, index) => (
              <div
                className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                key={index}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    className="rounded-full w-10 h-10 object-cover bg-gray-100 border"
                    src={item.docData.image}
                    alt=""
                  />
                  <div className="flex-1 text-sm truncate">
                    <p className="text-gray-900 font-semibold truncate">
                      {item.docData.name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Booking: {slotDateFormat(item.slotDate)}
                    </p>
                  </div>
                </div>

                <div className="ml-4 shrink-0">
                  {item.cancelled ? (
                    <p className="text-red-400 text-xs font-medium bg-red-50 px-2 py-1 rounded">Cancelled</p>
                  ) : item.isCompleted ? (
                    <p className="text-green-500 text-xs font-medium bg-green-50 px-2 py-1 rounded">
                      Completed
                    </p>
                  ) : (
                    <button 
                      onClick={() => cancelAppointment(item._id)}
                      className="transition-transform active:scale-90"
                    >
                      <img
                        className="w-8 sm:w-10 cursor-pointer"
                        src={assets.cancel_icon}
                        alt="Cancel"
                      />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* View All Footer */}
          <div className="p-4 text-center border-t">
              <button className="text-primary text-sm font-medium hover:underline">
                  View All Appointments
              </button>
          </div>
        </div>
      </div>
    )
  );
};

export default Dashboard;
