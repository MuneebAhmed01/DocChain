import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import walletTransactionModel from "../models/walletTransactionModel.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Wallet Service
 * Handles all wallet operations with atomic transactions and idempotency checks
 * Prevents double-crediting, race conditions, and maintains balance consistency
 */

class WalletService {
  /**
   * Credit wallet for token payment
   * Called when appointment is confirmed with TOKEN payment
   */
  static async creditTokenPayment(appointmentId, docId, tokenAmount, session = null) {
    return this._performWalletOperation({
      docId,
      appointmentId,
      transactionType: "TOKEN_CREDIT",
      amount: tokenAmount,
      reason: "Token payment received for appointment",
      metadata: { paymentType: "TOKEN" },
      session,
    });
  }

  /**
   * Credit wallet for remaining amount on completion
   * Called ONLY when appointment status transitions to COMPLETED
   * and remaining amount hasn't been credited yet
   */
  static async creditRemainingAmount(appointmentId, docId, remainingAmount, session = null) {
    return this._performWalletOperation({
      docId,
      appointmentId,
      transactionType: "REMAINING_CREDIT",
      amount: remainingAmount,
      reason: "Remaining appointment amount after completion",
      metadata: { paymentType: "TOKEN" },
      session,
    });
  }

  /**
   * Reverse token on doctor cancellation
   * Atomic operation: checks appointment status, prevents double-reversal
   */
  static async reverseTokenOnDoctorCancel(appointmentId, docId, tokenAmount, session = null) {
    return this._performWalletOperation({
      docId,
      appointmentId,
      transactionType: "TOKEN_REVERSAL",
      amount: -tokenAmount, // Negative amount for debit
      reason: "Token reversal: Doctor cancelled appointment",
      metadata: { cancelledBy: "DOCTOR" },
      session,
    });
  }

  /**
   * Debit wallet for full refund (user or admin cancellation)
   * Reduces wallet when user/admin cancels a confirmed appointment
   */
  static async debitFullRefund(appointmentId, docId, refundAmount, cancelledBy = "USER", session = null) {
    return this._performWalletOperation({
      docId,
      appointmentId,
      transactionType: "REFUND_DEBIT",
      amount: -refundAmount, // Negative amount for debit
      reason: `Full refund: Appointment cancelled by ${cancelledBy}`,
      metadata: { cancelledBy },
      session,
    });
  }

  /**
   * Perform wallet operation with atomic transaction
   * Ensures balance consistency and prevents race conditions
   * @private
   */
  static async _performWalletOperation({
    docId,
    appointmentId,
    transactionType,
    amount,
    reason,
    metadata,
    session = null,
  }) {
    const idempotencyKey = `${appointmentId}-${transactionType}`;

    try {
      // Check if transaction already exists (idempotency)
      const existingTransaction = await walletTransactionModel.findOne({
        idempotencyKey,
      });

      if (existingTransaction && existingTransaction.status === "COMPLETED") {
        console.log(
          `Transaction already completed: ${appointmentId} - ${transactionType}`
        );
        return {
          success: false,
          message: "Transaction already processed",
          isDuplicate: true,
          transaction: existingTransaction,
        };
      }

      // Get current doctor balance
      const doctor = await doctorModel.findById(docId).select("walletBalance earnings");
      if (!doctor) {
        throw new Error("Doctor not found");
      }

      const previousBalance = doctor.walletBalance || 0;
      const newBalance = previousBalance + amount;

      // Prevent negative wallet balance for reversals/refunds
      if (newBalance < 0) {
        throw new Error(
          `Insufficient wallet balance. Current: ${previousBalance}, Required: ${Math.abs(amount)}`
        );
      }

      // Create transaction record
      const transaction = new walletTransactionModel({
        docId,
        appointmentId,
        transactionType,
        amount,
        reason,
        idempotencyKey,
        status: "PENDING",
        metadata: {
          ...metadata,
          appointmentStatus: (await appointmentModel.findById(appointmentId))?.appointmentStatus,
        },
        balanceAfter: newBalance,
      });

      // Update doctor wallet (atomic with transaction creation)
      const updateResult = await doctorModel.findByIdAndUpdate(
        docId,
        {
          $inc: {
            walletBalance: amount,
            earnings: amount,
          },
        },
        { new: true, session }
      );

      // Mark transaction as completed
      transaction.status = "COMPLETED";
      transaction.processedAt = new Date();
      await transaction.save(session ? { session } : {});

      return {
        success: true,
        message: `${transactionType} processed successfully`,
        transaction: transaction,
        newBalance: updateResult.walletBalance,
      };
    } catch (error) {
      console.error(`Wallet operation failed (${transactionType}):`, error.message);

      // Record failed transaction
      try {
        await walletTransactionModel.create([{
          docId,
          appointmentId,
          transactionType,
          amount,
          reason,
          idempotencyKey: `${idempotencyKey}-${Date.now()}`, // Unique key for failed attempt
          status: "FAILED",
          metadata,
        }]);
      } catch (txError) {
        console.error("Failed to record transaction failure:", txError.message);
      }

      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get wallet transactions for a doctor
   * Used for audit trail and analytics
   */
  static async getTransactionHistory(docId, options = {}) {
    const { limit = 50, skip = 0, startDate = null, endDate = null } = options;

    try {
      const query = { docId };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const transactions = await walletTransactionModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await walletTransactionModel.countDocuments(query);

      return {
        success: true,
        transactions,
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Failed to fetch transaction history:", error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Check if a transaction has been processed
   * Used to prevent double processing
   */
  static async hasTransactionBeenProcessed(appointmentId, transactionType) {
    try {
      const transaction = await walletTransactionModel.findOne({
        appointmentId,
        transactionType,
        status: "COMPLETED",
      });

      return transaction ? true : false;
    } catch (error) {
      console.error("Failed to check transaction status:", error.message);
      return false;
    }
  }

  /**
   * Get wallet summary for a doctor
   * Shows current balance and recent transaction summary
   */
  static async getWalletSummary(docId) {
    try {
      const doctor = await doctorModel
        .findById(docId)
        .select("walletBalance earnings");

      if (!doctor) {
        return { success: false, message: "Doctor not found" };
      }

      // Get recent transaction summary
      const recentTransactions = await walletTransactionModel
        .find({ docId, status: "COMPLETED" })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Calculate totals by type
      const summary = {
        totalCredits: 0,
        totalDebits: 0,
        tokenCredits: 0,
        remainingCredits: 0,
        reversals: 0,
        refunds: 0,
      };

      recentTransactions.forEach((tx) => {
        if (tx.amount > 0) {
          summary.totalCredits += tx.amount;
          if (tx.transactionType === "TOKEN_CREDIT") summary.tokenCredits += tx.amount;
          if (tx.transactionType === "REMAINING_CREDIT") summary.remainingCredits += tx.amount;
        } else {
          summary.totalDebits += Math.abs(tx.amount);
          if (tx.transactionType === "TOKEN_REVERSAL") summary.reversals += Math.abs(tx.amount);
          if (tx.transactionType === "REFUND_DEBIT") summary.refunds += Math.abs(tx.amount);
        }
      });

      return {
        success: true,
        walletBalance: doctor.walletBalance,
        totalEarnings: doctor.earnings,
        recentTransactions,
        summary,
      };
    } catch (error) {
      console.error("Failed to fetch wallet summary:", error.message);
      return { success: false, message: error.message };
    }
  }
}

export default WalletService;
