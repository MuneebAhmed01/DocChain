import sendEmail from "../utils/sendEmail.js";
import { formatPkrAmount } from "../config/payment.js";

const paymentAccepted = async (appointment) => {
  const platformFee = 100; // Fixed platform fee
  const doctorFee = (appointment.paidAmount ?? appointment.amount) - platformFee;
  
  await sendEmail(
    appointment.patientEmail,
    "Payment Successful",
    `Hello ${appointment.patientName},

Your payment has been successfully received for the appointment with Dr. ${appointment.doctorName} on ${appointment.date} at ${appointment.time}.

Payment Breakdown:
• Consultation Fee: ${formatPkrAmount(doctorFee)}
• Platform Fee (Non-Refundable): ${formatPkrAmount(platformFee)}
• Total Paid: ${formatPkrAmount(appointment.paidAmount ?? appointment.amount)}

Thank you for choosing our platform!

– Docchain Team`
  );
};

export default paymentAccepted;
