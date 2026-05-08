import { sendAppointmentBooked, sendAppointmentCancelled, scheduleReminder30MinBefore } from "../whatsapp/notifications.js";
import { initWhatsAppClient } from "../whatsapp/baileysClient.js";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateYYYYMMDD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTimeLabel(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

async function main() {
  console.log("[WA][TEST] Starting Baileys WhatsApp test script");
  console.log("[WA][TEST] You may need to scan QR code in terminal (first run)");

  await initWhatsAppClient();
  // Give WhatsApp/Baileys a moment to finish initial sync after pairing.
  await new Promise((r) => setTimeout(r, 6000));

  // Booked + Cancelled send immediately.
  const appointmentDateTime = new Date(Date.now() + 31 * 60 * 1000); // 31 minutes ahead => reminder fires in ~1 minute
  const data = {
    patientName: "Test Patient",
    doctorName: "Test Doctor",
    appointmentDateTime,
    date: formatDateYYYYMMDD(appointmentDateTime),
    time: formatTimeLabel(appointmentDateTime),
  };

  console.log("[WA][TEST] Dummy appointment prepared", {
    date: data.date,
    time: data.time,
    appointmentDateTime: data.appointmentDateTime.toISOString(),
  });

  console.log("[WA][TEST] Trigger 1: Appointment Booked");
  await sendAppointmentBooked(data);

  console.log("[WA][TEST] Trigger 2: Appointment Cancelled");
  await sendAppointmentCancelled(data);

  console.log("[WA][TEST] Trigger 3: Reminder (30 min before appointment)");
  const t = scheduleReminder30MinBefore(data);
  if (!t) {
    console.warn("[WA][TEST] Reminder not scheduled (appointment too soon or in past)");
  } else {
    console.log("[WA][TEST] Waiting for reminder to fire (~1 minute)...");
  }
}

main().catch((error) => {
  console.error("[WA][TEST] Script failed", error);
  process.exitCode = 1;
});

