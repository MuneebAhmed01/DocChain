import Stripe from "stripe";
import { toStripeMinorUnits, PAYMENT_CURRENCY, REFUND_STATUS } from "../config/payment.js";
import appointmentModel from "../models/appointmentModel.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const refundPaymentIntent = async ({
  paymentIntentId,
  amount,
  currency = PAYMENT_CURRENCY,
}) => {
  if (!paymentIntentId) {
    throw new Error("Missing payment intent id for refund");
  }

  const refundParams = {
    payment_intent: paymentIntentId,
  };

  // Stripe expects minor units if amount is provided.
  if (amount !== undefined && amount !== null) {
    refundParams.amount = toStripeMinorUnits(Number(amount), currency);
  }

  return stripe.refunds.create(refundParams);
};

/**
 * Calculate refund amount for patient cancellation
 * @param {Object} appointment - Appointment document
 * @returns {number} Refund amount
 */
export const calculateRefundAmount = (appointment) => {
  const totalPaid = Number(appointment.paidAmount || appointment.totalAmount || 0);
  
  // Use the cancellation fees from the appointment schema, with defaults
  const bookingFee = Number(appointment.cancellationFees?.bookingFee) || 500;
  const processingFee = Number(appointment.cancellationFees?.processingFee) || 100;
  const totalDeduction = Number(appointment.cancellationFees?.totalDeduction) || (bookingFee + processingFee);
  
  return Math.max(totalPaid - totalDeduction, 0);
};

/**
 * Process refund for cancelled appointment
 * @param {string} appointmentId - Appointment ID
 * @param {string} cancelledBy - Who cancelled (USER, DOCTOR, ADMIN)
 * @returns {Promise<Object>} Refund processing result
 */
export const processAppointmentRefund = async (appointmentId, cancelledBy = "USER") => {
  try {
    const appointment = await appointmentModel.findById(appointmentId);
    
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Only process refunds for patient cancellations
    if (cancelledBy !== "USER") {
      return {
        success: false,
        message: "Refund only applicable for patient cancellations",
        refundAmount: 0,
      };
    }

    // Check if refund already processed
    if (appointment.refundStatus === REFUND_STATUS.COMPLETED) {
      return {
        success: true,
        message: "Refund already processed",
        alreadyProcessed: true,
        refundAmount: appointment.refundAmount,
        refundId: appointment.refundId,
      };
    }

    const refundAmount = calculateRefundAmount(appointment);
    
    if (refundAmount <= 0) {
      // Update appointment to show no refund
      appointment.refundStatus = REFUND_STATUS.NONE;
      appointment.refundAmount = 0;
      appointment.refundInitiated = false;
      await appointment.save();
      
      return {
        success: true,
        message: "No refund applicable - total amount covered by fees",
        refundAmount: 0,
        refundStatus: REFUND_STATUS.NONE,
      };
    }

    // Mark refund as pending
    appointment.refundStatus = REFUND_STATUS.PENDING;
    appointment.refundAmount = refundAmount;
    appointment.refundInitiated = true;
    await appointment.save();

    // Process actual refund through Stripe
    const refundResult = await initiateStripeRefund(appointment, refundAmount);
    
    if (refundResult.success) {
      appointment.refundStatus = REFUND_STATUS.COMPLETED;
      appointment.refundId = refundResult.refundId;
      appointment.refundProcessedAt = new Date();
      appointment.refundFailureReason = null;
    } else {
      appointment.refundStatus = REFUND_STATUS.FAILED;
      appointment.refundFailureReason = refundResult.error || refundResult.message;
    }
    
    await appointment.save();

    return {
      success: refundResult.success,
      message: refundResult.message,
      refundAmount,
      refundStatus: appointment.refundStatus,
      refundId: appointment.refundId,
    };
    
  } catch (error) {
    console.error("❌ Refund processing error:", error);
    throw error;
  }
};

/**
 * Initiate refund through Stripe
 * @param {Object} appointment - Appointment document
 * @param {number} refundAmount - Amount to refund
 * @returns {Promise<Object>} Refund result
 */
const initiateStripeRefund = async (appointment, refundAmount) => {
  try {
    if (!appointment.paymentIntentId) {
      throw new Error("No payment intent found for refund");
    }

    const refund = await refundPaymentIntent({
      paymentIntentId: appointment.paymentIntentId,
      amount: refundAmount,
      currency: appointment.currency || PAYMENT_CURRENCY,
    });

    console.log(`✅ Stripe refund processed: Rs. ${refundAmount} for appointment ${appointment._id}`);
    
    return {
      success: true,
      message: "Refund processed successfully",
      refundId: refund.id,
    };
    
  } catch (error) {
    console.error("❌ Stripe refund failed:", error);
    return {
      success: false,
      message: "Failed to process refund with Stripe",
      error: error.message,
    };
  }
};

/**
 * Check refund status for an appointment
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object>} Refund status
 */
export const getRefundStatus = async (appointmentId) => {
  try {
    const appointment = await appointmentModel.findById(appointmentId);
    
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    
    return {
      refundStatus: appointment.refundStatus,
      refundAmount: appointment.refundAmount,
      refundId: appointment.refundId,
      refundInitiated: appointment.refundInitiated,
    };
    
  } catch (error) {
    console.error("❌ Error fetching refund status:", error);
    throw error;
  }
};

