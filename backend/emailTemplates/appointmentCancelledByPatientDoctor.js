import sendEmail from "../utils/sendEmail.js";

const appointmentCancelledByPatientDoctor = async (appointment) => {
  await sendEmail(
    appointment.doctorEmail,
    "Appointment Cancelled by Patient",
    `Hello Dr. ${appointment.doctorName},

We are extremely sorry to inform you that the appointment with ${appointment.patientName} on ${appointment.date} at ${appointment.time} has been cancelled due to an emergency situation.

– Docchain Team`
  );
};

export default appointmentCancelledByPatientDoctor;
