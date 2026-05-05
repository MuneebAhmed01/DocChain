import express from "express";
import Stripe from "stripe";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import onlineConsultSessionModel from "../models/onlineConsultSessionModel.js";
import authUser from "../middlewares/authUser.js";
import { v4 as uuidv4 } from 'uuid';
import userModel from "../models/userModel.js";
import { finalizeStripeAppointmentPayment } from "../services/paymentFinalizeService.js";
import {
  assertPkrAmount,
  fromStripeMinorUnits,
  toStripeMinorUnits,
  PAYMENT_CURRENCY,
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_TYPE,
} from "../config/payment.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import paymentAccepted from "../emailTemplates/paymentAccepted.js"

// CREATE STRIPE CHECKOUT SESSION FOR FULL ONLINE PAYMENT
router.post("/create-checkout-session", authUser, async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // Only HOLD appointments can proceed to payment
    if (appointment.appointmentStatus !== APPOINTMENT_STATUS.HOLD) {
      return res.json({ 
        success: false, 
        message: "Appointment is no longer available for payment" 
      });
    }

    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const appointmentAmount = assertPkrAmount(appointment.amount, "appointment amount");
    const stripeAppointmentAmount = toStripeMinorUnits(appointmentAmount, PAYMENT_CURRENCY);

    appointment.paymentType = PAYMENT_TYPE.FULL;
    appointment.paymentMethod = PAYMENT_METHOD.STRIPE;
    await appointment.save();

    // Create stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: PAYMENT_CURRENCY,
            product_data: {
              name: `Appointment with Dr. ${doctor.name}`,
              description: `Pay full appointment amount`,
            },
            unit_amount: stripeAppointmentAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&payment_type=FULL&doc_id=${appointment.docId}`,
      cancel_url: `${process.env.FRONTEND_URL}/my-appointments`,
    });

    // Save session ID and payment method to appointment
    appointment.checkoutSessionId = session.id;
    await appointment.save();

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.log("CHECKOUT SESSION ERROR:", err);
    res.json({ success: false, message: err.message || "Checkout session error" });
  }
});

// VERIFY ONLINE PAYMENT AND CONFIRM APPOINTMENT
router.post("/verify-payment", authUser, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.json({ success: false, message: "Missing session id" });
    }

    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (!stripeSession) {
      return res.json({ success: false, message: "Session not found" });
    }

    if (stripeSession.currency && stripeSession.currency.toLowerCase() !== PAYMENT_CURRENCY) {
      return res.json({ success: false, message: "Invalid payment currency" });
    }

    if (stripeSession.status !== "complete") {
      return res.json({ success: false, message: "Payment not complete yet" });
    }

    const appointment = await appointmentModel.findOne({
      checkoutSessionId: sessionId,
    });

    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // Check if already processed
    if (appointment.appointmentStatus === APPOINTMENT_STATUS.CONFIRMED && appointment.walletCredited) {
      return res.json({ success: true, message: "Already paid and confirmed" });
    }

    try {
      const confirmedAppointment = await finalizeStripeAppointmentPayment({
        appointmentId: appointment._id,
        stripeSession,
        paymentType: PAYMENT_TYPE.FULL,
      });

      try {
        await paymentAccepted({
          patientName: confirmedAppointment.userData.name,
          patientEmail: confirmedAppointment.userData.email,
          doctorName: confirmedAppointment.docData.name,
          amount: confirmedAppointment.amount,
          paidAmount: confirmedAppointment.paidAmount,
          date: confirmedAppointment.slotDate,
          time: confirmedAppointment.slotTime,
        });
      } catch (err) {
        console.error("Failed to send payment accepted email:", err);
      }

      return res.json({ 
        success: true, 
        message: "Payment verified and appointment confirmed",
        appointment: {
          _id: confirmedAppointment._id,
          status: confirmedAppointment.appointmentStatus,
          paymentStatus: confirmedAppointment.paymentStatus,
        }
      });
    } catch (error) {
      if (error.message.includes("no longer available")) {
        return res.json({ 
          success: false, 
          message: "Slot no longer available - another user booked it" 
        });
      }
      throw error;
    }
  } catch (err) {
    console.log("VERIFY ERROR:", err);
    return res.json({ success: false, message: err.message || "Verification error" });
  }
});

// 🆕 TOKEN PAYMENT ENDPOINT (for CASH option - 10% advance)
router.post("/create-token-payment-session", authUser, async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    if (appointment.appointmentType === "online") {
      return res.json({
        success: false,
        message: "Token payment is not allowed for online appointments",
      });
    }

    if (appointment.appointmentStatus !== APPOINTMENT_STATUS.HOLD) {
      return res.json({ 
        success: false, 
        message: "Appointment is no longer available" 
      });
    }

    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const tokenAmount = assertPkrAmount(appointment.tokenAmount, "token amount");
    const stripeTokenAmount = toStripeMinorUnits(tokenAmount, PAYMENT_CURRENCY);

    appointment.paymentType = PAYMENT_TYPE.TOKEN;
    appointment.paymentMethod = PAYMENT_METHOD.STRIPE;
    await appointment.save();

    // Create stripe session for token payment
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: PAYMENT_CURRENCY,
            product_data: {
              name: `Token Payment for Dr. ${doctor.name}`,
              description: `10% advance payment. Remaining to be paid at clinic.`,
            },
            unit_amount: stripeTokenAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&payment_type=TOKEN&doc_id=${appointment.docId}`,
      cancel_url: `${process.env.FRONTEND_URL}/my-appointments`,
    });

    // Save session ID and mark payment method as CASH
    appointment.checkoutSessionId = session.id;
    await appointment.save();

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.log("TOKEN PAYMENT SESSION ERROR:", err);
    res.json({ success: false, message: err.message || "Session creation error" });
  }
});

// 🆕 VERIFY TOKEN PAYMENT AND CONFIRM APPOINTMENT
router.post("/verify-token-payment", authUser, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.json({ success: false, message: "Missing session id" });
    }

    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (!stripeSession) {
      return res.json({ success: false, message: "Session not found" });
    }

    if (stripeSession.status !== "complete") {
      return res.json({ success: false, message: "Payment not complete" });
    }

    const appointment = await appointmentModel.findOne({
      checkoutSessionId: sessionId,
    });

    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    if (appointment.appointmentStatus === APPOINTMENT_STATUS.CONFIRMED && appointment.walletCredited) {
      return res.json({ success: true, message: "Token already paid and confirmed" });
    }

    try {
      const confirmedAppointment = await finalizeStripeAppointmentPayment({
        appointmentId: appointment._id,
        stripeSession,
        paymentType: PAYMENT_TYPE.TOKEN,
      });

      confirmedAppointment.tokenPaymentIntentId = stripeSession.payment_intent;
      await confirmedAppointment.save();

      try {
        await paymentAccepted({
          patientName: confirmedAppointment.userData.name,
          patientEmail: confirmedAppointment.userData.email,
          doctorName: confirmedAppointment.docData.name,
          amount: confirmedAppointment.tokenAmount,
          paidAmount: confirmedAppointment.paidAmount,
          date: confirmedAppointment.slotDate,
          time: confirmedAppointment.slotTime,
        });
      } catch (err) {
        console.error("Failed to send token payment email:", err);
      }

      return res.json({ 
        success: true, 
        message: "Token payment confirmed. Appointment confirmed. Remaining amount due at clinic.",
        appointment: {
          _id: confirmedAppointment._id,
          status: confirmedAppointment.appointmentStatus,
          paymentStatus: confirmedAppointment.paymentStatus,
          remainingAmount: confirmedAppointment.amount - confirmedAppointment.paidAmount,
        }
      });
    } catch (error) {
      if (error.message.includes("no longer available")) {
        return res.json({ 
          success: false, 
          message: "Slot no longer available - another user booked it" 
        });
      }
      throw error;
    }
  } catch (err) {
    console.log("VERIFY TOKEN PAYMENT ERROR:", err);
    return res.json({ success: false, message: err.message || "Verification error" });
  }
});

// CREATE ONLINE CONSULTATION CHECKOUT SESSION
router.post("/create-online-consult-checkout", authUser, async (req, res) => {
  try {
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    // Verify doctor exists and is available for online consultation
    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    if (!doctor.onlineConsultEnabled || !doctor.isOnlineNow) {
      return res.json({ success: false, message: "Doctor is not available for online consultation" });
    }

    const consultFee = assertPkrAmount(doctor.fees, "consultation fee");
    const stripeConsultFee = toStripeMinorUnits(consultFee, PAYMENT_CURRENCY);

    // Create stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: PAYMENT_CURRENCY,
            product_data: {
              name: `Online Consultation with Dr. ${doctor.name}`,
              description: `Instant video consultation (${doctor.averageConsultDuration || 15} minutes)`,
            },
            unit_amount: stripeConsultFee,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/online-consult-success?session_id={CHECKOUT_SESSION_ID}&doctor_id=${doctorId}`,
      cancel_url: `${process.env.FRONTEND_URL}/online-consulting`,
      metadata: {
        type: 'online_consultation',
        doctorId: doctorId,
          fee: consultFee.toString(),
        currency: PAYMENT_CURRENCY
      }
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.log("ONLINE CONSULT CHECKOUT SESSION ERROR:", err);
    res.json({ success: false, message: err.message || "Checkout session error" });
  }
});

// VERIFY ONLINE CONSULTATION PAYMENT AND CREATE SESSION
router.post("/verify-online-consult-payment", authUser, async (req, res) => {
  try {
    const { sessionId, doctorId } = req.body;

    if (!sessionId || !doctorId) {
      return res.json({ success: false, message: "Missing session id or doctor id" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.json({ success: false, message: "Session not found" });
    }

    if (session.currency && session.currency.toLowerCase() !== PAYMENT_CURRENCY) {
      return res.json({ success: false, message: "Invalid payment currency" });
    }

    if (session.status !== "complete") {
      return res.json({ success: false, message: "Payment not complete yet" });
    }

    // Check if session was already processed
    const existingSession = await onlineConsultSessionModel.findOne({
      paymentIntentId: session.payment_intent
    });

    if (existingSession) {
      return res.json({ 
        success: true, 
        message: "Session already created",
        roomId: existingSession.roomId,
        sessionId: existingSession._id
      });
    }

    // Get doctor details
    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    // Get patient from authenticated user
    const authUser = req.user; // This should be set by auth middleware
    if (!authUser) {
      return res.json({ success: false, message: "User not authenticated" });
    }

    // Generate unique room ID
    const roomId = `consult_${uuidv4()}`;

    // Create online consultation session
    const consultSession = new onlineConsultSessionModel({
      doctorId: doctorId,
      patientId: authUser.id || authUser.userId,
      roomId: roomId,
      fee: fromStripeMinorUnits(session.amount_total, PAYMENT_CURRENCY),
      currency: PAYMENT_CURRENCY,
      durationEstimate: doctor.averageConsultDuration || 15,
      paymentIntentId: session.payment_intent,
      status: "pending_doctor_accept"
    });

    await consultSession.save();

    // Get patient details for notification
    console.log("VERIFY PAYMENT - Looking up patient with ID:", consultSession.patientId);
    const patient = await userModel.findById(consultSession.patientId).select("name email image");
    console.log("VERIFY PAYMENT - Patient found:", patient ? "YES" : "NO");
    if (patient) {
      console.log("VERIFY PAYMENT - Patient data:", { name: patient.name, email: patient.email, hasImage: !!patient.image });
    }

    // Emit socket event to doctor
    const eventData = {
      sessionId: consultSession._id,
      roomId,
      patient: patient ? {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        image: patient.image
      } : {
        id: consultSession.patientId,
        name: 'Unknown Patient',
        email: 'No email',
        image: null
      },
      fee: consultSession.fee,
      durationEstimate: consultSession.durationEstimate,
      createdAt: consultSession.createdAt
    };
    
    console.log("VERIFY PAYMENT - Emitting socket event with patient data:", eventData.patient);
    req.app.get('io').emit(`doctor:${doctorId}:incoming_consult`, eventData);

    return res.json({ 
      success: true, 
      message: "Payment verified and session created",
      roomId: roomId,
      sessionId: consultSession._id
    });
  } catch (err) {
    console.log("VERIFY ONLINE CONSULT PAYMENT ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

export default router;
