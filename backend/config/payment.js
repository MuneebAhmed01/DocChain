export const PAYMENT_CURRENCY = "pkr";
export const PAYMENT_SYMBOL = "Rs.";
export const CURRENCY_MINOR_UNIT_MULTIPLIER = {
  pkr: 100,
};

// Token payment is a fixed advance amount in PKR.
export const TOKEN_AMOUNT = 500;

// Platform fee is a fixed non-refundable amount in PKR.
export const PLATFORM_FEE = 100;

// Payment Type Constants
export const PAYMENT_TYPE = {
  FULL: "FULL",
  TOKEN: "TOKEN",
};

// Payment Method Constants
export const PAYMENT_METHOD = {
  STRIPE: "STRIPE",
  CASH: "CASH",
};

// Payment Status Constants
export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  PARTIAL: "PARTIAL",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  REFUNDED: "REFUNDED",
};

// Appointment Status Constants
export const APPOINTMENT_STATUS = {
  HOLD: "HOLD",
  CONFIRMED: "CONFIRMED",
  CANCELLED_BY_USER: "CANCELLED_BY_USER",
  CANCELLED_BY_DOCTOR: "CANCELLED_BY_DOCTOR",
  CANCELLED_BY_ADMIN: "CANCELLED_BY_ADMIN",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  COMPLETED: "COMPLETED",
};

// Refund Status Constants
export const REFUND_STATUS = {
  NONE: "NONE",
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
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

export const calculateTokenAmount = (fullAmount) => {
  const validatedAmount = assertPkrAmount(fullAmount, "fullAmount");
  return Math.min(TOKEN_AMOUNT, validatedAmount);
};

export const calculatePlatformFee = () => {
  return PLATFORM_FEE;
};

export const calculateTotalAmount = (doctorFee, includePlatformFee = true) => {
  const validatedFee = assertPkrAmount(doctorFee, "doctorFee");
  return includePlatformFee ? validatedFee + PLATFORM_FEE : validatedFee;
};

export const calculateTokenPaymentTotal = (tokenAmount) => {
  const validatedToken = assertPkrAmount(tokenAmount, "tokenAmount");
  return validatedToken + PLATFORM_FEE;
};