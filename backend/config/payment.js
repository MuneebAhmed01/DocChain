export const PAYMENT_CURRENCY = "pkr";
export const PAYMENT_SYMBOL = "Rs.";
export const CURRENCY_MINOR_UNIT_MULTIPLIER = {
  pkr: 100,
};

// 🔴 Token Payment: Fixed Amount (Rs. 500)
export const TOKEN_AMOUNT = 500; // Fixed token payment in PKR
export const ONLINE_DISCOUNT_PERCENT = 10; // 10% discount for online payment

// Payment Type Constants
export const PAYMENT_TYPE = {
  ONLINE: "ONLINE",  // Full payment with 10% discount
  TOKEN: "TOKEN",    // Rs. 500 advance, remaining at clinic
};

// Payment Status Constants
export const PAYMENT_STATUS = {
  PAID: "PAID",         // Full payment received (ONLINE)
  PARTIAL: "PARTIAL",   // Token received (TOKEN)
  REFUNDED: "REFUNDED", // Payment refunded after conflict/cancellation
};

// Appointment Status Constants
export const APPOINTMENT_STATUS = {
  CONFIRMED: "CONFIRMED",      // Payment received, slot locked
  CANCELLED: "CANCELLED",      // Backward compatible generic cancelled
  CANCELLED_BY_PATIENT: "CANCELLED_BY_PATIENT",
  CANCELLED_BY_DOCTOR: "CANCELLED_BY_DOCTOR",
};

// Refund Status Constants (for UI + ops)
export const REFUND_STATUS = {
  NONE: "NONE",
  INITIATED: "INITIATED",
  PROCESSING: "PROCESSING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
};

export const assertPkrAmount = (amount, fieldName = "amount") => {
  if (amount === undefined || amount === null) {
    throw new Error(`${fieldName} is required`);
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new Error(`${fieldName} must be an integer PKR amount`);
  }

  if (amount <= 0) {
    throw new Error(`${fieldName} must be greater than 0`);
  }

  return amount;
};

export const toStripeMinorUnits = (amount, currency = PAYMENT_CURRENCY) => {
  const validatedAmount = assertPkrAmount(amount, "amount");
  const multiplier = CURRENCY_MINOR_UNIT_MULTIPLIER[currency.toLowerCase()] ?? 100;

  return validatedAmount * multiplier;
};

export const fromStripeMinorUnits = (amount, currency = PAYMENT_CURRENCY) => {
  if (amount === undefined || amount === null) {
    throw new Error("amount is required");
  }

  const multiplier = CURRENCY_MINOR_UNIT_MULTIPLIER[currency.toLowerCase()] ?? 100;
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new Error("amount must be numeric");
  }

  return Math.round(amount / multiplier);
};

export const formatPkrAmount = (amount) => `${PAYMENT_SYMBOL} ${amount}`;

// Calculate discounted amount (90% for online payment)
export const calculateDiscountedAmount = (fullAmount) => {
  const validatedAmount = assertPkrAmount(fullAmount, "fullAmount");
  return Math.round(validatedAmount * ((100 - ONLINE_DISCOUNT_PERCENT) / 100));
};