/**
 * Background Tasks for DocChain
 * Handles periodic cleanup and maintenance tasks
 */

import {
  cleanupExpiredHolds,
  finalizeExpiredOnlineSessions,
} from "../services/appointmentService.js";
import { processWhapiAppointmentRemindersSimple } from "../services/whapiAppointmentService.js";

let cleanupInterval = null;
let whapiReminderInterval = null;

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

  // Run Whapi reminders every 5 minutes
  whapiReminderInterval = setInterval(async () => {
    try {
      console.log(`[WAPI][REMINDER] Scheduler triggered at ${new Date().toISOString()}`);
      await processWhapiAppointmentRemindersSimple();
    } catch (error) {
      console.error("[WAPI][REMINDER] Scheduler task failed", {
        message: error?.message,
        stack: error?.stack,
      });
    }
  }, 5 * 60 * 1000);

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
  if (whapiReminderInterval) {
    clearInterval(whapiReminderInterval);
    console.log("🛑 Whapi reminder task stopped");
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
  console.log("🔄 Manually triggering Whapi appointment reminders...");
  return await processWhapiAppointmentRemindersSimple();
};
