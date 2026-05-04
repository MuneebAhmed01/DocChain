import doctorModel from "../models/doctorModel.js";
import bycrypt from "bcrypt";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import appointmentCompletedPatient from "../emailTemplates/appointmentCompletedPatient.js";
import doctorRegistered from "../emailTemplates/doctorRegistered.js";
import reviewModel from "../models/reviewModel.js";
import { getJwtSecret } from "../utils/jwtSecret.js";
import WalletService from "../services/walletService.js";
import {
  canCompleteAppointment,
  shouldCreditRemainingAmount,
  calculateRemainingAmount,
} from "../services/appointmentService.js";
import {
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  REFUND_STATUS,
} from "../config/payment.js";





const changeAvailability = async (req, res) => {
  try {
    const { docId } = req.body;
    const docData = await doctorModel.findById(docId);
    await doctorModel.findByIdAndUpdate(docId, {
      available: !docData.available,
    });
    res.json({ success: true, message: "Availability changed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select(["-password", "-email"]);

    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API for doctor Login
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const doctor = await doctorModel.findOne({ email });

    if (!doctor) {
    
      return res.json({ success: false, message: "Invalid credentials" });
    }
        // 🔴 BLOCK suspended accounts
    if (doctor.status === "suspended") {
      return res.json({
        success: false,
        message:
          "Your account has been suspended. Contact admin to reactivate.",
      });
    }

    const isMatch = await bycrypt.compare(password, doctor.password);

    if (isMatch) {
      const token = jwt.sign({ id: doctor._id }, getJwtSecret());
      res.json({ success: true, token });
    } else {
        console.log("EMAIL:", email)
console.log("PASSWORD:", password)


      res.json({ success: false, message: "Invalid credential" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get doctor appointments for doctor panel
const appointmentsDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    // ✅ Sort by date descending (newest first) and by time
    const appointments = await appointmentModel
      .find({ docId })
      .sort({ slotDate: -1, slotTime: -1 })
      .lean();

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

/**
 * 🔧 UPDATED: Mark appointment as completed with remaining amount crediting
 * - Only CONFIRMED appointments can be completed
 * - For TOKEN payments: credit remaining amount (if not already done)
 * - Idempotent: safe to call multiple times
 * - Atomic: wallet operations are tracked in transaction log
 */
const appointmentComplete = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // ✅ Only CONFIRMED appointments can be completed
    if (!canCompleteAppointment(appointment)) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete appointment with status: ${appointment.appointmentStatus}`,
      });
    }

    // ✅ Prevent double completion
    if (appointment.appointmentStatus === APPOINTMENT_STATUS.COMPLETED) {
      return res.json({
        success: true,
        message: "Appointment already completed",
        isDuplicate: true,
      });
    }

    // ✅ For TOKEN payments: credit remaining amount if not yet credited
    let remainingAmountResult = null;
    if (shouldCreditRemainingAmount(appointment)) {
      const remainingAmount = calculateRemainingAmount(appointment);

      remainingAmountResult = await WalletService.creditRemainingAmount(
        appointmentId,
        String(appointment.docId),
        remainingAmount
      );

      if (!remainingAmountResult.success) {
        console.error(
          "Failed to credit remaining amount:",
          remainingAmountResult.message
        );
        return res.status(400).json({
          success: false,
          message: `Failed to credit remaining amount: ${remainingAmountResult.message}`,
        });
      }
    }

    // ✅ Mark appointment as completed
    appointment.appointmentStatus = APPOINTMENT_STATUS.COMPLETED;
    appointment.status = APPOINTMENT_STATUS.COMPLETED;
    appointment.isCompleted = true;
    appointment.completionTime = new Date();

    // ✅ Track that remaining amount was credited (if applicable)
    if (remainingAmountResult?.success) {
      appointment.remainingAmountCredited = true;
      appointment.remainingAmountCreditedAmount = remainingAmountResult.transaction?.amount || 0;
    }

    await appointment.save();

    // ✅ Send completion email
    try {
      await appointmentCompletedPatient({
        patientName: appointment.userData.name,
        patientEmail: appointment.userData.email,
        doctorName: appointment.docData.name,
        date: appointment.slotDate,
        time: appointment.slotTime,
      });
    } catch (err) {
      console.error("Failed to send completed appointment email:", err);
    }

    res.json({
      success: true,
      message: "Appointment completed successfully",
      remainingAmountCredited: remainingAmountResult?.success || false,
      remainingAmountCreatedAmount:
        remainingAmountResult?.transaction?.amount || 0,
    });
  } catch (err) {
    console.error("Appointment completion error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * 🔧 UPDATED: Cancel appointment with wallet reversal
 * - Uses wallet service for atomic operations
 * - Prevents double reversals with idempotency checks
 * - Properly reverses token/full payments
 * - Releases slot from schedule
 */
const appointmentCancel = async (req, res) => {
  try {
    const { docId, appointmentId, cancellationReason } = req.body;

    if (!docId || !appointmentId) {
      return res.json({ success: false, message: "Missing details" });
    }

    const appointment = await appointmentModel.findById(appointmentId);

    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    if (String(appointment.docId) !== String(docId)) {
      return res.json({ success: false, message: "Not authorized" });
    }

    // ✅ Only allow cancelling HOLD or CONFIRMED appointments
    if (
      ![APPOINTMENT_STATUS.HOLD, APPOINTMENT_STATUS.CONFIRMED].includes(
        appointment.appointmentStatus
      )
    ) {
      return res.json({
        success: false,
        message: "Cannot cancel this appointment",
      });
    }

    const paidAmount = Number(appointment.paidAmount || 0);

    // ✅ Reverse payment using wallet service (atomic with idempotency)
    let walletResult = null;
    if (paidAmount > 0) {
      walletResult = await WalletService.debitFullRefund(
        appointmentId,
        String(docId),
        paidAmount,
        "DOCTOR"
      );

      if (!walletResult.success) {
        console.error("Failed to reverse payment:", walletResult.message);
        return res.status(400).json({
          success: false,
          message: `Failed to process refund: ${walletResult.message}`,
        });
      }
    }

    // ✅ Update appointment status
    appointment.appointmentStatus = APPOINTMENT_STATUS.CANCELLED_BY_DOCTOR;
    appointment.status = APPOINTMENT_STATUS.CANCELLED_BY_DOCTOR;
    appointment.cancelled = true;
    appointment.cancelledAt = new Date();
    appointment.cancellationReason =
      cancellationReason ||
      "Cancelled by doctor due to an emergency. Your amount will be refunded soon.";

    if (paidAmount > 0) {
      appointment.refundInitiated = true;
      appointment.refundStatus = REFUND_STATUS.PENDING;
      appointment.refundAmount = paidAmount;
      appointment.paymentStatus = PAYMENT_STATUS.REFUNDED;
      appointment.walletReversed = true;
      appointment.walletReversedAmount = paidAmount;
    }

    await appointment.save();

    // ✅ Release slot from doctor's schedule
    const doctorData = await doctorModel.findById(docId);
    if (doctorData && doctorData.slots_booked) {
      const slotsBooked = doctorData.slots_booked;
      if (slotsBooked[appointment.slotDate]) {
        slotsBooked[appointment.slotDate] = slotsBooked[
          appointment.slotDate
        ].filter((t) => t !== appointment.slotTime);
      }
      doctorData.slots_booked = slotsBooked;
      await doctorData.save();
    }

    return res.json({
      success: true,
      message: "Appointment cancelled successfully",
      cancellation_reason: appointment.cancellationReason,
      refund_status: paidAmount > 0,
      refundStatus: appointment.refundStatus,
      refundAmount: paidAmount,
    });
  } catch (error) {
    console.error("Appointment cancellation error:", error);
    res.json({ success: false, message: error.message });
  }
};

// API to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
  try {
    const { docId } = req.body;
    // ✅ Sort appointments: newest first (descending by date, then by time)
    const appointments = await appointmentModel
      .find({ docId })
      .sort({ slotDate: -1, slotTime: -1 })
      .lean();

    const doctor = await doctorModel.findById(docId).select("walletBalance");

    // Get reviews data for dashboard
    const reviews = await reviewModel.find({ doctor: docId });
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
      : 0;

    let patients = [];

    appointments.forEach((item) => {
      if (!patients.includes(item.userId)) {
        patients.push(item.userId);
      }
    });

    const dashData = {
      earnings: Number(doctor?.walletBalance || 0),
      appointments: appointments.length,
      patients: patients.length,
      reviews: totalReviews,
      averageRating: parseFloat(averageRating),
      // ✅ Latest appointments already sorted (newest first)
      latestAppointments: appointments.slice(0, 5),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get doctor profile for Doctor panel
const doctorProfile = async (req, res) => {
  try {
    const { docId } = req.body;
    const profileData = await doctorModel.findById(docId).select("-password");

    res.json({ success: true, profileData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to update doctor profile data from Doctor panel
const updateDoctorProfile = async (req, res) => {
  try {
    const { docId, fees, address, available, timeSettings } = req.body;

    const updateData = { fees, address, available };
    if (timeSettings) {
      updateData.timeSettings = timeSettings;
    }

    await doctorModel.findByIdAndUpdate(docId, updateData);

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
// ⭐ Get reviews for a doctor
const getDoctorReviews = async (req, res) => {
  try {
    const { docId } = req.body;

    const reviews = await reviewModel
      .find({ doctor: docId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, reviews });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export {
  changeAvailability,
  doctorList,
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  doctorDashboard,
  doctorProfile,
  appointmentComplete,
  updateDoctorProfile,
  getDoctorReviews
};
