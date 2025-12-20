import sendEmail from "../utils/sendEmail.js";

const appointmentReminder = async (appointment) => {
  await sendEmail(
    appointment.patientEmail,
    "Appointment Reminder",
    `Hello ${appointment.patientName},

This is a reminder for your appointment with Dr. ${appointment.doctorName} on ${appointment.date} at ${appointment.time}.

Please be on time.

– Docchain Team`
  );
};

export default appointmentReminder;
