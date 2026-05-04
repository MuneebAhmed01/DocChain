import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import { sendTemplateWhatsAppMessage } from "./whatsappService.js";
import { APPOINTMENT_STATUS } from "../config/payment.js";

/**
 * Send WhatsApp reminder for upcoming appointment
 * Called 1 hour before appointment
 */
export const sendAppointmentReminder = async (appointment) => {
  try {
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Check if user has opted in for WhatsApp reminders
    const user = await userModel.findById(appointment.userId);
    if (!user || !user.whatsapp_opt_in || !user.phone_number) {
      console.log(
        `⚠️ User ${appointment.userId} not eligible for WhatsApp reminder`
      );
      return { sent: false, reason: "User not opted in or no phone number" };
    }

    // Get doctor details
    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor) {
      throw new Error("Doctor not found");
    }

    // Format appointment details
    const appointmentDate = appointment.slotDate;
    const appointmentTime = appointment.slotTime;
    const doctorName = doctor.name;
    const patientName = user.name;

    // Send WhatsApp reminder
    const result = await sendTemplateWhatsAppMessage({
      templateKey: "appointmentReminder",
      to: user.phone_number,
      payload: {
        patientName,
        doctorName,
        appointmentDate,
        appointmentTime,
      },
    });

    console.log(
      `✅ WhatsApp reminder sent to ${user.phone_number} for appointment on ${appointmentDate}`
    );

    return { sent: true, result };
  } catch (error) {
    console.error("❌ Error sending appointment reminder:", error);
    return { sent: false, error: error.message };
  }
};

/**
 * Send appointment confirmation WhatsApp
 * Called after appointment is confirmed
 */
export const sendAppointmentConfirmation = async (appointment) => {
  try {
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    const user = await userModel.findById(appointment.userId);
    if (!user || !user.phone_number) {
      console.log(`⚠️ No phone number for user ${appointment.userId}`);
      return { sent: false, reason: "No phone number" };
    }

    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor) {
      throw new Error("Doctor not found");
    }

    const result = await sendTemplateWhatsAppMessage({
      templateKey: "appointmentConfirmation",
      to: user.phone_number,
      payload: {
        patientName: user.name,
        doctorName: doctor.name,
        appointmentDate: appointment.slotDate,
        appointmentTime: appointment.slotTime,
      },
    });

    console.log(
      `✅ WhatsApp confirmation sent to ${user.phone_number}`
    );

    return { sent: true, result };
  } catch (error) {
    console.error("❌ Error sending appointment confirmation:", error);
    return { sent: false, error: error.message };
  }
};

/**
 * Send appointment cancellation WhatsApp
 * Called when appointment is cancelled
 */
export const sendAppointmentCancellation = async (appointment) => {
  try {
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    const user = await userModel.findById(appointment.userId);
    if (!user || !user.phone_number) {
      console.log(`⚠️ No phone number for user ${appointment.userId}`);
      return { sent: false, reason: "No phone number" };
    }

    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor) {
      throw new Error("Doctor not found");
    }

    const result = await sendTemplateWhatsAppMessage({
      templateKey: "appointmentCancellation",
      to: user.phone_number,
      payload: {
        patientName: user.name,
        doctorName: doctor.name,
        appointmentDate: appointment.slotDate,
        appointmentTime: appointment.slotTime,
      },
    });

    console.log(
      `✅ WhatsApp cancellation sent to ${user.phone_number}`
    );

    return { sent: true, result };
  } catch (error) {
    console.error("❌ Error sending appointment cancellation:", error);
    return { sent: false, error: error.message };
  }
};

/**
 * Fetch and send reminders for appointments scheduled for 1 hour from now
 * This should be called every 5-10 minutes by a background task
 */
export const processAppointmentReminders = async () => {
  try {
    console.log("🔄 Processing appointment reminders...");

    // Calculate time window: 55-65 minutes from now
    const now = new Date();
    const fiftyFiveMinutesLater = new Date(now.getTime() + 55 * 60 * 1000);
    const sixtyFiveMinutesLater = new Date(now.getTime() + 65 * 60 * 1000);

    // Find CONFIRMED appointments in the time window
    const upcomingAppointments = await appointmentModel.find({
      appointmentStatus: APPOINTMENT_STATUS.CONFIRMED,
      slotDate: new Date().toLocaleDateString(),
      slotTime: {
        $gte: fiftyFiveMinutesLater.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        $lte: sixtyFiveMinutesLater.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      },
      reminder_sent: { $ne: true },
    });

    if (upcomingAppointments.length === 0) {
      console.log("✅ No appointments to remind");
      return { processed: 0, sent: 0, failed: 0 };
    }

    console.log(`📧 Found ${upcomingAppointments.length} appointments to remind`);

    let sent = 0;
    let failed = 0;

    for (const appointment of upcomingAppointments) {
      const result = await sendAppointmentReminder(appointment);
      
      if (result.sent) {
        sent++;
        // Mark reminder as sent
        await appointmentModel.findByIdAndUpdate(
          appointment._id,
          { reminder_sent: true }
        );
      } else {
        failed++;
      }
    }

    console.log(
      `✅ Reminder processing complete: ${sent} sent, ${failed} failed`
    );

    return { processed: upcomingAppointments.length, sent, failed };
  } catch (error) {
    console.error("❌ Error processing appointment reminders:", error);
    throw error;
  }
};

/**
 * Alternative simpler implementation using direct time comparison
 * For appointments where slotDate and slotTime are stored as strings
 */
export const processAppointmentRemindersSimple = async () => {
  try {
    console.log("🔄 Processing appointment reminders (Simple)...");

    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD format

    // Find CONFIRMED appointments for today
    const todaysAppointments = await appointmentModel.find({
      appointmentStatus: APPOINTMENT_STATUS.CONFIRMED,
      slotDate: today,
      reminder_sent: { $ne: true },
    });

    if (todaysAppointments.length === 0) {
      console.log("✅ No appointments found for today");
      return { processed: 0, sent: 0, failed: 0 };
    }

    console.log(`📧 Found ${todaysAppointments.length} appointments for today`);

    let sent = 0;
    let failed = 0;

    for (const appointment of todaysAppointments) {
      try {
        // Parse appointment time
        const [apptHour, apptMinute] = appointment.slotTime
          .split(":")
          .map((x) => parseInt(x));

        // Create appointment datetime
        const apptDate = new Date(today);
        apptDate.setHours(apptHour, apptMinute, 0, 0);

        // Calculate time difference
        const timeDiff = apptDate.getTime() - now.getTime();
        const minutesUntilAppt = timeDiff / (1000 * 60);

        // Send reminder if within 55-65 minute window
        if (minutesUntilAppt >= 55 && minutesUntilAppt <= 65) {
          const result = await sendAppointmentReminder(appointment);

          if (result.sent) {
            sent++;
            // Mark reminder as sent
            await appointmentModel.findByIdAndUpdate(
              appointment._id,
              { reminder_sent: true }
            );
          } else {
            failed++;
          }
        }
      } catch (apptError) {
        console.error(`❌ Error processing appointment ${appointment._id}:`, apptError);
        failed++;
      }
    }

    console.log(
      `✅ Reminder processing complete: ${sent} sent, ${failed} failed`
    );

    return { processed: todaysAppointments.length, sent, failed };
  } catch (error) {
    console.error("❌ Error in simple reminder processing:", error);
    throw error;
  }
};
