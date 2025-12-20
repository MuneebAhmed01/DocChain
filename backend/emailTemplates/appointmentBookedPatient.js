import sendEmail from "../utils/sendEmail.js";

const appointmentBookedPatient = async (appointment) => {
  await sendEmail(
    appointment.patientEmail,
    "Appointment Confirmed",
    `Hello ${appointment.patientName},

Your appointment with Dr. ${appointment.doctorName} on ${appointment.date} at ${appointment.time} has been confirmed.

– Docchain Team`
  );
};

export default appointmentBookedPatient;
