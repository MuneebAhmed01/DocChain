import Stripe from "stripe";
import { toStripeMinorUnits, PAYMENT_CURRENCY } from "../config/payment.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const refundPaymentIntent = async ({
  paymentIntentId,
  amount,
  currency = PAYMENT_CURRENCY,
}) => {
  if (!paymentIntentId) {
    throw new Error("Missing payment intent id for refund");
  }

  const refundParams = {
    payment_intent: paymentIntentId,
  };

  // Stripe expects minor units if amount is provided.
  if (amount !== undefined && amount !== null) {
    refundParams.amount = toStripeMinorUnits(Number(amount), currency);
  }

  return stripe.refunds.create(refundParams);
};

