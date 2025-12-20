import sendEmail from "../utils/sendEmail.js";

const appointmentCancelledPatient = async (appointment) => {
  await sendEmail(
    appointment.patientEmail,
    "Appointment Cancelled",
    `Hello ${appointment.patientName},

Your appointment with Dr. ${appointment.doctorName} on ${appointment.date} at ${appointment.time} has been cancelled.

– Docchain Team`
  );
};

export default appointmentCancelledPatient;
