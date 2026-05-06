import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { formatPkrAmount } from "../constants/payment";

const DoctorCard = ({
  doctor,
  showOnlineConsultButton = false,
  onOnlineConsultClick,
  showOnlineBadge = false,
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (doctor.status === "suspended") {
      toast.error("This doctor has been suspended.");
      return;
    }
    navigate(`/appointment/${doctor._id}`);
  };

  const handleOnlineConsultClick = (e) => {
    e.stopPropagation();
    if (onOnlineConsultClick) {
      onOnlineConsultClick(doctor);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="relative border border-blue-200 rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-500"
    >
      {/* Reliability left-side wrapper (small text, full label visible) */}
      {typeof doctor.reliabilityScore !== "undefined" &&
        (() => {
          const score = Number(doctor.reliabilityScore || 0);
          const label =
            score >= 50 ? `Reliable ${score}%` : `Low Reliability ${score}%`;
          return (
            <div
              style={{
                position: "absolute",
                left: 8,
                top: 8,
                transform: "none",
                zIndex: 40,
                backgroundColor: "#0ea5e9",
                color: "white",
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 600,
                borderTopRightRadius: 6,
                borderBottomRightRadius: 6,
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </div>
          );
        })()}
      <img className="bg-blue-50" src={doctor.image} alt={doctor.name} />

      <div className="p-4">
        {/* Status Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {doctor.status === "suspended" && (
            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
              Suspended
            </span>
          )}

          {showOnlineBadge &&
            doctor.onlineConsultEnabled &&
            doctor.isOnlineNow && (
              <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                Available Now
              </span>
            )}
        </div>

        {/* Availability Status */}
        <div
          className={`flex items-center gap-2 text-sm text-center ${
            doctor.available ? "text-green-500" : "text-gray-500"
          }`}
        >
          <p
            className={`w-2 h-2 ${
              doctor.available ? "bg-green-500" : "bg-gray-500"
            } rounded-full`}
          ></p>
          <p
            className={
              doctor.status === "suspended" ? "text-red-500 font-semibold" : ""
            }
          >
            {doctor.status === "suspended"
              ? "Suspended"
              : doctor.available
                ? "Available"
                : "Not Available"}
          </p>
        </div>

        {/* Doctor Info */}
        <p className="text-gray-900 text-lg font-medium">{doctor.name}</p>
        <p className="text-gray-600 text-sm">{doctor.speciality}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-1 text-sm text-yellow-500">
          <span>★</span>
          <span className="text-gray-700">
            {doctor.averageRating ? doctor.averageRating : "0.0"}
          </span>
          <span className="text-gray-500">({doctor.ratingCount || 0})</span>
        </div>

        {/* Online Consult Button */}
        {showOnlineConsultButton &&
          doctor.onlineConsultEnabled &&
          doctor.isOnlineNow && (
            <button
              onClick={handleOnlineConsultClick}
              className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
            >
              Start Online Consult
            </button>
          )}
      </div>
    </div>
  );
};

export default DoctorCard;
