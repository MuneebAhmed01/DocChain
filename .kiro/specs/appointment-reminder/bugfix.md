# Bugfix Requirements Document

## Introduction

DocChain currently has a WhatsApp reminder infrastructure (via Whapi) that runs on a background scheduler every 5 minutes and sends reminders 30 minutes before a confirmed appointment. However, there is no way to manually trigger a reminder on demand — for demo, showcase, or urgent re-notification purposes — without waiting for the scheduler window. Additionally, the auto-reminder scheduler lacks a dedicated tracking flag (`whapi_auto_reminder_sent_patient` / `whapi_auto_reminder_sent_doctor`) in the appointment model, meaning the `processWhapiAutoReminders` function queries fields that do not exist in the schema, silently skipping all appointments.

This spec adds:
1. A **manual "Trigger Reminder" button** on the appointment card in the Doctor panel frontend, which calls a new backend endpoint to send a WhatsApp reminder immediately for a specific appointment.
2. The **auto-reminder tracking fields** (`whapi_auto_reminder_sent_patient`, `whapi_auto_reminder_sent_doctor`) to the appointment model so the existing 30-minute scheduler works correctly.

All changes are strictly additive. The existing appointment booking flow, cancellation flow, payment flow, and all other notification paths are left completely untouched.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a doctor views an active (non-cancelled, non-completed) appointment card in the Doctor Appointments panel THEN the system does not provide any button or control to manually send a WhatsApp reminder to the patient and doctor for that appointment.

1.2 WHEN the background auto-reminder scheduler (`processWhapiAutoReminders`) runs and finds a CONFIRMED appointment that is 25–35 minutes away THEN the system queries `whapi_auto_reminder_sent_patient` and `whapi_auto_reminder_sent_doctor` fields that are absent from the appointment schema, causing all appointments to match the `$ne: true` filter every run and potentially re-sending reminders on every scheduler tick instead of exactly once.

1.3 WHEN a user or demo operator wants to demonstrate the WhatsApp reminder feature without waiting for the 30-minute scheduler window THEN the system provides no mechanism to trigger a reminder immediately for a chosen appointment.

### Expected Behavior (Correct)

2.1 WHEN a doctor views an active (non-cancelled, non-completed) appointment card in the Doctor Appointments panel THEN the system SHALL display a "Trigger Reminder" button on that card that, when clicked, sends a WhatsApp reminder message to both the patient and the doctor for that appointment via the existing Whapi messaging service.

2.2 WHEN the background auto-reminder scheduler (`processWhapiAutoReminders`) runs and finds a CONFIRMED appointment that is 25–35 minutes away THEN the system SHALL read and write the `whapi_auto_reminder_sent_patient` and `whapi_auto_reminder_sent_doctor` fields (which SHALL exist in the appointment schema) so that each auto-reminder is sent exactly once per appointment and not repeated on subsequent scheduler ticks.

2.3 WHEN a user or demo operator clicks the "Trigger Reminder" button on an appointment card THEN the system SHALL immediately invoke the `POST /api/doctor/appointments/:id/trigger-reminder` endpoint (authenticated with the doctor token), which SHALL call `sendWhapiReminderForAppointment` and return a success or failure response without modifying the appointment's booking status, cancellation status, payment status, or any other existing appointment fields.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a patient books a new appointment through the existing booking flow THEN the system SHALL CONTINUE TO create the appointment record, process payment, and send the booking confirmation WhatsApp notification exactly as before, with no interference from the reminder feature.

3.2 WHEN a doctor or patient cancels an appointment through the existing cancellation flow THEN the system SHALL CONTINUE TO mark the appointment as cancelled, process any applicable refund, and send the cancellation WhatsApp notification exactly as before.

3.3 WHEN the background scheduler runs `processWhapiAppointmentRemindersSimple` (the existing 30-minute Whapi reminder job) THEN the system SHALL CONTINUE TO evaluate appointments using the existing `whapi_reminder_sent_patient` and `whapi_reminder_sent_doctor` flags without any change to that function's logic or timing.

3.4 WHEN the background scheduler runs `cleanupExpiredHolds` or `finalizeExpiredOnlineSessions` THEN the system SHALL CONTINUE TO execute those tasks on their existing 5-minute interval without any change.

3.5 WHEN a doctor completes an appointment using the tick/complete button on the appointment card THEN the system SHALL CONTINUE TO mark the appointment as completed exactly as before; the new "Trigger Reminder" button SHALL NOT appear on completed or cancelled appointment cards.

3.6 WHEN the existing `POST /api/whatsapp/appointment-reminder` endpoint is called THEN the system SHALL CONTINUE TO handle that request through the existing `whatsappController` and `whatsappService` (Twilio) path, completely independently of the new doctor-triggered reminder endpoint.

3.7 WHEN the appointment model is saved after adding the two new tracking fields THEN the system SHALL CONTINUE TO enforce all existing schema validations, indexes (including the `unique_confirmed_slot` partial index), and the `syncLegacyFields` pre-save hook without modification.
