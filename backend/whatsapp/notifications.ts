import { initWhatsAppClient, sendText, toJid } from "./baileysClient.js";

export const DOCTOR_PHONE = "+923155751172";
export const PATIENT_PHONE = "+923338436747";

export type AppointmentNotificationData = {
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  appointmentDateTime: Date;
};

function fmtTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export async function sendAppointmentBooked(data: AppointmentNotificationData): Promise<void> {
  await initWhatsAppClient();

  const doctorJid = toJid(DOCTOR_PHONE);
  const patientJid = toJid(PATIENT_PHONE);

  const doctorMsg = `Your appointment with patient ${data.patientName} has been booked for ${data.date} at ${data.time}.`;
  const patientMsg = `Your appointment with Dr. ${data.doctorName} has been booked for ${data.date} at ${data.time}.`;

  const results = await Promise.allSettled([
    sendText(doctorJid, doctorMsg, "Booking notification to doctor"),
    sendText(patientJid, patientMsg, "Booking notification to patient"),
  ]);

  const rejected = results.filter((r) => r.status === "rejected");
  if (rejected.length) throw new Error("One or more booking notifications failed");
}

export async function sendAppointmentCancelled(data: AppointmentNotificationData): Promise<void> {
  await initWhatsAppClient();

  const doctorJid = toJid(DOCTOR_PHONE);
  const patientJid = toJid(PATIENT_PHONE);

  const doctorMsg = `Your appointment with patient ${data.patientName} on ${data.date} at ${data.time} has been cancelled.`;
  const patientMsg = `Your appointment with Dr. ${data.doctorName} on ${data.date} at ${data.time} has been cancelled.`;

  const results = await Promise.allSettled([
    sendText(doctorJid, doctorMsg, "Cancellation notification to doctor"),
    sendText(patientJid, patientMsg, "Cancellation notification to patient"),
  ]);

  const rejected = results.filter((r) => r.status === "rejected");
  if (rejected.length) throw new Error("One or more cancellation notifications failed");
}

export function scheduleReminder30MinBefore(data: AppointmentNotificationData): NodeJS.Timeout | null {
  const now = Date.now();
  const fireAt = data.appointmentDateTime.getTime() - 30 * 60 * 1000;
  const delayMs = fireAt - now;

  if (delayMs <= 0) {
    console.warn("[WA] reminder not scheduled (already within/past 30 minutes window)", {
      appointmentDateTime: data.appointmentDateTime.toISOString(),
      fireAt: new Date(fireAt).toISOString(),
      delayMs,
    });
    return null;
  }

  console.log("[WA] reminder scheduled", {
    inMs: delayMs,
    fireAt: new Date(fireAt).toISOString(),
    appointmentAt: data.appointmentDateTime.toISOString(),
    appointmentAtLabel: fmtTime(data.appointmentDateTime),
  });

  return setTimeout(async () => {
    try {
      await initWhatsAppClient();
      const doctorJid = toJid(DOCTOR_PHONE);
      const patientJid = toJid(PATIENT_PHONE);

      const doctorMsg = `Reminder: You have an appointment with patient ${data.patientName} in 30 minutes.`;
      const patientMsg = `Reminder: Your appointment with Dr. ${data.doctorName} is in 30 minutes.`;

      const results = await Promise.allSettled([
        sendText(doctorJid, doctorMsg, "Reminder notification to doctor"),
        sendText(patientJid, patientMsg, "Reminder notification to patient"),
      ]);

      const rejected = results.filter((r) => r.status === "rejected");
      if (rejected.length) {
        console.error("[WA] one or more reminder notifications failed", rejected);
      }
    } catch (error) {
      console.error("[WA] reminder job error", error);
    }
  }, delayMs);
}

