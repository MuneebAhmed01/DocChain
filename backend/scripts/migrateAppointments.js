/**
 * Migration Script: Update existing appointments with new fields
 * Run this once to add new fields to existing appointments
 * 
 * Usage: node scripts/migrateAppointments.js
 */

import mongoose from "mongoose";
import appointmentModel from "../models/appointmentModel.js";
import { APPOINTMENT_STATUS, PAYMENT_STATUS } from "../config/payment.js";
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

        // Migrate based on old fields
        if (!appointment.appointmentStatus) {
          // If cancelled: true -> CANCELLED_BY_USER or CANCELLED_BY_ADMIN
          if (appointment.cancelled) {
            appointment.appointmentStatus = APPOINTMENT_STATUS.CANCELLED_BY_USER;
            appointment.cancelledBy = "USER";
            appointment.cancellationReason = "Cancelled (migrated from old system)";
          }
          // If payment: true and isPaid: true -> CONFIRMED and PAID
          else if (appointment.payment && appointment.isPaid) {
            appointment.appointmentStatus = APPOINTMENT_STATUS.CONFIRMED;
            appointment.paymentStatus = PAYMENT_STATUS.PAID;
            appointment.confirmationTime = new Date(appointment.date);
          }
          // If payment: true and no isPaid -> CONFIRMED and PARTIAL
          else if (appointment.payment && !appointment.isPaid) {
            appointment.appointmentStatus = APPOINTMENT_STATUS.CONFIRMED;
            appointment.paymentStatus = PAYMENT_STATUS.PARTIAL;
            appointment.confirmationTime = new Date(appointment.date);
          }
          // If no payment data -> CONFIRMED (assumption for old bookings)
          else {
            appointment.appointmentStatus = APPOINTMENT_STATUS.CONFIRMED;
            appointment.paymentStatus = appointment.isPaid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.NOT_PAID;
            appointment.confirmationTime = new Date(appointment.date);
          }
          needsUpdate = true;
        }

        // Add paymentMethod if missing
        if (!appointment.paymentMethod) {
          appointment.paymentMethod = appointment.isPaid ? "ONLINE" : null;
          needsUpdate = true;
        }

        // Add paymentStatus if missing
        if (!appointment.paymentStatus) {
          if (appointment.isPaid) {
            appointment.paymentStatus = PAYMENT_STATUS.PAID;
          } else if (appointment.cancelled) {
            appointment.paymentStatus = PAYMENT_STATUS.NOT_PAID;
          } else {
            appointment.paymentStatus = PAYMENT_STATUS.NOT_PAID;
          }
          needsUpdate = true;
        }

        // Add default values for new fields
        if (!appointment.holdExpiry) {
          appointment.holdExpiry = null;
        }

        if (!appointment.tokenAmount) {
          appointment.tokenAmount = 0;
        }

        if (!appointment.tokenPaid) {
          appointment.tokenPaid = false;
        }

        if (!appointment.refundStatus) {
          appointment.refundStatus = "NONE";
        }

        if (!appointment.refundAmount) {
          appointment.refundAmount = 0;
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
