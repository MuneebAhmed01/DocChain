import twilio from "twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM =
  process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

const TEMPLATE_DEFINITIONS = {
  otpVerification: {
    contentSidEnv: "TWILIO_CONTENT_SID_OTP_VERIFICATION",
    buildBody: ({ patientName, otpCode, expiryMinutes = 10 }) =>
      `Hi ${patientName || "there"}, your DocChain verification code is ${otpCode}. This code expires in ${expiryMinutes} minutes.`,
    buildVariables: ({ otpCode, expiryMinutes = 10 }) => ({
      1: String(otpCode),
      2: `${expiryMinutes} minutes`,
    }),
  },
  appointmentConfirmation: {
    contentSidEnv: "TWILIO_CONTENT_SID_APPOINTMENT_CONFIRMATION",
    buildBody: ({ patientName, doctorName, appointmentDate, appointmentTime }) =>
      `Hi ${patientName || "there"}, your appointment with Dr. ${doctorName} is confirmed for ${appointmentDate} at ${appointmentTime}.`,
    buildVariables: ({ appointmentDate, appointmentTime, doctorName }) => ({
      1: appointmentDate,
      2: appointmentTime,
      3: doctorName,
    }),
  },
  appointmentConfirmationDoctor: {
    contentSidEnv: "TWILIO_CONTENT_SID_APPOINTMENT_CONFIRMATION_DOCTOR",
    buildBody: ({ doctorName, patientName, appointmentDate, appointmentTime }) =>
      `Hi Dr. ${doctorName || "there"}, you have a new confirmed appointment with ${patientName || "a patient"} on ${appointmentDate} at ${appointmentTime}.`,
    buildVariables: ({ appointmentDate, appointmentTime, patientName }) => ({
      1: appointmentDate,
      2: appointmentTime,
      3: patientName || "Patient",
    }),
  },
  appointmentReminder: {
    contentSidEnv: "TWILIO_CONTENT_SID_APPOINTMENT_REMINDER",
    buildBody: ({ patientName, doctorName, appointmentDate, appointmentTime }) =>
      `Reminder for ${patientName || "you"}: your appointment with Dr. ${doctorName} is on ${appointmentDate} at ${appointmentTime}.`,
    buildVariables: ({ appointmentDate, appointmentTime, doctorName }) => ({
      1: appointmentDate,
      2: appointmentTime,
      3: doctorName,
    }),
  },
  appointmentReminderDoctor: {
    contentSidEnv: "TWILIO_CONTENT_SID_APPOINTMENT_REMINDER_DOCTOR",
    buildBody: ({ doctorName, patientName, appointmentDate, appointmentTime }) =>
      `Reminder Dr. ${doctorName || ""}: you have an appointment with ${patientName || "a patient"} on ${appointmentDate} at ${appointmentTime}.`,
    buildVariables: ({ appointmentDate, appointmentTime, patientName }) => ({
      1: appointmentDate,
      2: appointmentTime,
      3: patientName || "Patient",
    }),
  },
  appointmentCancellation: {
    contentSidEnv: "TWILIO_CONTENT_SID_APPOINTMENT_CANCELLATION",
    buildBody: ({ patientName, doctorName, appointmentDate, appointmentTime }) =>
      `Hi ${patientName || "there"}, your appointment with Dr. ${doctorName} on ${appointmentDate} at ${appointmentTime} has been cancelled.`,
    buildVariables: ({ appointmentDate, appointmentTime, doctorName }) => ({
      1: appointmentDate,
      2: appointmentTime,
      3: doctorName,
    }),
  },
  appointmentCancelledByPatientDoctor: {
    contentSidEnv: "TWILIO_CONTENT_SID_APPOINTMENT_CANCELLED_BY_PATIENT_DOCTOR",
    buildBody: ({ doctorName, patientName, appointmentDate, appointmentTime }) =>
      `Hi Dr. ${doctorName || "there"}, ${patientName || "a patient"} cancelled the appointment on ${appointmentDate} at ${appointmentTime}.`,
    buildVariables: ({ appointmentDate, appointmentTime, patientName }) => ({
      1: appointmentDate,
      2: appointmentTime,
      3: patientName || "Patient",
    }),
  },
  doctorCancellationOrUnavailability: {
    contentSidEnv: "TWILIO_CONTENT_SID_DOCTOR_CANCELLATION",
    buildBody: ({ patientName, doctorName, appointmentDate, appointmentTime, reason }) =>
      `Hi ${patientName || "there"}, Dr. ${doctorName} is unavailable for your appointment on ${appointmentDate} at ${appointmentTime}.${reason ? ` Reason: ${reason}` : ""} Please reschedule.`,
    buildVariables: ({ appointmentDate, appointmentTime, doctorName, reason }) => ({
      1: appointmentDate,
      2: appointmentTime,
      3: doctorName,
      4: reason || "Doctor unavailable",
    }),
  },
  doctorCancellationDoctorCopy: {
    contentSidEnv: "TWILIO_CONTENT_SID_DOCTOR_CANCELLATION_DOCTOR_COPY",
    buildBody: ({ doctorName, patientName, appointmentDate, appointmentTime, reason }) =>
      `Hi Dr. ${doctorName || "there"}, you cancelled the appointment with ${patientName || "a patient"} on ${appointmentDate} at ${appointmentTime}.${reason ? ` Reason: ${reason}` : ""}`,
    buildVariables: ({ appointmentDate, appointmentTime, patientName, reason }) => ({
      1: appointmentDate,
      2: appointmentTime,
      3: patientName || "Patient",
      4: reason || "Cancelled",
    }),
  },
  checkInReminder: {
    contentSidEnv: "TWILIO_CONTENT_SID_CHECKIN_REMINDER",
    buildBody: ({ patientName, doctorName, appointmentDate, appointmentTime, checkInTime }) =>
      `Hi ${patientName || "there"}, please check in by ${checkInTime}. Your appointment with Dr. ${doctorName} is on ${appointmentDate} at ${appointmentTime}.`,
    buildVariables: ({ appointmentDate, appointmentTime, checkInTime, doctorName }) => ({
      1: appointmentDate,
      2: appointmentTime,
      3: checkInTime,
      4: doctorName,
    }),
  },
  checkInReminderDoctor: {
    contentSidEnv: "TWILIO_CONTENT_SID_CHECKIN_REMINDER_DOCTOR",
    buildBody: ({ doctorName, patientName, appointmentDate, appointmentTime }) =>
      `Hi Dr. ${doctorName || "there"}, your appointment with ${patientName || "a patient"} starts at ${appointmentTime} on ${appointmentDate}.`,
    buildVariables: ({ appointmentDate, appointmentTime, patientName }) => ({
      1: appointmentDate,
      2: appointmentTime,
      3: patientName || "Patient",
    }),
  },
};

const formatToWhatsAppAddress = (phoneNumber) => {
  const normalized = String(phoneNumber || "").trim();
  if (!normalized) return "";
  return normalized.startsWith("whatsapp:")
    ? normalized
    : `whatsapp:${normalized}`;
};

const getTwilioClient = () => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error(
      "Twilio credentials missing. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
    );
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

export const sendTemplateWhatsAppMessage = async ({
  templateKey,
  to,
  payload,
}) => {
  const template = TEMPLATE_DEFINITIONS[templateKey];
  if (!template) {
    throw new Error(`Unknown template: ${templateKey}`);
  }

  if (!TWILIO_WHATSAPP_FROM) {
    throw new Error("Missing TWILIO_WHATSAPP_FROM in environment.");
  }

  const toAddress = formatToWhatsAppAddress(to);
  if (!toAddress) {
    throw new Error("Recipient phone number is required.");
  }

  const contentSid = process.env[template.contentSidEnv];
  const client = getTwilioClient();

  const requestBody = {
    from: formatToWhatsAppAddress(TWILIO_WHATSAPP_FROM),
    to: toAddress,
  };

  if (contentSid) {
    requestBody.contentSid = contentSid;
    requestBody.contentVariables = JSON.stringify(template.buildVariables(payload));
  } else {
    requestBody.body = template.buildBody(payload);
  }

  const message = await client.messages.create(requestBody);

  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
    from: message.from,
    dateCreated: message.dateCreated,
  };
};

