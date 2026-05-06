import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import WalletService from "./walletService.js";
import PlatformRevenueService from "./platformRevenueService.js";
import {
  fromStripeMinorUnits,
  PAYMENT_CURRENCY,
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_TYPE,
  PLATFORM_FEE,
} from "../config/payment.js";
import { buildAppointmentMeetingLink } from "../utils/meetingLink.js";

const isTransactionUnsupportedError = (error) =>
  error?.code === 20 ||
  /Transaction numbers are only allowed on a replica set member or mongos/i.test(
    error?.message || "",
  );

const runAppointmentUpdate = async (operation) => {
  const session = await appointmentModel.startSession();
  let sessionEnded = false;

  const endSessionSafely = async () => {
    if (sessionEnded) return;
    sessionEnded = true;
    await session.endSession();
  };

  try {
    session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (isTransactionUnsupportedError(error)) {
      try {
        await endSessionSafely();
      } catch (endSessionError) {
        console.warn(
          "Failed to end Mongo session after transaction fallback:",
          endSessionError,
        );
      }
      return operation(null);
    }

    await session.abortTransaction();
    throw error;
  } finally {
    await endSessionSafely();
  }
};

export const finalizeStripeAppointmentPayment = async ({
  appointmentId,
  stripeSession,
  paymentType,
}) => {
  return runAppointmentUpdate(async (session) => {
    const appointmentQuery = appointmentModel.findById(appointmentId);
    const appointment = session
      ? await appointmentQuery.session(session)
      : await appointmentQuery;

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Idempotency guard: already confirmed and credited.
    if (
      appointment.walletCredited &&
      appointment.appointmentStatus === APPOINTMENT_STATUS.CONFIRMED
    ) {
      return appointment;
    }

    if (appointment.appointmentStatus !== APPOINTMENT_STATUS.HOLD) {
      throw new Error("Appointment already confirmed or cancelled");
    }

    const conflictingQuery = appointmentModel.findOne({
      docId: appointment.docId,
      slotDate: appointment.slotDate,
      slotTime: appointment.slotTime,
      appointmentStatus: APPOINTMENT_STATUS.CONFIRMED,
      _id: { $ne: appointmentId },
    });
    const conflictingConfirmed = session
      ? await conflictingQuery.session(session)
      : await conflictingQuery;

    if (conflictingConfirmed) {
      throw new Error("Slot no longer available - another user booked it");
    }

    const paidAmount = fromStripeMinorUnits(
      stripeSession.amount_total,
      PAYMENT_CURRENCY,
    );

    const normalizedPaymentType =
      paymentType === PAYMENT_TYPE.TOKEN ? PAYMENT_TYPE.TOKEN : PAYMENT_TYPE.FULL;

    // Calculate doctor's earnings (total paid minus platform fee)
    const platformFee = PLATFORM_FEE;
    const doctorEarnings = paidAmount - platformFee;

    // Write appointment state first (without directly mutating wallet).
    appointment.appointmentStatus = APPOINTMENT_STATUS.CONFIRMED;
    appointment.status = APPOINTMENT_STATUS.CONFIRMED;
    appointment.confirmationTime = new Date();
    appointment.paymentType = normalizedPaymentType;
    appointment.paymentMethod = PAYMENT_METHOD.STRIPE;
    appointment.paymentIntentId = stripeSession.payment_intent;
    appointment.paidAmount = paidAmount;
    appointment.paymentStatus =
      normalizedPaymentType === PAYMENT_TYPE.TOKEN
        ? PAYMENT_STATUS.PARTIAL
        : PAYMENT_STATUS.PAID;
    appointment.isPaid = normalizedPaymentType === PAYMENT_TYPE.FULL;
    appointment.tokenPaid = normalizedPaymentType === PAYMENT_TYPE.TOKEN;
    appointment.currency = PAYMENT_CURRENCY;
    appointment.sessionStatus = "booked";
    appointment.doctorJoined = Boolean(appointment.doctorJoined);
    appointment.patientJoined = Boolean(appointment.patientJoined);
    if (appointment.appointmentType === "online" && !appointment.meetingLink) {
      appointment.meetingLink = buildAppointmentMeetingLink({
        doctorId: String(appointment.docId),
        appointmentId: String(appointment._id),
      });
    }

    // Record platform fee earnings
    const platformRevenueResult = await PlatformRevenueService.recordPlatformFeeEarned(
      appointmentId,
      session
    );

    if (!platformRevenueResult.success && !platformRevenueResult.isDuplicate) {
      console.error("Failed to record platform fee:", platformRevenueResult.message);
      // Don't fail the transaction for platform fee recording errors
    }

    // Credit doctor wallet only with their earnings (excluding platform fee)
    const walletResult =
      normalizedPaymentType === PAYMENT_TYPE.TOKEN
        ? await WalletService.creditTokenPayment(
            appointmentId,
            String(appointment.docId),
            doctorEarnings,
            session,
          )
        : await WalletService.creditFullPayment(
            appointmentId,
            String(appointment.docId),
            doctorEarnings,
            session,
          );

    if (!walletResult.success && !walletResult.isDuplicate) {
      throw new Error(walletResult.message || "Failed to credit wallet");
    }

    appointment.walletCredited = true;
    appointment.walletCreditedAmount = doctorEarnings;

    await appointment.save(session ? { session } : undefined);

    // Update booked slots (wallet updates no longer happen here).
    const slots_booked = { ...(appointment.docData?.slots_booked || {}) };
    if (!slots_booked[appointment.slotDate]) {
      slots_booked[appointment.slotDate] = [];
    }
    if (!slots_booked[appointment.slotDate].includes(appointment.slotTime)) {
      slots_booked[appointment.slotDate].push(appointment.slotTime);
    }

    await doctorModel.findByIdAndUpdate(
      appointment.docId,
      { slots_booked },
      session ? { session } : undefined,
    );

    return appointment;
  });
};

