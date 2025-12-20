import sendEmail from "../utils/sendEmail.js";

const appointmentCompletedPatient = async (appointment) => {
  await sendEmail(
    appointment.patientEmail,
    "Appointment Completed",
    `Hello ${appointment.patientName},

Your appointment with Dr. ${appointment.doctorName} on ${appointment.date} at ${appointment.time} has been marked as completed.

We hope your experience was great! You can provide feedback if you like.

– Docchain Team`
  );
};

export default appointmentCompletedPatient;
