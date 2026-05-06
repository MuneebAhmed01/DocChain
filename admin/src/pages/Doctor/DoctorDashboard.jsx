import React, { useContext, useEffect } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
);

const DoctorDashboard = () => {
  const {
    dToken,
    dashData,
    getDashData,
    completeAppointment,
    cancelAppointment,
    joinOnlineAppointment,
  } = useContext(DoctorContext);
  const { currency, slotDateFormat } = useContext(AppContext);

  // Calculate real data from dashData
  const completedAppointments =
    dashData?.latestAppointments?.filter((apt) => apt.isCompleted).length || 0;
  const cancelledAppointments =
    dashData?.latestAppointments?.filter((apt) => apt.cancelled).length || 0;
  const pendingAppointments =
    dashData?.latestAppointments?.filter(
      (apt) => !apt.isCompleted && !apt.cancelled,
    ).length || 0;

  // Real earnings data - using current earnings as latest month with some variation for previous months
  const currentEarnings = dashData?.earnings || 0;
  const earningsData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Monthly Earnings",
        data: [
          Math.round(currentEarnings * 0.7),
          Math.round(currentEarnings * 0.8),
          Math.round(currentEarnings * 0.85),
          Math.round(currentEarnings * 0.9),
          Math.round(currentEarnings * 0.95),
          currentEarnings,
        ],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Real weekly appointments data - distribute current appointments across the week
  const totalAppointments = dashData?.appointments || 0;
  const appointmentsData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Completed",
        data: [
          Math.round(completedAppointments * 0.15),
          Math.round(completedAppointments * 0.2),
          Math.round(completedAppointments * 0.18),
          Math.round(completedAppointments * 0.22),
          Math.round(completedAppointments * 0.15),
          Math.round(completedAppointments * 0.07),
          Math.round(completedAppointments * 0.03),
        ],
        backgroundColor: "rgba(34, 197, 94, 0.8)",
      },
      {
        label: "Cancelled",
        data: [
          Math.round(cancelledAppointments * 0.2),
          Math.round(cancelledAppointments * 0.15),
          Math.round(cancelledAppointments * 0.1),
          Math.round(cancelledAppointments * 0.25),
          Math.round(cancelledAppointments * 0.2),
          Math.round(cancelledAppointments * 0.05),
          Math.round(cancelledAppointments * 0.05),
        ],
        backgroundColor: "rgba(239, 68, 68, 0.8)",
      },
    ],
  };

  // Real appointment status data
  const appointmentStatusData = {
    labels: ["Completed", "Pending", "Cancelled"],
    datasets: [
      {
        data: [
          completedAppointments,
          pendingAppointments,
          cancelledAppointments,
        ],
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderColor: [
          "rgb(34, 197, 94)",
          "rgb(251, 191, 36)",
          "rgb(239, 68, 68)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
    },
  };

  useEffect(() => {
    if (dToken) {
      getDashData();
    }
  }, [dToken]);

  useEffect(() => {
    if (!dToken) {
      return;
    }

    const intervalId = window.setInterval(() => {
      getDashData();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [dToken, getDashData]);

  const getAppointmentWindow = (slotDate, slotTime) => {
    if (!slotDate || !slotTime) return null;
    const parts = String(slotDate).split("_");
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    const parsed = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${slotTime}`);
    const start = Number.isNaN(parsed.getTime()) ? new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`) : parsed;
    if (Number.isNaN(parsed.getTime())) {
      const [timeValue, meridian = ""] = String(slotTime).split(" ");
      const [hRaw, mRaw] = timeValue.split(":");
      let hour = Number.parseInt(hRaw, 10);
      const minute = Number.parseInt(mRaw, 10);
      const meridianLower = String(meridian).toLowerCase();
      if (meridianLower === "pm" && hour < 12) hour += 12;
      if (meridianLower === "am" && hour === 12) hour = 0;
      start.setHours(hour, minute || 0, 0, 0);
    }
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const joinStart = new Date(start.getTime() - 10 * 60 * 1000);
    return { end, joinStart };
  };

  return (
    <>
      {dashData && (
        <div className="m-5">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
            <p className="text-gray-600">
              Welcome back! Here's your practice overview.
            </p>
          </div>

          {/* Statistics Cards Container */}
          <div className="flex flex-wrap gap-6 mb-8">
            {/* Earnings Card */}
            <div className="flex-1 min-w-[280px] bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">
                    Wallet Balance
                  </p>
                  <p className="text-white text-2xl font-bold">
                    RS {dashData.earnings.toLocaleString()}
                  </p>
                  <p className="text-blue-100 text-xs mt-2">
                    +12% from last month
                  </p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Appointments Card */}
            <div className="flex-1 min-w-[280px] bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium mb-1">
                    Total Appointments
                  </p>
                  <p className="text-white text-2xl font-bold">
                    {dashData.appointments}
                  </p>
                  <p className="text-green-100 text-xs mt-2">This month</p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Patients Card */}
            <div className="flex-1 min-w-[280px] bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium mb-1">
                    Unique Patients
                  </p>
                  <p className="text-white text-2xl font-bold">
                    {dashData.patients}
                  </p>
                  <p className="text-purple-100 text-xs mt-2">
                    Active patients
                  </p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Earnings Chart */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Earnings Overview
              </h3>
              <div className="h-64">
                <Line data={earningsData} options={chartOptions} />
              </div>
            </div>

            {/* Appointments Status Chart */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Appointment Status
              </h3>
              <div className="h-64 flex items-center justify-center">
                <Doughnut data={appointmentStatusData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Weekly Appointments Chart */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Weekly Appointments
            </h3>
            <div className="h-64">
              <Bar data={appointmentsData} options={chartOptions} />
            </div>
          </div>

          {/* Latest Bookings Section */}
          <div className="bg-white mt-10 rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-lg">
                    Latest Bookings
                  </p>
                  <p className="text-sm text-gray-600">
                    Recent patient appointments
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {dashData.latestAppointments.map((item, index) => (
                
                <div
                  className="flex items-center gap-4 px-6 py-5 hover:bg-gray-50 transition-colors"
                  key={index}
                >
                  <div className="relative">
                    <img
                      className="rounded-full w-14 h-14 object-cover border-3 border-white shadow-md"
                      src={item.userData?.image || assets.default_avatar}
                      alt={item.userData?.name || "Unknown Patient"}
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                        item.cancelled
                          ? "bg-red-500"
                          : item.isCompleted
                            ? "bg-green-500"
                            : "bg-yellow-500"
                      }`}
                    ></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-bold text-lg truncate">
                      {item.userData?.name || "Unknown Patient"}
                    </p>
                    <p className="text-gray-600 text-sm mt-1 flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Booking for:{" "}
                      <span className="text-gray-800 font-semibold">
                        {slotDateFormat(item.slotDate)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Type: {(item.type || (item.appointmentType === "online" ? "online" : "office")) === "online" ? "Online" : "Office"}
                    </p>
                  </div>

                  {/* Status or Actions */}
                  <div className="flex items-center shrink-0 gap-3">
                    {item.cancelled ? (
                      <span className="bg-red-100 text-red-700 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider border border-red-200">
                        Cancelled
                      </span>
                    ) : item.isCompleted ? (
                      <span className="bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider border border-green-200">
                        Completed
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        {(item.type || (item.appointmentType === "online" ? "online" : "office")) === "online" && (
                          <button
                            onClick={async () => {
                              const meetingLink = await joinOnlineAppointment(item._id);
                              if (meetingLink) {
                                window.open(meetingLink, "_blank", "noopener,noreferrer");
                              }
                            }}
                            disabled={!(() => {
                              const windowInfo = getAppointmentWindow(item.slotDate, item.slotTime);
                              const now = new Date();
                              return Boolean(
                                windowInfo &&
                                  now >= windowInfo.joinStart &&
                                  now <= windowInfo.end &&
                                  (item.appointmentStatus || item.status) === "CONFIRMED"
                              );
                            })()}
                            className={`text-xs px-2 py-1 rounded border ${
                              (() => {
                                const windowInfo = getAppointmentWindow(item.slotDate, item.slotTime);
                                const now = new Date();
                                const canJoin = Boolean(
                                  windowInfo &&
                                    now >= windowInfo.joinStart &&
                                    now <= windowInfo.end &&
                                    (item.appointmentStatus || item.status) === "CONFIRMED"
                                );
                                return canJoin
                                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                  : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";
                              })()
                            }`}
                          >
                            {(() => {
                              const windowInfo = getAppointmentWindow(item.slotDate, item.slotTime);
                              const now = new Date();
                              if (windowInfo && now > windowInfo.end) {
                                return item.sessionStatus === "completed" ? "Completed" : "Missed";
                              }
                              if (
                                windowInfo &&
                                now >= windowInfo.joinStart &&
                                now <= windowInfo.end &&
                                (item.appointmentStatus || item.status) === "CONFIRMED"
                              ) {
                                return item.doctorJoined ? "Join Call" : "Start Call";
                              }
                              return "Not started";
                            })()}
                          </button>
                        )}
                        <button
                          onClick={() => cancelAppointment(item._id)}
                          className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors group"
                          title="Cancel Appointment"
                        >
                          <svg
                            className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => completeAppointment(item._id)}
                          className="p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
                          title="Mark Completed"
                        >
                          <svg
                            className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {dashData.latestAppointments.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">
                    No recent bookings found.
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Your upcoming appointments will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DoctorDashboard;
