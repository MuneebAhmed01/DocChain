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
  amount: { type: Number, required: true }, // full fee in PKR
  currency: { type: String, default: "pkr" },
  paidAmount: { type: Number, default: 0 }, // actual paid amount in PKR
  
  // Payment Type (ONLINE full payment or TOKEN 10% advance)
  paymentType: { 
    type: String, 
    enum: ["ONLINE", "TOKEN"], 
    required: true 
  },

  // Payment Status
  paymentStatus: {
    type: String,
    enum: ["PAID", "PARTIAL"],
    required: true
  },

  // Status (only CONFIRMED appointments block slots)
  status: {
    type: String,
    enum: ["CONFIRMED", "CANCELLED"],
    default: "CONFIRMED"
  },

  // Payment Tracking
  paymentIntentId: { type: String, default: null },
  checkoutSessionId: { type: String, default: null },
  isPaid: { type: Boolean, default: true }, // always true when appointment exists
  
  // Timestamps
  date: { type: Number, required: true }, // booking created timestamp

  // Cancellation Details
  cancelled: { type: Boolean, default: false },
  cancellationReason: { type: String, default: null },
  cancelledAt: { type: Date, default: null },

  // Refund Information
  refundId: { type: String, default: null },
  refundInitiated: { type: Boolean, default: false },

  // Legacy fields for backward compatibility
  payment: { type: Boolean, default: true },
  isCompleted: { type: Boolean, default: false },
  isRated: { type: Boolean, default: false },
});

// 🔴 CRITICAL: Database-level unique constraint to prevent double booking
// Only CONFIRMED appointments count for uniqueness
appointmentSchema.index(
  { docId: 1, slotDate: 1, slotTime: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: "CONFIRMED" },
    name: "unique_confirmed_slot"
  }
);

// Additional indexes for performance
appointmentSchema.index({ userId: 1, status: 1 });
appointmentSchema.index({ docId: 1, slotDate: 1 });
appointmentSchema.index({ checkoutSessionId: 1 });

const appointmentModel =
  mongoose.models.appointment ||
  mongoose.model("appointment", appointmentSchema);

export default appointmentModel;
