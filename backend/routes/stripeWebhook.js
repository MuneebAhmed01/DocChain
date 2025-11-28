import express from "express";
import Stripe from "stripe";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe requires raw body for webhook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle successful payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const appt = await appointmentModel.findOne({
        checkoutSessionId: session.id,
      });

      if (appt && !appt.isPaid) {
        // Mark appointment as paid
        appt.isPaid = true;
        appt.paymentIntentId = session.payment_intent;

        // Save the actual amount paid (with discount)
        const discountedAmount = Math.round(appt.amount * 0.9 * 100) / 100; // keep cents
        appt.paidAmount = discountedAmount;

        await appt.save();

        console.log(
          `Appointment marked as paid. Paid amount: $${discountedAmount}`
        );
      }
    }

    res.json({ received: true });
  }
);

export default router;
