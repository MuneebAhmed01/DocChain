import sendEmail from "../utils/sendEmail.js";

const appointmentBookedDoctor = async (appointment) => {
  await sendEmail(
    appointment.doctorEmail,
    "New Appointment Scheduled",
    `Hello Dr. ${appointment.doctorName},

You have a new appointment booked by ${appointment.patientName} on ${appointment.date} at ${appointment.time}.

– Docchain Team`
  );
};

export default appointmentBookedDoctor;
