import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";
import { upload,uploadToCloudinary } from "../middlewares/multer.js";
import doctorRegistered from "../emailTemplates/doctorRegistered.js";
import doctorRemoved from "../emailTemplates/doctorRemoved.js";
import appointmentCancelledPatient from "../emailTemplates/appointmentCancelledPatient.js";
import appointmentCancelledDoctor from "../emailTemplates/appointmentCancelledDoctor.js";
import { getJwtSecret } from "../utils/jwtSecret.js";
import {
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
} from "../config/payment.js";
import { triggerCleanup } from "../utils/backgroundTasks.js";

// API for adding doctor
const addDoctor = async (req, res) => {
  console.log("ADD DOCTOR API HIT");

  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
       city,
    } = req.body;

    // check missing fields
    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !degree ||
      !experience ||
      !about ||
      !fees ||
      !address ||
  !city
    ) {
      return res.json({ success: false, message: "Missing Details" });
    }

    // validate email
    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    //validate city
    const allowedCities = ["Lahore", "Islamabad", "Karachi"];

if (!allowedCities.includes(city)) {
  return res.json({
    success: false,
    message: "Invalid city selected",
  });
}


    // validate password strength
    if (password.length < 8) {
      return res.json({
        success: false,
        message: "Please enter a strong password",
      });
    }

    // password hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ⛔ STOP using imageFile.path — it no longer exists
    // ⛔ STOP calling cloudinary.uploader.upload here
    // ✔ Image URL is already prepared by your middleware
    const imageUrl = req.imageUrl;

    if (!imageUrl) {
      return res.json({
        success: false,
        message: "Image upload failed",
      });
    }

    const doctorData = {
      name,
      email,
      image: imageUrl,     // ✔ new Cloudinary URL
      password: hashedPassword,
      speciality,
      degree,
      experience,
        city,
      about,
      fees,
      address: JSON.parse(address),
      date: Date.now(),
    };

    const newDoctor = new doctorModel(doctorData);
    await newDoctor.save();
try {
  await doctorRegistered(newDoctor);
} catch (err) {
  console.error("Failed to send doctor registration email:", err);
}
    res.json({ success: true, message: "Doctor Added" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


// API for admin Login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign({ email }, getJwtSecret(),{expiresIn: "1d"});
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password");
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all appointments list
const appointmentsAdmin = async (req, res) => {
  try {
    const appointments = await appointmentModel.find({});
    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API for appointment cancellation
// 🔴 ADMIN/DOCTOR CANCELLATION WITH REFUNDS
const appointmentCancel = async (req, res) => {
  try {
    const { appointmentId, cancellationReason } = req.body;

    if (!appointmentId) {
      return res.json({
        success: false,
        message: "Appointment ID is required",
      });
    }

    const appointment = await appointmentModel.findById(appointmentId);

    if (!appointment) {
      return res.json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Can only cancel HOLD or CONFIRMED appointments
    if (![APPOINTMENT_STATUS.HOLD, APPOINTMENT_STATUS.CONFIRMED].includes(appointment.appointmentStatus)) {
      return res.json({
        success: false,
        message: "Cannot cancel this appointment",
      });
    }

    // 🟢 Update appointment status
    appointment.appointmentStatus = APPOINTMENT_STATUS.CANCELLED_BY_ADMIN;
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = "ADMIN";
    appointment.cancellationReason = cancellationReason || "Cancelled by clinic/doctor";

    // 🟢 Handle refunds for CONFIRMED appointments with payments
    if (appointment.appointmentStatus === APPOINTMENT_STATUS.CONFIRMED &&
        (appointment.isPaid || appointment.tokenPaid)) {
      
      const refundAmount = appointment.paidAmount || 0;
      
      if (refundAmount > 0) {
        appointment.refundStatus = "PENDING";
        appointment.refundAmount = refundAmount;
        appointment.paymentStatus = PAYMENT_STATUS.REFUNDED;
        // Stripe refund logic would be handled in a separate Stripe endpoint
      }
    }

    await appointment.save();

    // Release slot only if CONFIRMED
    if (appointment.appointmentStatus === APPOINTMENT_STATUS.CONFIRMED) {
      const { docId, slotDate, slotTime } = appointment;
      const doctorData = await doctorModel.findById(docId);

      if (doctorData && doctorData.slots_booked) {
        let slots_booked = doctorData.slots_booked;
        if (slots_booked[slotDate]) {
          slots_booked[slotDate] = slots_booked[slotDate].filter(
            (e) => e !== slotTime
          );
        }
        await doctorModel.findByIdAndUpdate(docId, { slots_booked });
      }

      // Send cancellation emails
      try {
        await appointmentCancelledPatient({
          patientName: appointment.userData.name,
          patientEmail: appointment.userData.email,
          doctorName: appointment.docData.name,
          doctorEmail: appointment.docData.email,
          date: slotDate,
          time: slotTime,
          reason: appointment.cancellationReason,
          refundAmount: appointment.refundAmount,
        });

        await appointmentCancelledDoctor({
          patientName: appointment.userData.name,
          patientEmail: appointment.userData.email,
          doctorName: appointment.docData.name,
          doctorEmail: appointment.docData.email,
          date: slotDate,
          time: slotTime,
          reason: appointment.cancellationReason,
        });
      } catch (err) {
        console.error("Failed to send cancellation emails:", err);
      }
    }

    res.json({
      success: true,
      message: "Appointment cancelled successfully",
      refundStatus: appointment.refundStatus,
      refundAmount: appointment.refundAmount,
    });
  } catch (error) {
    console.log("appointmentCancel error:", error);
    res.json({ success: false, message: error.message });
  }
};

// API to get dashboard data for admin panel
const adminDashboard = async (req, res) => {
  try {
    const doctors = await doctorModel.find({});
    const users = await userModel.find({});
    const appointments = await appointmentModel.find({});

    const dashData = {
      doctors: doctors.length,
      appointments: appointments.length,
      patients: users.length,
      latestAppointments: appointments.reverse().slice(0, 5),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//suspend doc
// API to suspend or activate a doctor
const changeDoctorStatus = async (req, res) => {
  try {
    const { doctorId, status } = req.body;

    if (!doctorId || !status) {
      return res.json({
        success: false,
        message: "Doctor ID and status are required",
      });
    }

    if (!["active", "suspended"].includes(status)) {
      return res.json({
        success: false,
        message: "Invalid status value",
      });
    }

    await doctorModel.findByIdAndUpdate(doctorId, { status });

    res.json({
      success: true,
      message:
        status === "suspended"
          ? "Doctor suspended successfully"
          : "Doctor activated successfully",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


// 🆕 Trigger HOLD expiry cleanup (manual trigger)
const triggerHoldCleanup = async (req, res) => {
  try {
    const result = await triggerCleanup();
    
    res.json({
      success: true,
      message: `Cleanup completed. ${result.cleaned} expired HOLD appointments were cancelled.`,
      cleaned: result.cleaned,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.json({
      success: false,
      message: "Cleanup failed: " + error.message,
    });
  }
};


export {
  addDoctor,
  loginAdmin,
  allDoctors,
  appointmentsAdmin,
  appointmentCancel,
  adminDashboard,
  changeDoctorStatus,
  triggerHoldCleanup,
};
