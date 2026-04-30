import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import appointmentBookedPatient from "../emailTemplates/appointmentBookedPatient.js";
import appointmentBookedDoctor from "../emailTemplates/appointmentBookedDoctor.js";
import appointmentCancelledPatient from "../emailTemplates/appointmentCancelledPatient.js";
import appointmentCancelledDoctor from "../emailTemplates/appointmentCancelledDoctor.js";
import appointmentReminder from "../emailTemplates/appointmentReminder.js";
import reviewModel from "../models/reviewModel.js";
import sendEmail from "../utils/sendEmail.js";
import { getJwtSecret } from "../utils/jwtSecret.js";
import {
  PAYMENT_CURRENCY,
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  TOKEN_AMOUNT,
  REFUND_STATUS,
} from "../config/payment.js";




const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Enter a valid email" });
    }

    // Validate strong password
    if (password.length < 8) {
      return res.json({ success: false, message: "Enter a strong password (min 8 chars)" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUser = new userModel({ name, email, password: hashedPassword });
    const user = await newUser.save();

    // Generate JWT with expiration
    const token = jwt.sign(
      { userId: user._id, name: user.name, email: user.email }, // payload
      getJwtSecret(),
      { expiresIn: "90d" } // token valid for 7 days
    );

    // Return token to frontend
    res.json({ success: true, token });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default registerUser;


// API for user login
const loginUser = async (req, res) => {
  try {
    
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });
    
    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (isMatch) {
      const token = jwt.sign({ userId: user._id }, getJwtSecret());
      
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get user profile data
// const getProfile = async (req, res) => {
//   try {
//     const { userId } = req.body;
//     const useData = await userModel.findById(userId).select("-password");

//     res.json({ success: true, user: useData });
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: error.message });
//   }
// };

// const getProfile = async (req, res) => {
//   try {
//     console.log("Authenticated user:", req.user);

//     res.json({
//       success: true,
//       user: req.user,
//     });
//   } catch (error) {
//     console.error("getProfile error:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
const getProfile = async (req, res) => {
  try {
    console.log("req.user:", req.user); // <--- log token payload

    const userId = req.user.userId; // your token uses 'userId'
    if (!userId) {
      console.log("No userId in token!");
      return res.status(400).json({ success: false, message: "User ID missing" });
    }

    const userData = await userModel.findById(userId).select("-password");
    if (!userData) {
      console.log("User not found in DB for id:", userId);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("Fetched user data:", userData);
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error("getProfile error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
const { name, phone, address, dob, gender } = req.body;

    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing" });
    }

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    });

    if (imageFile) {
      // upload image to cloudinary
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      const imageURL = imageUpload.secure_url;

      await userModel.findByIdAndUpdate(userId, { image: imageURL });
    }

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to check slot availability and get payment options
// ❌ DO NOT create appointment here
// ✅ Only check availability and return payment options
const bookAppointment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { docId, slotDate, slotTime } = req.body;

    if (!slotTime || !String(slotTime).trim()) {
      return res.json({ success: false, message: "Please select a slot" });
    }

    // Fetch doctor data
    const docData = await doctorModel.findById(docId).select("-password");
    if (!docData) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check if doctor is suspended
    if (docData.status === "suspended") {
      return res.json({
        success: false,
        message: "This doctor has been suspended",
      });
    }

    // Check if doctor is available
    if (!docData.available) {
      return res.json({
        success: false,
        message: "Doctor not available",
      });
    }

    // 🔴 CHECK: Is this slot already CONFIRMED by another user?
    const existingConfirmedAppointment = await appointmentModel.findOne({
      docId,
      slotDate,
      slotTime,
      appointmentStatus: APPOINTMENT_STATUS.CONFIRMED,
    });

    if (existingConfirmedAppointment) {
      return res.json({
        success: false,
        message: "This slot is already booked. Please select another time.",
      });
    }

    const existingHold = await appointmentModel.findOne({
      userId,
      docId,
      slotDate,
      slotTime,
      appointmentStatus: APPOINTMENT_STATUS.HOLD,
    });

    const userData = await userModel.findById(userId).select("-password");
    const fullAmount = Number(docData.fees || 0);
    const tokenAmount = Math.min(TOKEN_AMOUNT, fullAmount);
    const paymentOptions = {
      option1_full: {
        type: PAYMENT_TYPE.FULL,
        description: "Pay Full Amount Now",
        amount: fullAmount,
        youPay: fullAmount,
      },
      option2_token: {
        type: PAYMENT_TYPE.TOKEN,
        description: "Pay Token Now, Rest at Clinic",
        tokenAmount,
        youPay: tokenAmount,
        remainingAtClinic: Math.max(0, fullAmount - tokenAmount),
      },
    };

    if (existingHold) {
      return res.json({
        success: true,
        message: "Slot is already on hold. Choose a payment option.",
        appointmentId: existingHold._id,
        slotDetails: {
          docId,
          docName: docData.name,
          speciality: docData.speciality,
          slotDate,
          slotTime,
          fullAmount,
        },
        paymentOptions,
        holdExpiry: existingHold.holdExpiry,
      });
    }

    const holdExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const appointment = await appointmentModel.create({
      userId,
      docId,
      userData: userData ? userData.toObject() : {},
      docData: docData.toObject(),
      slotDate,
      slotTime,
      amount: fullAmount,
      currency: PAYMENT_CURRENCY,
      tokenAmount,
      paidAmount: 0,
      paymentType: "PENDING",
      paymentStatus: PAYMENT_STATUS.PENDING,
      appointmentStatus: APPOINTMENT_STATUS.HOLD,
      status: APPOINTMENT_STATUS.HOLD,
      holdExpiry,
      date: Date.now(),
      isPaid: false,
      tokenPaid: false,
      payment: false,
      refundStatus: REFUND_STATUS.NONE,
    });

    res.json({
      success: true,
      message: "Slot is available. Choose payment option.",
      appointmentId: appointment._id,
      slotDetails: {
        docId,
        docName: docData.name,
        speciality: docData.speciality,
        slotDate,
        slotTime,
        fullAmount,
      },
      paymentOptions,
      holdExpiry,
    });
  } catch (error) {
    console.log("bookAppointment error:", error);
    res.json({ success: false, message: error.message });
  }
};

// API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const appointments = await appointmentModel.find({ userId }).sort({ date: -1 });

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to cancel appointment (USER cancellation)
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user from token",
      });
    }

    const appointment = await appointmentModel.findById(appointmentId);

    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // Verify appointment belongs to logged in user
    if (appointment.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized action",
      });
    }

    // Can cancel HOLD or CONFIRMED appointments
    if (
      ![APPOINTMENT_STATUS.HOLD, APPOINTMENT_STATUS.CONFIRMED].includes(
        appointment.appointmentStatus,
      )
    ) {
      return res.json({
        success: false,
        message: "Cannot cancel this appointment",
      });
    }

    const refundAmount = Number(appointment.paidAmount || 0);

    if (refundAmount > 0 && !appointment.walletReversed) {
      await doctorModel.findByIdAndUpdate(appointment.docId, {
        $inc: { walletBalance: -refundAmount, earnings: -refundAmount },
      });
      appointment.walletReversed = true;
      appointment.walletReversedAmount = refundAmount;
    }

    // 🟢 Cancel appointment
    appointment.appointmentStatus = APPOINTMENT_STATUS.CANCELLED_BY_USER;
    appointment.status = APPOINTMENT_STATUS.CANCELLED_BY_USER;
    appointment.cancelled = true;
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = "Cancelled by patient";
    appointment.cancelledBy = "USER";
    appointment.refundInitiated = refundAmount > 0;
    appointment.refundAmount = refundAmount;
    appointment.refundStatus = refundAmount > 0 ? REFUND_STATUS.PENDING : REFUND_STATUS.NONE;
    appointment.paymentStatus = refundAmount > 0 ? PAYMENT_STATUS.REFUNDED : appointment.paymentStatus;

    await appointment.save();

    // Release doctor slot
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
        refundAmount: appointment.paidAmount,
      });

      await appointmentCancelledDoctor({
        patientName: appointment.userData.name,
        patientEmail: appointment.userData.email,
        doctorName: appointment.docData.name,
        doctorEmail: appointment.docData.email,
        date: slotDate,
        time: slotTime,
      });
    } catch (err) {
      console.error("Failed to send cancellation emails:", err);
    }

    return res.json({
      success: true,
      message: "Appointment cancelled successfully",
      cancellation_reason: appointment.cancellationReason,
      refund_status: refundAmount > 0,
      refundAmount,
      refundInitiated: appointment.refundInitiated,
    });
  } catch (error) {
    console.log("cancelAppointment error:", error);
    return res.json({ success: false, message: error.message });
  }
};
// ⭐ Rate doctor after completed appointment
export const rateDoctor = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { appointmentId, rating, comment } = req.body;

    if (!appointmentId || !rating) {
      return res.json({ success: false, message: "Rating is required" });
    }

    if (rating < 1 || rating > 5) {
      return res.json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const appt = await appointmentModel.findById(appointmentId);
    if (!appt) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // ✅ Must belong to this user
    if (appt.userId !== userId) {
      return res.json({ success: false, message: "Not authorized" });
    }

    // ✅ Must be completed
    if (!appt.isCompleted) {
      return res.json({ success: false, message: "Appointment not completed yet" });
    }

    // ✅ Must not be rated already
    if (appt.isRated) {
      return res.json({ success: false, message: "You already rated this appointment" });
    }

    // Create review
    const review = await reviewModel.create({
      doctor: appt.docId,
      user: userId,
      appointment: appt._id,
      rating,
      comment: comment || "",
    });

    // ⭐ Update doctor's average rating
    const doctor = await doctorModel.findById(appt.docId);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const newCount = doctor.ratingCount + 1;
    const newAvg =
      (doctor.averageRating * doctor.ratingCount + rating) / newCount;

    doctor.ratingCount = newCount;
    doctor.averageRating = Number(newAvg.toFixed(1));
    await doctor.save();

    // ✅ Mark appointment as rated
    appt.isRated = true;
    await appt.save();

    res.json({ success: true, message: "Thanks for your review!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// ⭐ Get reviews for a doctor (user side)
export const getDoctorReviewsUser = async (req, res) => {
  try {
    const { docId } = req.params;

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
const sendContactEmail = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, problem } = req.body;

    // Validation
    if (!firstName || !lastName || !phone || !email || !problem) {
      return res.json({
        success: false,
        message: "All fields are required",
      });
    }

    const fullName = `${firstName} ${lastName}`;
    const adminEmail = process.env.ADMIN_COMPLAINT_EMAIL;

    const emailBody = `
📩 New Contact Us Submission

Name: ${fullName}
Email: ${email}
Phone: ${phone}

Problem:
${problem}
    `;

    await sendEmail(
      adminEmail,
      "New Contact Us Message - DocChain",
      emailBody
    );

    res.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Contact email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};


export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  sendContactEmail
};
