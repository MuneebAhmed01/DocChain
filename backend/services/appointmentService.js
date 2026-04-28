import appointmentModel from "../models/appointmentModel.js";
import { APPOINTMENT_STATUS } from "../config/payment.js";

/**
 * Pending-hold cleanup is no longer needed because appointments
 * are only created after payment succeeds.
 */
export const cleanupExpiredHolds = async () => {
  return { cleaned: 0 };
};

/**
 * Get appointment details with display-friendly information
 * Used for patient history display
 */
export const getAppointmentWithDisplayInfo = async (appointmentId) => {
  try {
    const appointment = await appointmentModel.findById(appointmentId);

    if (!appointment) {
      return null;
    }

    // Create display-friendly object
    const displayInfo = {
      _id: appointment._id,
      doctorName: appointment.docData?.name,
      doctorSpeciality: appointment.docData?.speciality,
      slotDate: appointment.slotDate,
      slotTime: appointment.slotTime,
      status: appointment.status,
      statusDisplay: getStatusDisplay(appointment.status),
      paymentStatus: appointment.paymentStatus,
      paymentType: appointment.paymentType,
      amount: appointment.amount,
      paidAmount: appointment.paidAmount,
      cancellationReason: appointment.cancellationReason,
      cancelledAt: appointment.cancelledAt,
    };

    return displayInfo;
  } catch (error) {
    console.error("Error getting appointment display info:", error);
    throw error;
  }
};

/**
 * Get human-readable status display
 */
export const getStatusDisplay = (status) => {
  const statusMap = {
    CONFIRMED: "Confirmed",
    CANCELLED: "Cancelled",
    CANCELLED_BY_PATIENT: "Cancelled",
    CANCELLED_BY_DOCTOR: "Cancelled by doctor",
  };

  return statusMap[status] || status;
};

/**
 * Get cancellation message for patient display
 */
export const getCancellationMessage = (appointment) => {
  if (
    appointment.status === APPOINTMENT_STATUS.CANCELLED ||
    appointment.status === APPOINTMENT_STATUS.CANCELLED_BY_PATIENT ||
    appointment.status === APPOINTMENT_STATUS.CANCELLED_BY_DOCTOR
  ) {
    if (appointment.status === APPOINTMENT_STATUS.CANCELLED_BY_DOCTOR) {
      return (
        "Your appointment was canceled due to an emergency. Your advance payment (Rs. 500) will be refunded."
      );
    }
    return appointment.cancellationReason || "This appointment was cancelled.";
  }
  return "";
};

/**
 * Check if user can cancel appointment
 */
export const canCancelAppointment = (appointment) => {
  return appointment.status === APPOINTMENT_STATUS.CONFIRMED;
};

/**
 * Get appointment summary for emails
 */
export const getAppointmentSummary = (appointment) => {
  return {
    doctorName: appointment.docData?.name,
    speciality: appointment.docData?.speciality,
    date: appointment.slotDate,
    time: appointment.slotTime,
    amount: appointment.amount,
    status: appointment.status,
    paymentType: appointment.paymentType,
  };
};
