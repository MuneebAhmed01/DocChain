import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  // User and Doctor Info
  userId: { type: String, required: true },
  docId: { type: String, required: true },
  userData: { type: Object, required: true },
  docData: { type: Object, required: true },

  // Slot Information
  slotDate: { type: String, required: true },
  slotTime: { type: String, required: [true, "Please select a slot"] },

  // Payment Information
  amount: { type: Number, required: true },
  currency: { type: String, default: "pkr" },
  tokenAmount: { type: Number, default: 500 },
  paidAmount: { type: Number, default: 0 },
  
  // Payment Type is assigned when the user chooses a payment option.
  paymentType: {
    type: String,
    enum: ["PENDING", "FULL", "TOKEN"],
    default: "PENDING",
  },

  // Payment Status
  paymentStatus: {
    type: String,
    enum: ["PENDING", "PAID", "PARTIAL", "PAYMENT_FAILED", "REFUNDED"],
    default: "PENDING",
  },

  // Appointment Status (only CONFIRMED appointments block slots)
  appointmentStatus: {
    type: String,
    enum: [
      "HOLD",
      "CONFIRMED",
      "CANCELLED_BY_USER",
      "CANCELLED_BY_DOCTOR",
      "CANCELLED_BY_ADMIN",
      "PAYMENT_FAILED",
      "COMPLETED",
    ],
    default: "HOLD",
  },

  // Legacy alias kept in sync for older consumers.
  status: {
    type: String,
    enum: [
      "HOLD",
      "CONFIRMED",
      "CANCELLED_BY_USER",
      "CANCELLED_BY_DOCTOR",
      "CANCELLED_BY_ADMIN",
      "PAYMENT_FAILED",
      "COMPLETED",
    ],
    default: "HOLD",
  },

  // Payment Tracking
  paymentIntentId: { type: String, default: null },
  tokenPaymentIntentId: { type: String, default: null },
  checkoutSessionId: { type: String, default: null },
  holdExpiry: { type: Date, default: null },
  confirmationTime: { type: Date, default: null },
  isPaid: { type: Boolean, default: false },
  tokenPaid: { type: Boolean, default: false },
  walletCredited: { type: Boolean, default: false },
  walletCreditedAmount: { type: Number, default: 0 },
  walletReversed: { type: Boolean, default: false },
  walletReversedAmount: { type: Number, default: 0 },
  remainingAmountCredited: { type: Boolean, default: false },
  remainingAmountCreditedAmount: { type: Number, default: 0 },
  completionTime: { type: Date, default: null },
  
  // Timestamps
  date: { type: Number, required: true },

  // Cancellation Details
  cancelled: { type: Boolean, default: false },
  cancellationReason: { type: String, default: null },
  cancelledBy: { type: String, default: null },
  cancelledAt: { type: Date, default: null },

  // Refund Information
  refundStatus: { type: String, enum: ["NONE", "PENDING", "COMPLETED", "FAILED"], default: "NONE" },
  refundAmount: { type: Number, default: 0 },
  refundId: { type: String, default: null },
  refundInitiated: { type: Boolean, default: false },

  // Legacy fields for backward compatibility
  payment: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  isRated: { type: Boolean, default: false },
});

appointmentSchema.pre("save", function syncLegacyFields(next) {
  if (this.paymentType === "ONLINE") {
    this.paymentType = "FULL";
  }

  if (this.appointmentStatus && this.status !== this.appointmentStatus) {
    this.status = this.appointmentStatus;
  }

  if (this.status && this.appointmentStatus !== this.status) {
    this.appointmentStatus = this.status;
  }

  next();
});

// 🔴 CRITICAL: Database-level unique constraint to prevent double booking
// Only CONFIRMED appointments count for uniqueness
appointmentSchema.index(
  { docId: 1, slotDate: 1, slotTime: 1, appointmentStatus: 1 },
  { 
    unique: true,
    partialFilterExpression: { appointmentStatus: "CONFIRMED" },
    name: "unique_confirmed_slot"
  }
);

// Additional indexes for performance
appointmentSchema.index({ userId: 1, appointmentStatus: 1 });
appointmentSchema.index({ docId: 1, slotDate: 1 });
appointmentSchema.index({ checkoutSessionId: 1 });

const appointmentModel =
  mongoose.models.appointment ||
  mongoose.model("appointment", appointmentSchema);

export default appointmentModel;
