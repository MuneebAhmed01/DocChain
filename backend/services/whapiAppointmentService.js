import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import userModel from "../models/userModel.js";
import { APPOINTMENT_STATUS } from "../config/payment.js";
import { normalizeWhapiPhoneNumber, sendWhapiTextMessage } from "./whapiService.js";

const REMINDER_MINUTES = 30;
const REMINDER_WINDOW_MINUTES = 5;

const toAppointmentDateTime = (appointment) => {
  if (appointment?.appointmentTime) {
    const appointmentDate = new Date(appointment.appointmentTime);
    if (!Number.isNaN(appointmentDate.getTime())) {
      return appointmentDate;
    }
  }

  const slotDate = String(appointment?.slotDate || "").trim();
  const slotTime = String(appointment?.slotTime || "").trim();
  if (!slotDate || !slotTime) {
    return null;
  }

  const timeMatch = slotTime.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!timeMatch) {
    return null;
  }

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const meridiem = timeMatch[3]?.toUpperCase();

  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  const isoDate = slotDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]), hour, minute, 0, 0);
  }

  // Handles both D_M_YYYY and DD_MM_YYYY (single or double digit day/month)
  const underscoredDate = slotDate.match(/^(\d{1,2})_(\d{1,2})_(\d{4})$/);
  if (underscoredDate) {
    return new Date(Number(underscoredDate[3]), Number(underscoredDate[2]) - 1, Number(underscoredDate[1]), hour, minute, 0, 0);
  }

  const slashedDate = slotDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashedDate) {
    return new Date(Number(slashedDate[3]), Number(slashedDate[2]) - 1, Number(slashedDate[1]), hour, minute, 0, 0);
  }

  const fallback = new Date(`${slotDate} ${slotTime}`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatTimeLabel = (appointmentDateTime, fallbackSlotTime) => {
  if (!appointmentDateTime || Number.isNaN(appointmentDateTime.getTime())) {
    return fallbackSlotTime;
  }

  return appointmentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const sendWhapiAppointmentBookedNotifications = async (appointment) => {
  try {
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    const [patient, doctor] = await Promise.all([
      userModel.findById(appointment.userId),
      doctorModel.findById(appointment.docId),
    ]);

    if (!patient || !doctor) {
      throw new Error("Unable to load appointment participants");
    }

    const appointmentDateTime = toAppointmentDateTime(appointment);
    const timeLabel = formatTimeLabel(appointmentDateTime, appointment.slotTime);
    const patientName = patient.name || appointment.userData?.name || "Patient";
    const doctorName = doctor.name || appointment.docData?.name || "Doctor";

    const patientPhone = normalizeWhapiPhoneNumber(patient.phone_number || appointment.userData?.phone_number);
    const doctorPhone = normalizeWhapiPhoneNumber(doctor.phone_number || appointment.docData?.phone_number);

    const result = {
      patient: { sent: false },
      doctor: { sent: false },
    };

    if (patientPhone && !appointment.whapi_booking_sent_patient) {
      const response = await sendWhapiTextMessage({
        to: patientPhone,
        body: `Your appointment has been booked for ${timeLabel} with Dr. ${doctorName}.`,
      });
      result.patient = { sent: true, response };
      await appointmentModel.findByIdAndUpdate(appointment._id, { whapi_booking_sent_patient: true });
    }

    if (doctorPhone && !appointment.whapi_booking_sent_doctor) {
      const response = await sendWhapiTextMessage({
        to: doctorPhone,
        body: `Your appointment has been booked for ${timeLabel} with ${patientName}.`,
      });
      result.doctor = { sent: true, response };
      await appointmentModel.findByIdAndUpdate(appointment._id, { whapi_booking_sent_doctor: true });
    }

    return { sent: Boolean(result.patient.sent || result.doctor.sent), ...result };
  } catch (error) {
    console.error("❌ Whapi booking notification error:", error);
    return { sent: false, error: error.message };
  }
};

export const processWhapiAppointmentRemindersSimple = async () => {
  try {
    console.log("[WAPI][REMINDER] Reminder job started");
    const now = new Date();
    console.log("[WAPI][REMINDER] Job timestamp", { now: now.toISOString() });
    const confirmedAppointments = await appointmentModel.find({
      appointmentStatus: APPOINTMENT_STATUS.CONFIRMED,
      $or: [
        { whapi_reminder_sent_patient: { $ne: true } },
        { whapi_reminder_sent_doctor: { $ne: true } },
      ],
    });

    console.log("[WAPI][REMINDER] Appointments fetched", {
      total: confirmedAppointments.length,
    });

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const appointment of confirmedAppointments) {
      processed += 1;

      try {
        console.log("[WAPI][REMINDER] Evaluating appointment", {
          appointmentId: String(appointment._id),
          userId: appointment.userId,
          docId: appointment.docId,
          slotDate: appointment.slotDate,
          slotTime: appointment.slotTime,
          appointmentTime: appointment.appointmentTime,
        });

        const appointmentDateTime = toAppointmentDateTime(appointment);
        if (!appointmentDateTime || Number.isNaN(appointmentDateTime.getTime())) {
          skipped += 1;
          console.warn("[WAPI][REMINDER] Skipping appointment: invalid appointment datetime", {
            appointmentId: String(appointment._id),
            slotDate: appointment.slotDate,
            slotTime: appointment.slotTime,
            appointmentTime: appointment.appointmentTime,
          });
          continue;
        }

        const minutesUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);
        if (minutesUntilAppointment < REMINDER_MINUTES - REMINDER_WINDOW_MINUTES || minutesUntilAppointment > REMINDER_MINUTES + REMINDER_WINDOW_MINUTES) {
          skipped += 1;
          console.log("[WAPI][REMINDER] Skipping appointment: outside reminder window", {
            appointmentId: String(appointment._id),
            minutesUntilAppointment,
            expectedWindowMin: REMINDER_MINUTES - REMINDER_WINDOW_MINUTES,
            expectedWindowMax: REMINDER_MINUTES + REMINDER_WINDOW_MINUTES,
          });
          continue;
        }

        console.log("[WAPI][REMINDER] Appointment is inside reminder window", {
          appointmentId: String(appointment._id),
          minutesUntilAppointment,
        });

        const [patient, doctor] = await Promise.all([
          userModel.findById(appointment.userId),
          doctorModel.findById(appointment.docId),
        ]);

        const reminderMessage = `Reminder: Your appointment is in 30 minutes at ${formatTimeLabel(appointmentDateTime, appointment.slotTime)}.`;
        console.log("[WAPI][REMINDER] Message payload prepared", {
          appointmentId: String(appointment._id),
          body: reminderMessage,
        });

        if (patient?.phone_number && !appointment.whapi_reminder_sent_patient) {
          const normalizedPatient = normalizeWhapiPhoneNumber(patient.phone_number);
          console.log(`[WAPI][REMINDER] WhatsApp reminder triggered for +${normalizedPatient}`);
          console.log(`[WAPI][REMINDER] Sending WhatsApp message to +${normalizedPatient}`);
          const response = await sendWhapiTextMessage({ to: patient.phone_number, body: reminderMessage });
          if (response) {
            sent += 1;
            console.log("[WAPI][REMINDER] WAPI response received (patient)", {
              appointmentId: String(appointment._id),
              recipient: `+${normalizedPatient}`,
              response,
            });
            console.log(`[WAPI][REMINDER] WhatsApp message sent successfully to +${normalizedPatient}`);
            await appointmentModel.findByIdAndUpdate(appointment._id, { whapi_reminder_sent_patient: true });
          } else {
            failed += 1;
            console.error(`[WAPI][REMINDER] Failed to send WhatsApp message to +${normalizedPatient}`);
          }
        } else if (!patient?.phone_number) {
          skipped += 1;
          console.warn("[WAPI][REMINDER] Skipping patient reminder: missing phone number", {
            appointmentId: String(appointment._id),
            userId: appointment.userId,
          });
        } else {
          skipped += 1;
          console.log("[WAPI][REMINDER] Skipping patient reminder: already sent", {
            appointmentId: String(appointment._id),
          });
        }

        if (doctor?.phone_number && !appointment.whapi_reminder_sent_doctor) {
          const normalizedDoctor = normalizeWhapiPhoneNumber(doctor.phone_number);
          console.log(`[WAPI][REMINDER] WhatsApp reminder triggered for +${normalizedDoctor}`);
          console.log(`[WAPI][REMINDER] Sending WhatsApp message to +${normalizedDoctor}`);
          const response = await sendWhapiTextMessage({ to: doctor.phone_number, body: reminderMessage });
          if (response) {
            sent += 1;
            console.log("[WAPI][REMINDER] WAPI response received (doctor)", {
              appointmentId: String(appointment._id),
              recipient: `+${normalizedDoctor}`,
              response,
            });
            console.log(`[WAPI][REMINDER] WhatsApp message sent successfully to +${normalizedDoctor}`);
            await appointmentModel.findByIdAndUpdate(appointment._id, { whapi_reminder_sent_doctor: true });
          } else {
            failed += 1;
            console.error(`[WAPI][REMINDER] Failed to send WhatsApp message to +${normalizedDoctor}`);
          }
        } else if (!doctor?.phone_number) {
          skipped += 1;
          console.warn("[WAPI][REMINDER] Skipping doctor reminder: missing phone number", {
            appointmentId: String(appointment._id),
            docId: appointment.docId,
          });
        } else {
          skipped += 1;
          console.log("[WAPI][REMINDER] Skipping doctor reminder: already sent", {
            appointmentId: String(appointment._id),
          });
        }
      } catch (appointmentError) {
        failed += 1;
        console.error(`[WAPI][REMINDER] Failed to send WhatsApp message for appointment ${appointment._id}`, {
          message: appointmentError?.message,
          stack: appointmentError?.stack,
        });
      }
    }

    console.log("[WAPI][REMINDER] Job completed", { processed, sent, failed, skipped });
    if (failed > 0) {
      console.error("[WAPI][REMINDER] WhatsApp reminder flow failed");
    } else {
      console.log("[WAPI][REMINDER] WhatsApp reminder flow completed successfully");
    }
    return { processed, sent, failed, skipped };
  } catch (error) {
    console.error("[WAPI][REMINDER] Unexpected exception in reminder job", {
      message: error?.message,
      stack: error?.stack,
    });
    console.error("[WAPI][REMINDER] WhatsApp reminder flow failed");
    throw error;
  }
};
export const sendWhapiAppointmentCancelledNotifications = async (appointment) => {
  try {
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    const [patient, doctor] = await Promise.all([
      userModel.findById(appointment.userId),
      doctorModel.findById(appointment.docId),
    ]);

    if (!patient || !doctor) {
      throw new Error("Unable to load appointment participants");
    }

    const appointmentDateTime = toAppointmentDateTime(appointment);
    const timeLabel = formatTimeLabel(appointmentDateTime, appointment.slotTime);
    const patientName = patient.name || appointment.userData?.name || "Patient";
    const doctorName = doctor.name || appointment.docData?.name || "Doctor";
    const slotDateLabel = appointment.slotDate;

    const patientPhone = normalizeWhapiPhoneNumber(patient.phone_number || appointment.userData?.phone_number);
    const doctorPhone = normalizeWhapiPhoneNumber(doctor.phone_number || appointment.docData?.phone_number);

    const result = {
      patient: { sent: false },
      doctor: { sent: false },
    };

    if (patientPhone) {
      try {
        const response = await sendWhapiTextMessage({
          to: patientPhone,
          body: `Your appointment on ${slotDateLabel} at ${timeLabel} with Dr. ${doctorName} has been cancelled.`,
        });
        result.patient = { sent: true, response };
        console.log(`[WAPI][CANCEL] Cancellation notice sent to patient ${patientPhone}`);
      } catch (err) {
        console.error(`[WAPI][CANCEL] Failed to send to patient ${patientPhone}:`, err?.message);
        result.patient = { sent: false, error: err?.message };
      }
    } else {
      console.warn(`[WAPI][CANCEL] Skipping patient – no phone number`, { userId: appointment.userId });
    }

    if (doctorPhone) {
      try {
        const response = await sendWhapiTextMessage({
          to: doctorPhone,
          body: `Appointment with ${patientName} on ${slotDateLabel} at ${timeLabel} has been cancelled.`,
        });
        result.doctor = { sent: true, response };
        console.log(`[WAPI][CANCEL] Cancellation notice sent to doctor ${doctorPhone}`);
      } catch (err) {
        console.error(`[WAPI][CANCEL] Failed to send to doctor ${doctorPhone}:`, err?.message);
        result.doctor = { sent: false, error: err?.message };
      }
    } else {
      console.warn(`[WAPI][CANCEL] Skipping doctor – no phone number`, { docId: appointment.docId });
    }

    return { sent: Boolean(result.patient.sent || result.doctor.sent), ...result };
  } catch (error) {
    console.error("[WAPI][CANCEL] Cancellation notification error:", error);
    return { sent: false, error: error.message };
  }
};

/**
 * Manual / on-demand reminder for a single appointment.
 * Called from the API endpoint triggered by the frontend "Send Reminder" button.
 * Does NOT affect booking or cancellation flows.
 */
export const sendWhapiReminderForAppointment = async (appointmentId) => {
  try {
    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return { sent: false, error: "Appointment not found" };
    }

    const [patient, doctor] = await Promise.all([
      userModel.findById(appointment.userId),
      doctorModel.findById(appointment.docId),
    ]);

    if (!patient || !doctor) {
      return { sent: false, error: "Unable to load appointment participants" };
    }

    const appointmentDateTime = toAppointmentDateTime(appointment);
    const timeLabel = formatTimeLabel(appointmentDateTime, appointment.slotTime);
    const patientName = patient.name || appointment.userData?.name || "Patient";
    const doctorName = doctor.name || appointment.docData?.name || "Doctor";
    const slotDateLabel = appointment.slotDate;

    const patientPhone = normalizeWhapiPhoneNumber(patient.phone_number || appointment.userData?.phone_number);
    const doctorPhone = normalizeWhapiPhoneNumber(doctor.phone_number || appointment.docData?.phone_number);

    const result = { patient: { sent: false }, doctor: { sent: false } };

    if (patientPhone) {
      try {
        const response = await sendWhapiTextMessage({
          to: patientPhone,
          body: `Reminder: Your appointment with Dr. ${doctorName} is on ${slotDateLabel} at ${timeLabel}. Please be on time.`,
        });
        result.patient = { sent: true, response };
        console.log(`[WAPI][MANUAL-REMINDER] Sent to patient ${patientPhone}`);
      } catch (err) {
        console.error(`[WAPI][MANUAL-REMINDER] Failed to send to patient:`, err?.message);
        result.patient = { sent: false, error: err?.message };
      }
    } else {
      console.warn(`[WAPI][MANUAL-REMINDER] No patient phone for appointment ${appointmentId}`);
    }

    if (doctorPhone) {
      try {
        const response = await sendWhapiTextMessage({
          to: doctorPhone,
          body: `Reminder: You have an appointment with ${patientName} on ${slotDateLabel} at ${timeLabel}.`,
        });
        result.doctor = { sent: true, response };
        console.log(`[WAPI][MANUAL-REMINDER] Sent to doctor ${doctorPhone}`);
      } catch (err) {
        console.error(`[WAPI][MANUAL-REMINDER] Failed to send to doctor:`, err?.message);
        result.doctor = { sent: false, error: err?.message };
      }
    } else {
      console.warn(`[WAPI][MANUAL-REMINDER] No doctor phone for appointment ${appointmentId}`);
    }

    return { sent: Boolean(result.patient.sent || result.doctor.sent), ...result };
  } catch (error) {
    console.error("[WAPI][MANUAL-REMINDER] Error:", error);
    return { sent: false, error: error.message };
  }
};

/**
 * Auto-reminder scheduler: finds CONFIRMED appointments whose slot is
 * exactly 30 minutes away (±5 min window) and sends a WhatsApp reminder.
 * Called by the background task every 5 minutes.
 * Does NOT affect booking or cancellation flows.
 */
export const processWhapiAutoReminders = async () => {
  try {
    const now = new Date();
    console.log(`[WAPI][AUTO-REMINDER] Job triggered at ${now.toISOString()}`);

    // Fetch all confirmed appointments that haven't had auto reminder sent yet
    const confirmedAppointments = await appointmentModel.find({
      appointmentStatus: APPOINTMENT_STATUS.CONFIRMED,
      $or: [
        { whapi_auto_reminder_sent_patient: { $ne: true } },
        { whapi_auto_reminder_sent_doctor: { $ne: true } },
      ],
    });

    console.log(`[WAPI][AUTO-REMINDER] Checking ${confirmedAppointments.length} appointments`);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const appointment of confirmedAppointments) {
      try {
        const appointmentDateTime = toAppointmentDateTime(appointment);
        if (!appointmentDateTime || Number.isNaN(appointmentDateTime.getTime())) {
          skipped++;
          continue;
        }

        // 30-min reminder window: send if appointment is 25–35 minutes away
        const minutesUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);
        if (minutesUntil < 25 || minutesUntil > 35) {
          skipped++;
          continue;
        }

        console.log(`[WAPI][AUTO-REMINDER] Appointment ${appointment._id} is ${minutesUntil.toFixed(1)} min away – sending reminder`);

        const [patient, doctor] = await Promise.all([
          userModel.findById(appointment.userId),
          doctorModel.findById(appointment.docId),
        ]);

        const timeLabel = formatTimeLabel(appointmentDateTime, appointment.slotTime);
        const patientName = patient?.name || appointment.userData?.name || "Patient";
        const doctorName = doctor?.name || appointment.docData?.name || "Doctor";
        const slotDateLabel = appointment.slotDate;

        // Patient reminder
        const patientPhone = normalizeWhapiPhoneNumber(patient?.phone_number || appointment.userData?.phone_number);
        if (patientPhone && !appointment.whapi_auto_reminder_sent_patient) {
          try {
            await sendWhapiTextMessage({
              to: patientPhone,
              body: `Reminder: Your appointment with Dr. ${doctorName} is in 30 minutes at ${timeLabel} on ${slotDateLabel}. Please be ready.`,
            });
            await appointmentModel.findByIdAndUpdate(appointment._id, { whapi_auto_reminder_sent_patient: true });
            sent++;
            console.log(`[WAPI][AUTO-REMINDER] Patient reminder sent to ${patientPhone}`);
          } catch (err) {
            failed++;
            console.error(`[WAPI][AUTO-REMINDER] Failed patient reminder:`, err?.message);
          }
        }

        // Doctor reminder
        const doctorPhone = normalizeWhapiPhoneNumber(doctor?.phone_number || appointment.docData?.phone_number);
        if (doctorPhone && !appointment.whapi_auto_reminder_sent_doctor) {
          try {
            await sendWhapiTextMessage({
              to: doctorPhone,
              body: `Reminder: Your appointment with ${patientName} is in 30 minutes at ${timeLabel} on ${slotDateLabel}.`,
            });
            await appointmentModel.findByIdAndUpdate(appointment._id, { whapi_auto_reminder_sent_doctor: true });
            sent++;
            console.log(`[WAPI][AUTO-REMINDER] Doctor reminder sent to ${doctorPhone}`);
          } catch (err) {
            failed++;
            console.error(`[WAPI][AUTO-REMINDER] Failed doctor reminder:`, err?.message);
          }
        }
      } catch (err) {
        failed++;
        console.error(`[WAPI][AUTO-REMINDER] Error processing appointment ${appointment._id}:`, err?.message);
      }
    }

    console.log(`[WAPI][AUTO-REMINDER] Done – sent: ${sent}, skipped: ${skipped}, failed: ${failed}`);
    return { sent, skipped, failed };
  } catch (error) {
    console.error("[WAPI][AUTO-REMINDER] Unexpected error:", error);
    throw error;
  }
};
