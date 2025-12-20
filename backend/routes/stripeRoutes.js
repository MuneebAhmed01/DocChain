import express from "express";
import Stripe from "stripe";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";

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

export default router;
