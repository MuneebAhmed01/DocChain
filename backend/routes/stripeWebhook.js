import express from "express";
import Stripe from "stripe";
import appointmentModel from "../models/appointmentModel.js";
import {
  PAYMENT_CURRENCY,
  APPOINTMENT_STATUS,
  PAYMENT_TYPE,
} from "../config/payment.js";
import { finalizeStripeAppointmentPayment } from "../services/paymentFinalizeService.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const isTransactionUnsupportedError = (error) =>
  error?.code === 20 ||
  /Transaction numbers are only allowed on a replica set member or mongos/i.test(
    error?.message || ""
  );

const runAppointmentUpdate = async (operation) => {
  const session = await appointmentModel.startSession();
  let sessionEnded = false;

  const endSessionSafely = async () => {
    if (sessionEnded) {
      return;
    }

    sessionEnded = true;
    await session.endSession();
  };

  try {
    session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (isTransactionUnsupportedError(error)) {
      try {
        await endSessionSafely();
      } catch (endSessionError) {
        console.warn("Failed to end Mongo session after transaction fallback:", endSessionError);
      }

      return operation(null);
    }

    await session.abortTransaction();
    throw error;
  } finally {
    await endSessionSafely();
  }
};

const finalizeWebhookPayment = async (appointmentId, sessionObject) => {
  // Use appointment.paymentType as a hint (token vs full) because webhook
  // runs without knowing which endpoint started the checkout session.
  const appointment = await appointmentModel.findById(appointmentId).select("paymentType");
  const paymentType =
    appointment?.paymentType === PAYMENT_TYPE.TOKEN ? PAYMENT_TYPE.TOKEN : PAYMENT_TYPE.FULL;

  return finalizeStripeAppointmentPayment({
    appointmentId,
    stripeSession: sessionObject,
    paymentType,
  });
};

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

      if (appt && !appt.walletCredited) {
        const finalizedAppointment = await finalizeWebhookPayment(appt._id, session);

        console.log(
          `Appointment marked as paid. Paid amount: Rs. ${finalizedAppointment.paidAmount}`
        );
      }
    }

    res.json({ received: true });
  }
);

export default router;
