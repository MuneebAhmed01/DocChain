import doctorModel from "../models/doctorModel.js";
import bycrypt from "bcrypt";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import appointmentCompletedPatient from "../emailTemplates/appointmentCompletedPatient.js";
import doctorRegistered from "../emailTemplates/doctorRegistered.js";
import reviewModel from "../models/reviewModel.js";
import { getJwtSecret } from "../utils/jwtSecret.js";
import {
  APPOINTMENT_STATUS,
  PAYMENT_TYPE,
  TOKEN_AMOUNT,
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
    const appointments = await appointmentModel.find({ docId });

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to mark appointment completed for doctor panel
// doctorController.js
 const appointmentComplete = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appt = await appointmentModel.findById(appointmentId);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

    // Mark appointment as completed
    appt.isCompleted = true;
    await appt.save();
try {
  await appointmentCompletedPatient({
    patientName: appt.userData.name,
    patientEmail: appt.userData.email,
    doctorName: appt.docData.name,
    date: appt.slotDate,
    time: appt.slotTime,
  });
} catch (err) {
  console.error("Failed to send completed appointment email:", err);
}

    // Calculate earnings
    let earningsToAdd = appt.amount; // default full price

    if (appt.isPaid) {
      earningsToAdd = appt.amount * 0.9; // actual paid amount if online
    }

    // Update doctor earnings
    await doctorModel.findByIdAndUpdate(appt.docId, { $inc: { earnings: earningsToAdd } });

    res.json({ success: true, message: "Appointment completed and earnings updated" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// API to cancel appointment for doctor panel
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

    // Only allow cancelling confirmed appointments
    if (appointment.status !== APPOINTMENT_STATUS.CONFIRMED) {
      return res.json({ success: false, message: "Cannot cancel this appointment" });
    }

    // Wallet guard: for token appointments, ensure the doctor can reverse the token
    if (
      appointment.paymentType === PAYMENT_TYPE.TOKEN &&
      appointment.tokenPaid &&
      !appointment.doctorWalletReversed
    ) {
      const doctor = await doctorModel.findById(docId).select("walletBalance");
      const currentBalance = Number(doctor?.walletBalance || 0);

      if (currentBalance < TOKEN_AMOUNT) {
        return res.json({
          success: false,
          message:
            "Insufficient wallet balance to cancel this token appointment. Please contact admin.",
        });
      }

      await doctorModel.findByIdAndUpdate(docId, {
        $inc: { walletBalance: -TOKEN_AMOUNT },
      });
      appointment.doctorWalletReversed = true;
    }

    // Mark appointment cancelled by doctor + refund initiated (token/full paid amount)
    appointment.status = APPOINTMENT_STATUS.CANCELLED_BY_DOCTOR;
    appointment.cancelled = true;
    appointment.cancelledAt = new Date();
    appointment.cancellationReason =
      cancellationReason || "Cancelled by doctor due to an emergency";

    const refundAmount = Number(appointment.paidAmount || 0);
    if (refundAmount > 0) {
      appointment.refundInitiated = true;
      appointment.refundStatus = REFUND_STATUS.INITIATED;
    }

    await appointment.save();

    // Release slot from doctor's schedule
    const doctorData = await doctorModel.findById(docId);
    if (doctorData && doctorData.slots_booked) {
      const slotsBooked = doctorData.slots_booked;
      if (slotsBooked[appointment.slotDate]) {
        slotsBooked[appointment.slotDate] = slotsBooked[appointment.slotDate].filter(
          (t) => t !== appointment.slotTime
        );
      }
      doctorData.slots_booked = slotsBooked;
      await doctorData.save();
    }

    return res.json({
      success: true,
      message: "Appointment cancelled",
      refundStatus: appointment.refundStatus,
      refundAmount,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
  try {
    const { docId } = req.body;
    const appointments = await appointmentModel.find({ docId });

    let earnings = 0;

    appointments.map((item) => {
      if (item.isCompleted || item.payment) {
        earnings += item.amount;
      }
    });

    let patients = [];

    appointments.map((item) => {
      if (!patients.includes(item.userId)) {
        patients.push(item.userId);
      }
    });

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patients.length,
      latestAppointments: appointments.reverse().slice(0, 5),
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
