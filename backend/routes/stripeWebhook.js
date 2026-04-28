import express from "express";
import Stripe from "stripe";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import { fromStripeMinorUnits, PAYMENT_CURRENCY } from "../config/payment.js";

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
        appt.currency = PAYMENT_CURRENCY;

        // Save the actual amount paid in PKR units
        appt.paidAmount = fromStripeMinorUnits(session.amount_total, PAYMENT_CURRENCY);

        await appt.save();

        console.log(
          `Appointment marked as paid. Paid amount: Rs. ${appt.paidAmount}`
        );
      }
    }

    res.json({ received: true });
  }
);

export default router;
