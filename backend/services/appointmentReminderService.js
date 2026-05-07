import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import { sendTemplateWhatsAppMessage } from "./whatsappService.js";
import { APPOINTMENT_STATUS } from "../config/payment.js";

const isTruthy = (v) => Boolean(v) && String(v).trim() !== "";

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

export const sendAppointmentReminderToDoctor = async (appointment) => {
  try {
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor) {
      throw new Error("Doctor not found");
    }

    if (!doctor.whatsapp_opt_in || !doctor.phone_number) {
      console.log(`⚠️ Doctor ${appointment.docId} not eligible for WhatsApp reminder`);
      return { sent: false, reason: "Doctor not opted in or no phone number" };
    }

    const user = await userModel.findById(appointment.userId);
    const patientName = user?.name || appointment.userData?.name || "Patient";

    const result = await sendTemplateWhatsAppMessage({
      templateKey: "appointmentReminderDoctor",
      to: doctor.phone_number,
      payload: {
        doctorName: doctor.name,
        patientName,
        appointmentDate: appointment.slotDate,
        appointmentTime: appointment.slotTime,
      },
    });

    console.log(`✅ WhatsApp reminder sent to doctor ${doctor.phone_number}`);
    return { sent: true, result };
  } catch (error) {
    console.error("❌ Error sending doctor appointment reminder:", error);
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

export const sendAppointmentConfirmationToDoctor = async (appointment) => {
  try {
    if (!appointment) throw new Error("Appointment not found");

    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor) throw new Error("Doctor not found");

    if (!doctor.phone_number) {
      console.log(`⚠️ No phone number for doctor ${appointment.docId}`);
      return { sent: false, reason: "No phone number" };
    }

    const user = await userModel.findById(appointment.userId);

    const result = await sendTemplateWhatsAppMessage({
      templateKey: "appointmentConfirmationDoctor",
      to: doctor.phone_number,
      payload: {
        doctorName: doctor.name,
        patientName: user?.name || appointment.userData?.name || "Patient",
        appointmentDate: appointment.slotDate,
        appointmentTime: appointment.slotTime,
      },
    });

    console.log(`✅ WhatsApp confirmation sent to doctor ${doctor.phone_number}`);
    return { sent: true, result };
  } catch (error) {
    console.error("❌ Error sending appointment confirmation to doctor:", error);
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

export const sendAppointmentCancellationToDoctorFromPatient = async (appointment) => {
  try {
    if (!appointment) throw new Error("Appointment not found");

    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor) throw new Error("Doctor not found");

    if (!doctor.phone_number) {
      console.log(`⚠️ No phone number for doctor ${appointment.docId}`);
      return { sent: false, reason: "No phone number" };
    }

    const user = await userModel.findById(appointment.userId);

    const result = await sendTemplateWhatsAppMessage({
      templateKey: "appointmentCancelledByPatientDoctor",
      to: doctor.phone_number,
      payload: {
        doctorName: doctor.name,
        patientName: user?.name || appointment.userData?.name || "Patient",
        appointmentDate: appointment.slotDate,
        appointmentTime: appointment.slotTime,
      },
    });

    console.log(`✅ WhatsApp patient-cancel notice sent to doctor ${doctor.phone_number}`);
    return { sent: true, result };
  } catch (error) {
    console.error("❌ Error sending patient-cancel notice to doctor:", error);
    return { sent: false, error: error.message };
  }
};

export const sendDoctorCancellationOrUnavailabilityToPatient = async (appointment, reason) => {
  try {
    if (!appointment) throw new Error("Appointment not found");

    const user = await userModel.findById(appointment.userId);
    if (!user || !user.phone_number) {
      return { sent: false, reason: "No patient phone number" };
    }

    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor) throw new Error("Doctor not found");

    const result = await sendTemplateWhatsAppMessage({
      templateKey: "doctorCancellationOrUnavailability",
      to: user.phone_number,
      payload: {
        patientName: user.name,
        doctorName: doctor.name,
        appointmentDate: appointment.slotDate,
        appointmentTime: appointment.slotTime,
        reason,
      },
    });

    return { sent: true, result };
  } catch (error) {
    console.error("❌ Error sending doctor cancellation/unavailability to patient:", error);
    return { sent: false, error: error.message };
  }
};

export const sendDoctorCancellationCopyToDoctor = async (appointment, reason) => {
  try {
    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor || !doctor.phone_number) return { sent: false, reason: "Doctor not eligible" };

    const user = await userModel.findById(appointment.userId);

    const result = await sendTemplateWhatsAppMessage({
      templateKey: "doctorCancellationDoctorCopy",
      to: doctor.phone_number,
      payload: {
        doctorName: doctor.name,
        patientName: user?.name || appointment.userData?.name || "Patient",
        appointmentDate: appointment.slotDate,
        appointmentTime: appointment.slotTime,
        reason,
      },
    });

    return { sent: true, result };
  } catch (error) {
    console.error("❌ Error sending doctor cancellation copy:", error);
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
        if (!isTruthy(appointment.slotTime)) continue;

        // Parse appointment time (supports both "HH:mm" and locale strings if present)
        const timeParts = String(appointment.slotTime).split(":");
        const apptHour = parseInt(timeParts[0], 10);
        const apptMinute = parseInt(timeParts[1], 10);
        if (Number.isNaN(apptHour) || Number.isNaN(apptMinute)) continue;

        // Create appointment datetime
        const apptDate = new Date(today);
        apptDate.setHours(apptHour, apptMinute, 0, 0);

        // Calculate time difference
        const timeDiff = apptDate.getTime() - now.getTime();
        const minutesUntilAppt = timeDiff / (1000 * 60);

        // Send reminder if within 55-65 minute window
        if (minutesUntilAppt >= 55 && minutesUntilAppt <= 65) {
          // Patient reminder (legacy flag reminder_sent)
          if (!appointment.reminder_sent) {
            const result = await sendAppointmentReminder(appointment);

            if (result.sent) {
              sent++;
              await appointmentModel.findByIdAndUpdate(appointment._id, {
                reminder_sent: true,
              });
            } else {
              failed++;
            }
          }

          // Doctor reminder
          if (!appointment.reminder_sent_doctor) {
            const docResult = await sendAppointmentReminderToDoctor(appointment);
            if (docResult.sent) {
              sent++;
              await appointmentModel.findByIdAndUpdate(appointment._id, {
                reminder_sent_doctor: true,
              });
            } else {
              failed++;
            }
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

/**
 * Check-in reminder (30-60 minutes before)
 * Called every 5 minutes by a background task.
 */
export const processCheckInRemindersSimple = async () => {
  try {
    console.log("🔄 Processing check-in reminders (Simple)...");
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const todaysAppointments = await appointmentModel.find({
      appointmentStatus: APPOINTMENT_STATUS.CONFIRMED,
      slotDate: today,
    });

    let sent = 0;
    let failed = 0;

    for (const appointment of todaysAppointments) {
      try {
        if (!isTruthy(appointment.slotTime)) continue;

        const timeParts = String(appointment.slotTime).split(":");
        const apptHour = parseInt(timeParts[0], 10);
        const apptMinute = parseInt(timeParts[1], 10);
        if (Number.isNaN(apptHour) || Number.isNaN(apptMinute)) continue;

        const apptDate = new Date(today);
        apptDate.setHours(apptHour, apptMinute, 0, 0);

        const minutesUntilAppt = (apptDate.getTime() - now.getTime()) / (1000 * 60);

        // 30-60 minute window
        if (minutesUntilAppt < 30 || minutesUntilAppt > 60) continue;

        const checkInTime = new Date(apptDate.getTime() - 15 * 60 * 1000);
        const checkInTimeLabel = checkInTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        // Patient check-in reminder
        if (!appointment.checkin_sent_patient) {
          const user = await userModel.findById(appointment.userId);
          const doctor = await doctorModel.findById(appointment.docId);
          if (user?.phone_number && doctor) {
            const r = await sendTemplateWhatsAppMessage({
              templateKey: "checkInReminder",
              to: user.phone_number,
              payload: {
                patientName: user.name,
                doctorName: doctor.name,
                appointmentDate: appointment.slotDate,
                appointmentTime: appointment.slotTime,
                checkInTime: checkInTimeLabel,
              },
            });
            if (r?.sid) {
              sent++;
              await appointmentModel.findByIdAndUpdate(appointment._id, {
                checkin_sent_patient: true,
              });
            }
          }
        }

        // Doctor heads-up (optional)
        if (!appointment.checkin_sent_doctor) {
          const doctor = await doctorModel.findById(appointment.docId);
          if (doctor?.phone_number) {
            const user = await userModel.findById(appointment.userId);
            const r = await sendTemplateWhatsAppMessage({
              templateKey: "checkInReminderDoctor",
              to: doctor.phone_number,
              payload: {
                doctorName: doctor.name,
                patientName: user?.name || appointment.userData?.name || "Patient",
                appointmentDate: appointment.slotDate,
                appointmentTime: appointment.slotTime,
              },
            });
            if (r?.sid) {
              sent++;
              await appointmentModel.findByIdAndUpdate(appointment._id, {
                checkin_sent_doctor: true,
              });
            }
          }
        }
      } catch (e) {
        failed++;
      }
    }

    console.log(`✅ Check-in processing complete: ${sent} sent, ${failed} failed`);
    return { processed: todaysAppointments.length, sent, failed };
  } catch (error) {
    console.error("❌ Error in check-in processing:", error);
    throw error;
  }
};
