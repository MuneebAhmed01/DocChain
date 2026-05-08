import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import userModel from "../models/userModel.js";
import { APPOINTMENT_STATUS } from "../config/payment.js";
import { sendText, toJid } from "../whatsapp/baileysClient.js";

const REMINDER_MINUTES = 30;
const REMINDER_WINDOW_MINUTES = 5;

const normalizePhoneDigits = (phoneNumber) => String(phoneNumber || "").replace(/\D/g, "");

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

  const underscoredDate = slotDate.match(/^(\d{2})_(\d{2})_(\d{4})$/);
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

const getParticipantPhones = async (appointment) => {
  const [patient, doctor] = await Promise.all([
    userModel.findById(appointment.userId),
    doctorModel.findById(appointment.docId),
  ]);

  const patientPhone = normalizePhoneDigits(patient?.phone_number || appointment.userData?.phone_number);
  const doctorPhone = normalizePhoneDigits(doctor?.phone_number || appointment.docData?.phone_number);

  return {
    patient,
    doctor,
    patientPhone,
    doctorPhone,
  };
};

export const sendBaileysAppointmentBookedNotifications = async (appointment) => {
  try {
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    const { patient, doctor, patientPhone, doctorPhone } = await getParticipantPhones(appointment);

    if (!patient || !doctor) {
      throw new Error("Unable to load appointment participants");
    }

    const appointmentDateTime = toAppointmentDateTime(appointment);
    const timeLabel = formatTimeLabel(appointmentDateTime, appointment.slotTime);
    const dateLabel = String(appointment.slotDate || "").trim() || (appointmentDateTime ? appointmentDateTime.toISOString().slice(0, 10) : "");

    const patientName = patient.name || appointment.userData?.name || "Patient";
    const doctorName = doctor.name || appointment.docData?.name || "Doctor";

    const tasks = [];

    if (doctorPhone && !appointment.whapi_booking_sent_doctor) {
      const jid = toJid(doctorPhone);
      const msg = `Your appointment with patient ${patientName} has been booked for ${dateLabel} at ${timeLabel}.`;
      tasks.push(sendText(jid, msg, "Booking notification to doctor"));
    }

    if (patientPhone && !appointment.whapi_booking_sent_patient) {
      const jid = toJid(patientPhone);
      const msg = `Your appointment with Dr. ${doctorName} has been booked for ${dateLabel} at ${timeLabel}.`;
      tasks.push(sendText(jid, msg, "Booking notification to patient"));
    }

    const results = await Promise.allSettled(tasks);
    const anySent = results.some((r) => r.status === "fulfilled");

    const update = {};
    if (doctorPhone) update.whapi_booking_sent_doctor = true;
    if (patientPhone) update.whapi_booking_sent_patient = true;
    if (Object.keys(update).length) {
      await appointmentModel.findByIdAndUpdate(appointment._id, update);
    }

    const rejected = results.filter((r) => r.status === "rejected");
    if (rejected.length) {
      console.error("❌ Baileys booking notification error(s)", rejected);
    }

    return { sent: anySent, rejectedCount: rejected.length };
  } catch (error) {
    console.error("❌ Baileys booking notification error:", error);
    return { sent: false, error: error?.message || String(error) };
  }
};

export const sendBaileysAppointmentCancelledNotifications = async (appointment) => {
  try {
    if (!appointment) throw new Error("Appointment not found");

    const { patient, doctor, patientPhone, doctorPhone } = await getParticipantPhones(appointment);
    if (!patient || !doctor) throw new Error("Unable to load appointment participants");

    const appointmentDateTime = toAppointmentDateTime(appointment);
    const timeLabel = formatTimeLabel(appointmentDateTime, appointment.slotTime);
    const dateLabel = String(appointment.slotDate || "").trim() || (appointmentDateTime ? appointmentDateTime.toISOString().slice(0, 10) : "");

    const patientName = patient.name || appointment.userData?.name || "Patient";
    const doctorName = doctor.name || appointment.docData?.name || "Doctor";

    const tasks = [];
    if (doctorPhone) {
      const jid = toJid(doctorPhone);
      const msg = `Your appointment with patient ${patientName} on ${dateLabel} at ${timeLabel} has been cancelled.`;
      tasks.push(sendText(jid, msg, "Cancellation notification to doctor"));
    }
    if (patientPhone) {
      const jid = toJid(patientPhone);
      const msg = `Your appointment with Dr. ${doctorName} on ${dateLabel} at ${timeLabel} has been cancelled.`;
      tasks.push(sendText(jid, msg, "Cancellation notification to patient"));
    }

    const results = await Promise.allSettled(tasks);
    const rejected = results.filter((r) => r.status === "rejected");
    if (rejected.length) console.error("❌ Baileys cancellation notification error(s)", rejected);
    return { sent: results.some((r) => r.status === "fulfilled"), rejectedCount: rejected.length };
  } catch (error) {
    console.error("❌ Baileys cancellation notification error:", error);
    return { sent: false, error: error?.message || String(error) };
  }
};

export const processBaileysAppointmentRemindersSimple = async () => {
  try {
    console.log("[WA][REMINDER] Reminder job started");
    const now = new Date();

    const confirmedAppointments = await appointmentModel.find({
      appointmentStatus: APPOINTMENT_STATUS.CONFIRMED,
      $or: [
        { whapi_reminder_sent_patient: { $ne: true } },
        { whapi_reminder_sent_doctor: { $ne: true } },
      ],
    });

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const appointment of confirmedAppointments) {
      processed += 1;
      try {
        const appointmentDateTime = toAppointmentDateTime(appointment);
        if (!appointmentDateTime || Number.isNaN(appointmentDateTime.getTime())) {
          skipped += 1;
          continue;
        }

        const minutesUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);
        if (
          minutesUntilAppointment < REMINDER_MINUTES - REMINDER_WINDOW_MINUTES ||
          minutesUntilAppointment > REMINDER_MINUTES + REMINDER_WINDOW_MINUTES
        ) {
          skipped += 1;
          continue;
        }

        const { patient, doctor, patientPhone, doctorPhone } = await getParticipantPhones(appointment);
        const patientName = patient?.name || appointment.userData?.name || "Patient";
        const doctorName = doctor?.name || appointment.docData?.name || "Doctor";

        const tasks = [];

        if (patientPhone && !appointment.whapi_reminder_sent_patient) {
          const jid = toJid(patientPhone);
          const msg = `Reminder: Your appointment with Dr. ${doctorName} is in 30 minutes.`;
          tasks.push(
            sendText(jid, msg, "Reminder notification to patient").then(async () => {
              await appointmentModel.findByIdAndUpdate(appointment._id, { whapi_reminder_sent_patient: true });
            })
          );
        }

        if (doctorPhone && !appointment.whapi_reminder_sent_doctor) {
          const jid = toJid(doctorPhone);
          const msg = `Reminder: You have an appointment with patient ${patientName} in 30 minutes.`;
          tasks.push(
            sendText(jid, msg, "Reminder notification to doctor").then(async () => {
              await appointmentModel.findByIdAndUpdate(appointment._id, { whapi_reminder_sent_doctor: true });
            })
          );
        }

        const results = await Promise.allSettled(tasks);
        sent += results.filter((r) => r.status === "fulfilled").length;
        failed += results.filter((r) => r.status === "rejected").length;
      } catch (e) {
        failed += 1;
        console.error("[WA][REMINDER] Failed for appointment", { appointmentId: String(appointment._id), error: e });
      }
    }

    console.log("[WA][REMINDER] Job completed", { processed, sent, failed, skipped });
    return { processed, sent, failed, skipped };
  } catch (error) {
    console.error("[WA][REMINDER] Unexpected exception in reminder job", error);
    throw error;
  }
};

