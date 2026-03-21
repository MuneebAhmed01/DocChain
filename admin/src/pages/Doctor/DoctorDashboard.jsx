import React, { useContext, useEffect } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";

const DoctorDashboard = () => {
  const {
    dToken,
    dashData,
    getDashData,
    completeAppointment,
    cancelAppointment,
  } = useContext(DoctorContext);
  const { currency, slotDateFormat } = useContext(AppContext);

  useEffect(() => {
    if (dToken) {
      getDashData();
    }
  }, [dToken]);

  return (
    dashData && (
      <div className="m-5">
        {/* Statistics Cards Container */}
        <div className="flex flex-wrap gap-4">
          
          {/* Earnings Card */}
          <div className="flex items-center gap-4 bg-white p-4 flex-1 min-w-[240px] rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all">
            <img className="w-14 bg-blue-50 p-2 rounded-lg" src={assets.earning_icon} alt="Earnings" />
            <div>
              <p className="text-xl font-bold text-gray-700">
                {currency} {dashData.earnings.toLocaleString()}
              </p>
              <p className="text-gray-500 text-sm">Total Earnings</p>
            </div>
          </div>

          {/* Appointments Card */}
          <div className="flex items-center gap-4 bg-white p-4 flex-1 min-w-[240px] rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all">
            <img className="w-14 bg-green-50 p-2 rounded-lg" src={assets.appointments_icon} alt="Appointments" />
            <div>
              <p className="text-xl font-bold text-gray-700">
                {dashData.appointments}
              </p>
              <p className="text-gray-500 text-sm">Appointments</p>
            </div>
          </div>

          {/* Patients Card */}
          <div className="flex items-center gap-4 bg-white p-4 flex-1 min-w-[240px] rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all">
            <img className="w-14 bg-orange-50 p-2 rounded-lg" src={assets.patients_icon} alt="Patients" />
            <div>
              <p className="text-xl font-bold text-gray-700">
                {dashData.patients}
              </p>
              <p className="text-gray-500 text-sm">Unique Patients</p>
            </div>
          </div>
        </div>

        {/* Latest Bookings Section */}
        <div className="bg-white mt-10 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 bg-gray-50/50 border-b">
            <img src={assets.list_icon} alt="List" className="w-5" />
            <p className="font-bold text-gray-800">Latest Bookings</p>
          </div>

          <div className="divide-y divide-gray-50">
            {dashData.latestAppointments.map((item, index) => (
              <div
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                key={index}
              >
                <img
                  className="rounded-full w-12 h-12 object-cover border-2 border-white shadow-sm"
                  src={item.userData.image}
                  alt={item.userData.name}
                />
                
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-semibold truncate">
                    {item.userData.name}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Booking for: <span className="text-gray-700 font-medium">{slotDateFormat(item.slotDate)}</span>
                  </p>
                </div>

                {/* Status or Actions */}
                <div className="flex items-center shrink-0">
                  {item.cancelled ? (
                    <span className="bg-red-50 text-red-500 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                      Cancelled
                    </span>
                  ) : item.isCompleted ? (
                    <span className="bg-green-50 text-green-500 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                      Completed
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => cancelAppointment(item._id)}
                        className="hover:scale-110 active:scale-95 transition-all p-1"
                        title="Cancel Appointment"
                      >
                        <img className="w-8 sm:w-10" src={assets.cancel_icon} alt="Cancel" />
                      </button>
                      <button 
                        onClick={() => completeAppointment(item._id)}
                        className="hover:scale-110 active:scale-95 transition-all p-1"
                        title="Mark Completed"
                      >
                        <img className="w-8 sm:w-10" src={assets.tick_icon} alt="Complete" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {dashData.latestAppointments.length === 0 && (
              <div className="p-10 text-center text-gray-400">
                No recent bookings found.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  );
};

export default DoctorDashboard;
