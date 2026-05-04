import express from "express";
import {
  sendOtpVerificationMessage,
  sendAppointmentConfirmationMessage,
  sendAppointmentReminderMessage,
  sendAppointmentCancellationMessage,
  sendDoctorCancellationOrUnavailabilityMessage,
  sendCheckInReminderMessage,
} from "../controllers/whatsappController.js";

const whatsappRouter = express.Router();

// Mount this router later (example): app.use("/api/whatsapp", whatsappRouter)
whatsappRouter.post("/otp-verification", sendOtpVerificationMessage);
whatsappRouter.post(
  "/appointment-confirmation",
  sendAppointmentConfirmationMessage
);
whatsappRouter.post("/appointment-reminder", sendAppointmentReminderMessage);
whatsappRouter.post(
  "/appointment-cancellation",
  sendAppointmentCancellationMessage
);
whatsappRouter.post(
  "/doctor-cancellation-or-unavailability",
  sendDoctorCancellationOrUnavailabilityMessage
);
whatsappRouter.post("/check-in-reminder", sendCheckInReminderMessage);

export default whatsappRouter;

