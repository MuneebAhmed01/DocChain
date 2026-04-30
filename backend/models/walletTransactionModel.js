import mongoose from "mongoose";

/**
 * Wallet Transaction Model
 * Tracks all wallet operations for doctors (credits and debits)
 * Ensures atomic, auditable wallet operations
 */
const walletTransactionSchema = new mongoose.Schema(
  {
    // Doctor who owns the transaction
    docId: { type: mongoose.Schema.Types.ObjectId, ref: "doctor", required: true },

    // Transaction Type
    transactionType: {
      type: String,
      enum: [
        "TOKEN_CREDIT",        // Token payment received
        "REMAINING_CREDIT",    // Remaining amount after completion
        "TOKEN_REVERSAL",      // Token reversed due to doctor cancellation
        "REFUND_DEBIT",        // Full amount refunded due to user/admin cancellation
        "MANUAL_ADJUSTMENT",   // Admin manual adjustment
      ],
      required: true,
    },

    // Amount involved in this transaction
    amount: { type: Number, required: true },

    // Status of transaction
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
      default: "COMPLETED",
    },

    // Related appointment (if applicable)
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "appointment", default: null },

    // Reason for transaction
    reason: { type: String, default: null },

    // Balance after transaction (snapshot)
    balanceAfter: { type: Number, default: 0 },

    // Idempotency key to prevent duplicate operations
    idempotencyKey: { type: String, unique: true, sparse: true },

    // Metadata for tracking
    metadata: {
      paymentType: { type: String, enum: ["TOKEN", "FULL", null], default: null },
      appointmentStatus: String,
      cancelledBy: String, // "DOCTOR", "USER", "ADMIN"
    },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes for efficient queries
walletTransactionSchema.index({ docId: 1, createdAt: -1 });
walletTransactionSchema.index({ appointmentId: 1 });
walletTransactionSchema.index({ idempotencyKey: 1 }, { sparse: true });
walletTransactionSchema.index({ docId: 1, transactionType: 1 });

const walletTransactionModel =
  mongoose.models.walletTransaction ||
  mongoose.model("walletTransaction", walletTransactionSchema);

export default walletTransactionModel;
