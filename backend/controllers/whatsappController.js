import { sendTemplateWhatsAppMessage } from "../services/whatsappService.js";

const required = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const validateBaseFields = (body) => {
  if (!required(body.to)) return "Field `to` is required (E.164 phone number).";
  return null;
};

const handleTemplateSend = async (req, res, templateKey, requiredFields = []) => {
  try {
    const baseError = validateBaseFields(req.body);
    if (baseError) {
      return res.status(400).json({ success: false, message: baseError });
    }

    for (const field of requiredFields) {
      if (!required(req.body[field])) {
        return res.status(400).json({
          success: false,
          message: `Field \`${field}\` is required.`,
        });
      }
    }

    const result = await sendTemplateWhatsAppMessage({
      templateKey,
      to: req.body.to,
      payload: req.body,
    });

    return res.status(201).json({
      success: true,
      message: "WhatsApp message queued successfully.",
      template: templateKey,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send WhatsApp message.",
    });
  }
};

export const sendOtpVerificationMessage = (req, res) =>
  handleTemplateSend(req, res, "otpVerification", ["otpCode"]);

export const sendAppointmentConfirmationMessage = (req, res) =>
  handleTemplateSend(req, res, "appointmentConfirmation", [
    "doctorName",
    "appointmentDate",
    "appointmentTime",
  ]);

export const sendAppointmentReminderMessage = (req, res) =>
  handleTemplateSend(req, res, "appointmentReminder", [
    "doctorName",
    "appointmentDate",
    "appointmentTime",
  ]);

export const sendAppointmentCancellationMessage = (req, res) =>
  handleTemplateSend(req, res, "appointmentCancellation", [
    "doctorName",
    "appointmentDate",
    "appointmentTime",
  ]);

export const sendDoctorCancellationOrUnavailabilityMessage = (req, res) =>
  handleTemplateSend(req, res, "doctorCancellationOrUnavailability", [
    "doctorName",
    "appointmentDate",
    "appointmentTime",
  ]);

export const sendCheckInReminderMessage = (req, res) =>
  handleTemplateSend(req, res, "checkInReminder", [
    "doctorName",
    "appointmentDate",
    "appointmentTime",
    "checkInTime",
  ]);

