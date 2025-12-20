import sendEmail from "../utils/sendEmail.js";

const paymentAccepted = async (appointment) => {
  await sendEmail(
    appointment.patientEmail,
    "Payment Successful",
    `Hello ${appointment.patientName},

Your payment of $${appointment.amount} for the appointment with Dr. ${appointment.doctorName} on ${appointment.date} at ${appointment.time} has been successfully received.

– Docchain Team`
  );
};

export default paymentAccepted;
