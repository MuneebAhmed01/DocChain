import express from "express";
import Stripe from "stripe";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import onlineConsultSessionModel from "../models/onlineConsultSessionModel.js";
import authUser from "../middlewares/authUser.js";
import { v4 as uuidv4 } from 'uuid';
import userModel from "../models/userModel.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import paymentAccepted from "../emailTemplates/paymentAccepted.js"
// CREATE STRIPE CHECKOUT SESSION
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    // Create stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Appointment with Dr. ${doctor.name}`,
            },
            unit_amount: Math.round(appointment.amount * 0.9 * 100), // 10% discount
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/my-appointments`,
    });

    // Save session ID to appointment
    appointment.checkoutSessionId = session.id;
    await appointment.save();
   


    res.json({ success: true, url: session.url });
  } catch (err) {
    console.log("CHECKOUT SESSION ERROR:", err);
    res.json({ success: false, message: "Checkout session error" });
  }
});


// VERIFY PAYMENT AFTER REDIRECT
router.post("/verify-payment", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.json({ success: false, message: "Missing session id" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.json({ success: false, message: "Session not found" });
    }

    // Stripe new API
    if (session.status !== "complete") {
      return res.json({ success: false, message: "Payment not complete yet" });
    }

    const appointment = await appointmentModel.findOne({
      checkoutSessionId: sessionId,
    });

    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    if (appointment.isPaid) {
      return res.json({ success: true, message: "Already paid" });
    }

    // Mark appointment paid
    appointment.isPaid = true;
    appointment.paymentIntentId = session.payment_intent;
    await appointment.save();
       try {
  await paymentAccepted({
    patientName: appointment.userData.name,
    patientEmail: appointment.userData.email,
    doctorName: appointment.docData.name,
    amount: appointment.amount,
    date: appointment.slotDate,
    time: appointment.slotTime,
  });
} catch (err) {
  console.error("Failed to send payment accepted email:", err);
}
    // Update doctor earnings
    const doctor = await doctorModel.findById(appointment.docId);
    if (doctor) {
      const discounted = appointment.amount * 0.9;
      doctor.earnings = (doctor.earnings || 0) + discounted;
      await doctor.save();
    }

    return res.json({ success: true, message: "Payment verified" });
  } catch (err) {
    console.log("VERIFY ERROR:", err);
    return res.json({ success: false, message: "Verification error" });
  }
});

// CREATE ONLINE CONSULTATION CHECKOUT SESSION
router.post("/create-online-consult-checkout", async (req, res) => {
  try {
    const { doctorId, fee, doctorName } = req.body;

    if (!doctorId || !fee || !doctorName) {
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

    // Create stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Online Consultation with Dr. ${doctorName}`,
              description: `Instant video consultation (${doctor.averageConsultDuration || 15} minutes)`,
            },
            unit_amount: Math.round(fee * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/online-consult-success?session_id={CHECKOUT_SESSION_ID}&doctor_id=${doctorId}`,
      cancel_url: `${process.env.FRONTEND_URL}/online-consulting`,
      metadata: {
        type: 'online_consultation',
        doctorId: doctorId,
        fee: fee.toString()
      }
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.log("ONLINE CONSULT CHECKOUT SESSION ERROR:", err);
    res.json({ success: false, message: "Checkout session error" });
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
      fee: parseFloat(session.metadata.fee),
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
