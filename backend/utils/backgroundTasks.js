/**
 * Background Tasks for DocChain
 * Handles periodic cleanup and maintenance tasks
 */

import {
  cleanupExpiredHolds,
  finalizeExpiredOnlineSessions,
} from "../services/appointmentService.js";
import { processAppointmentRemindersSimple } from "../services/appointmentReminderService.js";

let cleanupInterval = null;
let reminderInterval = null;

/**
 * Start background tasks
 * Should be called once when server starts
 */
export const startBackgroundTasks = () => {
  console.log("🚀 Starting background tasks...");

  // Run cleanup every 5 minutes (300,000 ms)
  // For testing, you can change this to 1 minute (60,000 ms)
  cleanupInterval = setInterval(async () => {
    try {
      console.log(`🕐 Running HOLD expiry cleanup at ${new Date().toISOString()}`);
      await cleanupExpiredHolds();
      await finalizeExpiredOnlineSessions();
    } catch (error) {
      console.error("❌ Error in cleanup task:", error);
      // Don't rethrow - let other tasks continue
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Run appointment reminders every 5 minutes
  reminderInterval = setInterval(async () => {
    try {
      console.log(`📧 Running appointment reminders at ${new Date().toISOString()}`);
      await processAppointmentRemindersSimple();
    } catch (error) {
      console.error("❌ Error in reminder task:", error);
      // Don't rethrow - let other tasks continue
    }
  }, 5 * 60 * 1000); // 5 minutes

  console.log("✅ Background tasks started");
};

/**
 * Stop background tasks
 * Call when shutting down server
 */
export const stopBackgroundTasks = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    console.log("🛑 Cleanup task stopped");
  }
  if (reminderInterval) {
    clearInterval(reminderInterval);
    console.log("🛑 Reminder task stopped");
  }
  console.log("🛑 All background tasks stopped");
};

/**
 * Manually trigger cleanup (useful for testing or admin panel)
 */
export const triggerCleanup = async () => {
  console.log("🔄 Manually triggering HOLD expiry cleanup...");
  return await cleanupExpiredHolds();
};

/**
 * Manually trigger reminder processing (useful for testing)
 */
export const triggerReminderProcessing = async () => {
  console.log("🔄 Manually triggering appointment reminders...");
  return await processAppointmentRemindersSimple();
};
