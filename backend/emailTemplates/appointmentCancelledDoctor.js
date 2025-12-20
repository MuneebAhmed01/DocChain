import sendEmail from "../utils/sendEmail.js";

const appointmentCancelledDoctor = async (appointment) => {
  await sendEmail(
    appointment.doctorEmail,
    "Appointment Cancelled",
    `Hello Dr. ${appointment.doctorName},

The appointment with ${appointment.patientName} on ${appointment.date} at ${appointment.time} has been cancelled.

– Docchain Team`
  );
};

export default appointmentCancelledDoctor;
