const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;
const JOIN_BUFFER_MINUTES = 10;

const normalizeDatePart = (value) => String(value).padStart(2, "0");

const parseSlotDate = (slotDate) => {
  if (!slotDate) return null;

  if (String(slotDate).includes("-")) {
    const parsed = new Date(`${slotDate}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parts = String(slotDate).split("_");
  if (parts.length !== 3) return null;
  const [dayRaw, monthRaw, yearRaw] = parts;
  const day = normalizeDatePart(dayRaw);
  const month = normalizeDatePart(monthRaw);
  const isoDate = `${yearRaw}-${month}-${day}T00:00:00`;
  const parsed = new Date(isoDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseSlotTime = (slotTime) => {
  if (!slotTime) return null;
  const timeText = String(slotTime).trim();
  const lower = timeText.toLowerCase();
  const isAm = lower.includes("am");
  const isPm = lower.includes("pm");
  const cleaned = lower.replace("am", "").replace("pm", "").trim();
  const [hourRaw, minuteRaw] = cleaned.split(":");

  let hour = Number.parseInt(hourRaw, 10);
  const minute = Number.parseInt(minuteRaw, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;

  return { hour, minute };
};

export const getAppointmentWindow = (appointment) => {
  const dateOnly = parseSlotDate(appointment?.slotDate);
  const timeOnly = parseSlotTime(appointment?.slotTime);
  if (!dateOnly || !timeOnly) return null;

  const start = new Date(dateOnly);
  start.setHours(timeOnly.hour, timeOnly.minute, 0, 0);
  const end = new Date(start.getTime() + DEFAULT_APPOINTMENT_DURATION_MINUTES * 60 * 1000);
  const joinStart = new Date(start.getTime() - JOIN_BUFFER_MINUTES * 60 * 1000);

  return { start, end, joinStart };
};

export const isJoinAllowedNow = (appointment, now = new Date()) => {
  const window = getAppointmentWindow(appointment);
  if (!window) return false;
  return now >= window.joinStart && now <= window.end;
};

export const computeSessionStatusFromJoinFlags = (appointment, now = new Date()) => {
  const window = getAppointmentWindow(appointment);
  if (!window) return appointment.sessionStatus || "booked";

  const doctorJoined = Boolean(appointment.doctorJoined);
  const patientJoined = Boolean(appointment.patientJoined);
  if (doctorJoined && patientJoined && now <= window.end) {
    return "ongoing";
  }

  if (now > window.end) {
    return doctorJoined && patientJoined ? "completed" : "missed";
  }

  return appointment.sessionStatus || "booked";
};
