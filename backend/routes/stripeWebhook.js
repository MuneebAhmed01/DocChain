import express from "express";
import Stripe from "stripe";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import {
  fromStripeMinorUnits,
  PAYMENT_CURRENCY,
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_TYPE,
} from "../config/payment.js";

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
  return runAppointmentUpdate(async (session) => {
    const appointmentQuery = appointmentModel.findById(appointmentId);
    const appointment = session ? await appointmentQuery.session(session) : await appointmentQuery;

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    if (appointment.walletCredited && appointment.appointmentStatus === APPOINTMENT_STATUS.CONFIRMED) {
      return appointment;
    }

    if (appointment.appointmentStatus !== APPOINTMENT_STATUS.HOLD) {
      throw new Error("Appointment is no longer pending confirmation");
    }

    const paidAmount = fromStripeMinorUnits(sessionObject.amount_total, PAYMENT_CURRENCY);
    const paymentType = appointment.paymentType === PAYMENT_TYPE.TOKEN ? PAYMENT_TYPE.TOKEN : PAYMENT_TYPE.FULL;

    appointment.appointmentStatus = APPOINTMENT_STATUS.CONFIRMED;
    appointment.status = APPOINTMENT_STATUS.CONFIRMED;
    appointment.paymentType = paymentType;
    appointment.paymentMethod = PAYMENT_METHOD.STRIPE;
    appointment.paymentStatus = paymentType === PAYMENT_TYPE.TOKEN ? PAYMENT_STATUS.PARTIAL : PAYMENT_STATUS.PAID;
    appointment.isPaid = paymentType === PAYMENT_TYPE.FULL;
    appointment.tokenPaid = paymentType === PAYMENT_TYPE.TOKEN;
    appointment.paymentIntentId = sessionObject.payment_intent;
    appointment.paidAmount = paidAmount;
    appointment.walletCredited = true;
    appointment.walletCreditedAmount = paidAmount;
    appointment.currency = PAYMENT_CURRENCY;
    appointment.confirmationTime = new Date();

    await appointment.save(session ? { session } : undefined);

    const slotsBooked = { ...(appointment.docData?.slots_booked || {}) };
    if (!slotsBooked[appointment.slotDate]) {
      slotsBooked[appointment.slotDate] = [];
    }
    if (!slotsBooked[appointment.slotDate].includes(appointment.slotTime)) {
      slotsBooked[appointment.slotDate].push(appointment.slotTime);
    }

    await doctorModel.findByIdAndUpdate(
      appointment.docId,
      {
        slots_booked: slotsBooked,
        $inc: { walletBalance: paidAmount, earnings: paidAmount },
      },
      session ? { session } : undefined
    );

    return appointment;
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
