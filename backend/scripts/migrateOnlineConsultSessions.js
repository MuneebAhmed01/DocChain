/**
 * Migration Script: Convert online consult sessions into unified appointments.
 *
 * Usage:
 * - DRY_RUN=1 node scripts/migrateOnlineConsultSessions.js
 * - node scripts/migrateOnlineConsultSessions.js
 */

import mongoose from "mongoose";
import "dotenv/config";
import onlineConsultSessionModel from "../models/onlineConsultSessionModel.js";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import userModel from "../models/userModel.js";
import {
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  PAYMENT_CURRENCY,
  REFUND_STATUS,
} from "../config/payment.js";

const toSlotDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate());
  const month = String(d.getMonth() + 1);
  const year = String(d.getFullYear());
  return `${day}_${month}_${year}`;
};

const toSlotTime = (date) => {
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const mapSessionStatusToAppointment = (sessionStatus) => {
  switch (sessionStatus) {
    case "completed":
      return APPOINTMENT_STATUS.COMPLETED;
    case "active":
    case "accepted":
      return APPOINTMENT_STATUS.CONFIRMED;
    case "pending_doctor_accept":
    case "rejected":
    case "expired":
    default:
      return APPOINTMENT_STATUS.CANCELLED_BY_DOCTOR;
  }
};

const migrate = async () => {
  const dryRun = String(process.env.DRY_RUN || "") === "1";
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in environment");
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  const sessions = await onlineConsultSessionModel.find().sort({ createdAt: 1 });
  console.log(`📊 Found ${sessions.length} online consult sessions`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const session of sessions) {
    try {
      const existing = await appointmentModel.findOne({
        appointmentType: "online",
        paymentIntentId: session.paymentIntentId,
      });

      if (existing) {
        skipped++;
        continue;
      }

      const doctor = await doctorModel.findById(session.doctorId).select("-password");
      const user = await userModel.findById(session.patientId).select("-password");

      const amount = Number(session.fee || 0);
      const slotDate = toSlotDate(session.createdAt);
      const slotTime = toSlotTime(session.createdAt);
      const appointmentStatus = mapSessionStatusToAppointment(session.status);

      const appointmentDoc = {
        userId: String(session.patientId),
        docId: String(session.doctorId),
        userData: user ? user.toObject() : {},
        docData: doctor ? doctor.toObject() : {},
        slotDate,
        slotTime,
        appointmentType: "online",
        amount,
        currency: session.currency || PAYMENT_CURRENCY,
        tokenAmount: 0,
        paidAmount: amount,
        paymentType: PAYMENT_TYPE.FULL,
        paymentStatus: PAYMENT_STATUS.PAID,
        appointmentStatus,
        status: appointmentStatus,
        paymentIntentId: session.paymentIntentId,
        confirmationTime: session.acceptedAt || session.createdAt,
        isPaid: true,
        tokenPaid: false,
        walletCredited: false, // wallet should be reconciled separately if needed
        cancelled: appointmentStatus !== APPOINTMENT_STATUS.CONFIRMED && appointmentStatus !== APPOINTMENT_STATUS.COMPLETED,
        cancelledBy: "MIGRATION",
        cancelledAt: appointmentStatus === APPOINTMENT_STATUS.CANCELLED_BY_DOCTOR ? new Date(session.updatedAt || session.createdAt) : null,
        cancellationReason: `Migrated from online consult session ${session._id}`,
        refundStatus: REFUND_STATUS.NONE,
        refundAmount: 0,
        refundInitiated: false,
        appointmentTime: session.startedAt || session.acceptedAt || session.createdAt,
        attendanceStatus: appointmentStatus === APPOINTMENT_STATUS.COMPLETED ? "completed" : "booked",
        date: Date.now(),
      };

      if (dryRun) {
        created++;
        continue;
      }

      await appointmentModel.create(appointmentDoc);
      created++;
    } catch (error) {
      failed++;
      console.error(`❌ Failed to migrate session ${session._id}:`, error.message);
    }
  }

  console.log("📈 Migration Summary");
  console.log(`- created: ${created}`);
  console.log(`- skipped: ${skipped}`);
  console.log(`- failed: ${failed}`);

  await mongoose.connection.close();
  console.log("✅ Done");
};

migrate().catch(async (err) => {
  console.error("❌ Migration failed:", err.message);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});

