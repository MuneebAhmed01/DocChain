import appointmentModel from "../models/appointmentModel.js";
import { APPOINTMENT_STATUS, PAYMENT_STATUS } from "../config/payment.js";
import {
  getAppointmentWindow,
  computeSessionStatusFromJoinFlags,
} from "../utils/appointmentSession.js";

/**
 * 🔴 Clean up expired HOLD appointments
 * - Finds all HOLD appointments where holdExpiry < now
 * - Cancels them automatically to free up slots
 * - Called periodically (e.g., every 5-10 minutes via a cron job)
 */
export const cleanupExpiredHolds = async () => {
  try {
    const now = new Date();

    // Find all expired HOLD appointments
    const expiredHolds = await appointmentModel.find({
      appointmentStatus: APPOINTMENT_STATUS.HOLD,
      holdExpiry: { $lt: now },
    });

    if (expiredHolds.length === 0) {
      console.log("✅ No expired HOLD appointments to clean up");
      return { cleaned: 0 };
    }

    console.log(`🔄 Cleaning up ${expiredHolds.length} expired HOLD appointments...`);

    // Batch update all expired holds to CANCELLED status
    const result = await appointmentModel.updateMany(
      {
        appointmentStatus: APPOINTMENT_STATUS.HOLD,
        holdExpiry: { $lt: now },
      },
      {
        appointmentStatus: APPOINTMENT_STATUS.PAYMENT_FAILED,
        status: APPOINTMENT_STATUS.PAYMENT_FAILED,
        paymentStatus: PAYMENT_STATUS.PAYMENT_FAILED,
        cancelledAt: now,
        cancelled: true,
        cancelledBy: "SYSTEM",
        cancellationReason: "HOLD expired - no payment made within 10 minutes",
      }
    );

    console.log(`✅ Successfully cleaned up ${result.modifiedCount} expired HOLD appointments`);

    return { cleaned: result.modifiedCount };
  } catch (error) {
    console.error("❌ Error cleaning up expired HOLD appointments:", error);
    throw error;
  }
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
      status: appointment.appointmentStatus,
      statusDisplay: getStatusDisplay(appointment.appointmentStatus),
      paymentStatus: appointment.paymentStatus,
      paymentMethod: appointment.paymentMethod,
      amount: appointment.amount,
      paidAmount: appointment.paidAmount,
      tokenAmount: appointment.tokenAmount,
      cancellationReason: appointment.cancellationReason,
      refundAmount: appointment.refundAmount,
      refundStatus: appointment.refundStatus,
      confirmationTime: appointment.confirmationTime,
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
    HOLD: "Pending Payment",
    CONFIRMED: "Confirmed",
    CANCELLED_BY_ADMIN: "Cancelled by Clinic",
    CANCELLED_BY_USER: "Cancelled by You",
    CANCELLED_BY_DOCTOR: "Cancelled by Clinic",
    PAYMENT_FAILED: "Payment Failed",
    NO_SHOW: "No Show",
    COMPLETED: "Completed",
  };

  return statusMap[status] || status;
};

/**
 * Get cancellation message for patient display
 */
export const getCancellationMessage = (appointment) => {
  if (appointment.appointmentStatus === APPOINTMENT_STATUS.CANCELLED_BY_ADMIN) {
    const refundInfo = appointment.refundAmount 
      ? ` Your ${appointment.paymentMethod === "ONLINE" ? "full payment" : "token payment"} of Rs. ${appointment.refundAmount} will be refunded.`
      : "";
    return `Your appointment was cancelled due to an emergency.${refundInfo}`;
  }

  if (appointment.appointmentStatus === APPOINTMENT_STATUS.CANCELLED_BY_USER) {
    const refundInfo = appointment.refundAmount 
      ? ` Your ${appointment.paymentMethod === "ONLINE" ? "full payment" : "token payment"} of Rs. ${appointment.refundAmount} will be refunded.`
      : "";
    return `You cancelled this appointment.${refundInfo}`;
  }

  if (appointment.appointmentStatus === APPOINTMENT_STATUS.NO_SHOW) {
    return "You did not show up for this appointment.";
  }

  if (appointment.appointmentStatus === APPOINTMENT_STATUS.PAYMENT_FAILED) {
    return "Payment failed. This slot is available again.";
  }

  return appointment.cancellationReason || "";
};

/**
 * Check if user can cancel appointment
 */
export const canCancelAppointment = (appointment) => {
  return [
    APPOINTMENT_STATUS.HOLD,
    APPOINTMENT_STATUS.CONFIRMED,
  ].includes(appointment.appointmentStatus);
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
    status: appointment.appointmentStatus,
    paymentMethod: appointment.paymentMethod,
  };
};

/**
 * Check if appointment can be marked as completed
 * Only CONFIRMED appointments can be completed
 */
export const canCompleteAppointment = (appointment) => {
  return appointment.appointmentStatus === APPOINTMENT_STATUS.CONFIRMED;
};

/**
 * Check if remaining amount should be credited on completion
 * TRUE if: TOKEN payment + not yet credited
 */
export const shouldCreditRemainingAmount = (appointment) => {
  if (!appointment.tokenPaid) return false;
  if (appointment.remainingAmountCredited) return false;
  
  const remainingAmount = Number(appointment.amount) - Number(appointment.paidAmount || 0);
  return remainingAmount > 0;
};

/**
 * Calculate remaining amount for TOKEN payments
 */
export const calculateRemainingAmount = (appointment) => {
  const totalAmount = Number(appointment.amount || 0);
  const paidAmount = Number(appointment.paidAmount || 0);
  return Math.max(0, totalAmount - paidAmount);
};

export const finalizeExpiredOnlineSessions = async () => {
  try {
    const onlineAppointments = await appointmentModel.find({
      appointmentType: "online",
      appointmentStatus: APPOINTMENT_STATUS.CONFIRMED,
      sessionStatus: { $in: ["booked", "ongoing"] },
    });

    if (!onlineAppointments.length) {
      return { updated: 0 };
    }

    let updated = 0;
    const now = new Date();
    for (const appointment of onlineAppointments) {
      const window = getAppointmentWindow(appointment);
      if (!window || now <= window.end) {
        continue;
      }

      const nextStatus = computeSessionStatusFromJoinFlags(appointment, now);
      if (nextStatus !== appointment.sessionStatus) {
        appointment.sessionStatus = nextStatus;
        await appointment.save();
        updated += 1;
      }
    }

    return { updated };
  } catch (error) {
    console.error("❌ Error finalizing online sessions:", error);
    throw error;
  }
};
