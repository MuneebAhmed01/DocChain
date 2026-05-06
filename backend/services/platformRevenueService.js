import platformRevenueModel from "../models/platformRevenueModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { PLATFORM_FEE } from "../config/payment.js";

/**
 * Platform Revenue Service
 * Handles all platform fee tracking and analytics
 */

class PlatformRevenueService {
  /**
   * Record platform fee earnings when appointment is paid
   */
  static async recordPlatformFeeEarned(appointmentId, session = null) {
    try {
      const appointmentQuery = appointmentModel.findById(appointmentId);
      const appointment = session
        ? await appointmentQuery.session(session)
        : await appointmentQuery;

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      // Only record platform fee if payment is completed
      if (!appointment.isPaid && !appointment.tokenPaid) {
        return { success: false, message: "No payment completed for this appointment" };
      }

      // Check if platform fee already recorded
      const existingRecord = await platformRevenueModel.findOne({
        appointmentId,
        transactionType: "PLATFORM_FEE_EARNED",
      });

      if (existingRecord) {
        return {
          success: false,
          message: "Platform fee already recorded",
          isDuplicate: true,
        };
      }

      // Create platform revenue record
      const revenueRecord = new platformRevenueModel({
        appointmentId,
        transactionType: "PLATFORM_FEE_EARNED",
        platformFee: PLATFORM_FEE,
        currency: "pkr",
        doctorId: appointment.docId,
        userId: appointment.userId,
        doctorName: appointment.docData?.name || "Unknown Doctor",
        userName: appointment.userData?.name || "Unknown User",
        paymentType: appointment.paymentType,
        paymentMethod: appointment.paymentMethod || "STRIPE",
        status: "COMPLETED",
        metadata: {
          slotDate: appointment.slotDate,
          slotTime: appointment.slotTime,
          appointmentType: appointment.appointmentType,
          totalAmount: appointment.totalAmount,
          doctorFee: appointment.doctorFee,
        },
      });

      const options = session ? { session } : {};
      await revenueRecord.save(options);

      return {
        success: true,
        message: "Platform fee recorded successfully",
        revenueRecord,
      };
    } catch (error) {
      console.error("Failed to record platform fee:", error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get platform revenue analytics
   */
  static async getRevenueAnalytics(options = {}) {
    const { 
      startDate = null, 
      endDate = null, 
      groupBy = "day" 
    } = options;

    try {
      const matchStage = {
        transactionType: "PLATFORM_FEE_EARNED",
        status: "COMPLETED",
      };

      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      // Group by period
      let groupFormat;
      switch (groupBy) {
        case "hour":
          groupFormat = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            hour: { $hour: "$createdAt" },
          };
          break;
        case "week":
          groupFormat = {
            year: { $year: "$createdAt" },
            week: { $week: "$createdAt" },
          };
          break;
        case "month":
          groupFormat = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          };
          break;
        default: // day
          groupFormat = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          };
      }

      const analytics = await platformRevenueModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: groupFormat,
            totalRevenue: { $sum: "$platformFee" },
            transactionCount: { $sum: 1 },
            averageFee: { $avg: "$platformFee" },
          },
        },
        { $sort: { "_id": 1 } },
      ]);

      // Get totals
      const totalRevenue = await platformRevenueModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$platformFee" },
            totalTransactions: { $sum: 1 },
          },
        },
      ]);

      return {
        success: true,
        analytics,
        summary: totalRevenue[0] || { totalRevenue: 0, totalTransactions: 0 },
      };
    } catch (error) {
      console.error("Failed to get revenue analytics:", error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get platform revenue transactions
   */
  static async getRevenueTransactions(options = {}) {
    const { 
      limit = 50, 
      skip = 0, 
      startDate = null, 
      endDate = null,
      doctorId = null 
    } = options;

    try {
      const query = {
        transactionType: "PLATFORM_FEE_EARNED",
        status: "COMPLETED",
      };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      if (doctorId) {
        query.doctorId = doctorId;
      }

      const transactions = await platformRevenueModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await platformRevenueModel.countDocuments(query);

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
      console.error("Failed to fetch revenue transactions:", error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get daily/weekly/monthly summary
   */
  static async getRevenueSummary(period = "month") {
    try {
      const now = new Date();
      let startDate;

      switch (period) {
        case "day":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const summary = await platformRevenueModel.aggregate([
        {
          $match: {
            transactionType: "PLATFORM_FEE_EARNED",
            status: "COMPLETED",
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$platformFee" },
            totalTransactions: { $sum: 1 },
            averageFee: { $avg: "$platformFee" },
          },
        },
      ]);

      return {
        success: true,
        period,
        summary: summary[0] || { totalRevenue: 0, totalTransactions: 0, averageFee: 0 },
      };
    } catch (error) {
      console.error("Failed to get revenue summary:", error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

export default PlatformRevenueService;
