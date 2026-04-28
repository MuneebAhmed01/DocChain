/**
 * Migration Script: Update existing appointments with new fields
 * Run this once to add new fields to existing appointments
 * 
 * Usage: node scripts/migrateAppointments.js
 */

import mongoose from "mongoose";
import appointmentModel from "../models/appointmentModel.js";
import {
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  REFUND_STATUS,
  TOKEN_AMOUNT,
} from "../config/payment.js";
import "dotenv/config";

const migrateAppointments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("🔄 Starting appointment migration...");

    // Find all existing appointments
    const appointments = await appointmentModel.find();
    console.log(`📊 Found ${appointments.length} appointments to migrate`);

    let updated = 0;
    let errors = 0;

    for (const appointment of appointments) {
      try {
        let needsUpdate = false;

        // Status normalization
        if (!appointment.status) {
          appointment.status = appointment.cancelled
            ? APPOINTMENT_STATUS.CANCELLED
            : APPOINTMENT_STATUS.CONFIRMED;
          needsUpdate = true;
        }

        // Payment type inference (best-effort)
        if (!appointment.paymentType) {
          appointment.paymentType = appointment.tokenPaid
            ? PAYMENT_TYPE.TOKEN
            : PAYMENT_TYPE.ONLINE;
          needsUpdate = true;
        }

        // Payment status inference
        if (!appointment.paymentStatus) {
          appointment.paymentStatus = appointment.isPaid
            ? PAYMENT_STATUS.PAID
            : PAYMENT_STATUS.PARTIAL;
          needsUpdate = true;
        }

        // Backfill paidAmount for legacy records (best-effort)
        if (typeof appointment.paidAmount !== "number") {
          if (appointment.paymentType === PAYMENT_TYPE.TOKEN && appointment.tokenPaid) {
            appointment.paidAmount = TOKEN_AMOUNT;
          } else if (appointment.isPaid) {
            appointment.paidAmount = appointment.amount;
          } else {
            appointment.paidAmount = 0;
          }
          needsUpdate = true;
        }

        // Refund fields
        if (!appointment.refundStatus) {
          appointment.refundStatus = REFUND_STATUS.NONE;
          needsUpdate = true;
        }

        if (typeof appointment.doctorWalletCredited !== "boolean") {
          appointment.doctorWalletCredited = false;
          needsUpdate = true;
        }

        if (typeof appointment.doctorWalletReversed !== "boolean") {
          appointment.doctorWalletReversed = false;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await appointment.save();
          updated++;
          console.log(`✅ Updated appointment: ${appointment._id}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error updating appointment ${appointment._id}:`, error.message);
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   Total appointments: ${appointments.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);

    await mongoose.connection.close();
    console.log("\n✅ Migration completed and MongoDB connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

// Run migration
migrateAppointments();
