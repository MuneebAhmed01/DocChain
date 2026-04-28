import express from "express";
import Stripe from "stripe";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import onlineConsultSessionModel from "../models/onlineConsultSessionModel.js";
import authUser from "../middlewares/authUser.js";
import { v4 as uuidv4 } from "uuid";
import userModel from "../models/userModel.js";
import {
  assertPkrAmount,
  fromStripeMinorUnits,
  toStripeMinorUnits,
  PAYMENT_CURRENCY,
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  TOKEN_AMOUNT,
  calculateDiscountedAmount,
} from "../config/payment.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import paymentAccepted from "../emailTemplates/paymentAccepted.js";

const SLOT_CONFLICT_MESSAGE =
  "This slot was just booked by another patient. Your payment is being refunded.";

const isDuplicateSlotError = (error) => error?.code === 11000;

const buildSuccessUrl = (paymentType) =>
  `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&payment_type=${paymentType}`;

const buildBookingMetadata = ({
  userId,
  docId,
  slotDate,
  slotTime,
  paymentType,
  fullAmount,
  payableAmount,
}) => ({
  bookingType: "appointment",
  userId: String(userId),
  docId: String(docId),
  slotDate: String(slotDate),
  slotTime: String(slotTime),
  paymentType: String(paymentType),
  fullAmount: String(fullAmount),
  payableAmount: String(payableAmount),
  currency: PAYMENT_CURRENCY,
});

const validateDoctorAndSlot = async ({ docId, slotDate, slotTime }) => {
  if (!docId || !slotDate || !slotTime || !String(slotTime).trim()) {
    throw new Error("Doctor, date, and time slot are required");
  }

  const doctor = await doctorModel.findById(docId).select("-password");
  if (!doctor) {
    throw new Error("Doctor not found");
  }

  if (doctor.status === "suspended") {
    throw new Error("This doctor has been suspended");
  }

  if (!doctor.available) {
    throw new Error("Doctor not available");
  }

  const existingConfirmedAppointment = await appointmentModel.findOne({
    docId,
    slotDate,
    slotTime,
    status: APPOINTMENT_STATUS.CONFIRMED,
  }).select("_id");

  if (existingConfirmedAppointment) {
    throw new Error("This slot is already booked. Please select another time.");
  }

  return doctor;
};

const addBookedSlotToDoctor = async ({ docId, slotDate, slotTime }) => {
  const doctor = await doctorModel.findById(docId);
  if (!doctor) {
    return;
  }

  const slotsBooked = doctor.slots_booked || {};
  const daySlots = Array.isArray(slotsBooked[slotDate]) ? slotsBooked[slotDate] : [];

  if (!daySlots.includes(slotTime)) {
    slotsBooked[slotDate] = [...daySlots, slotTime];
    doctor.slots_booked = slotsBooked;
    await doctor.save();
  }
};

const refundPaymentIntentForConflict = async (stripeSession) => {
  if (!stripeSession?.payment_intent) {
    return null;
  }

  try {
    return await stripe.refunds.create({
      payment_intent: stripeSession.payment_intent,
      reason: "requested_by_customer",
      metadata: {
        reason: "slot_conflict",
        checkoutSessionId: stripeSession.id,
      },
    });
  } catch (error) {
    console.error("Failed to create conflict refund:", error.message);
    return null;
  }
};

const createAppointmentFromCheckoutSession = async (stripeSession) => {
  const metadata = stripeSession.metadata || {};
  if (metadata.bookingType !== "appointment") {
    throw new Error("Invalid booking session");
  }

  const paymentType = metadata.paymentType;
  const fullAmount = Number(metadata.fullAmount);
  const paidAmount = fromStripeMinorUnits(
    stripeSession.amount_total,
    PAYMENT_CURRENCY
  );

  if (![PAYMENT_TYPE.ONLINE, PAYMENT_TYPE.TOKEN].includes(paymentType)) {
    throw new Error("Invalid payment type");
  }

  const [userData, docData] = await Promise.all([
    userModel.findById(metadata.userId).select("-password"),
    doctorModel.findById(metadata.docId).select("-password"),
  ]);

  if (!userData) {
    throw new Error("User not found");
  }

  if (!docData) {
    throw new Error("Doctor not found");
  }

  const appointmentPayload = {
    userId: userData._id.toString(),
    docId: docData._id.toString(),
    userData: userData.toObject(),
    docData: docData.toObject(),
    slotDate: metadata.slotDate,
    slotTime: metadata.slotTime,
    amount: assertPkrAmount(fullAmount, "appointment amount"),
    currency: PAYMENT_CURRENCY,
    paidAmount,
    paymentType,
    paymentStatus:
      paymentType === PAYMENT_TYPE.ONLINE
        ? PAYMENT_STATUS.PAID
        : PAYMENT_STATUS.PARTIAL,
    status: APPOINTMENT_STATUS.CONFIRMED,
    paymentIntentId: stripeSession.payment_intent,
    checkoutSessionId: stripeSession.id,
    isPaid: paymentType === PAYMENT_TYPE.ONLINE,
    tokenPaid: paymentType === PAYMENT_TYPE.TOKEN,
    refundInitiated: false,
    payment: true,
    date: Date.now(),
  };

  const appointment = await appointmentModel.create(appointmentPayload);
  await addBookedSlotToDoctor({
    docId: appointment.docId,
    slotDate: appointment.slotDate,
    slotTime: appointment.slotTime,
  });

  // ✅ Doctor wallet: credit token amount on TOKEN booking (advance received)
  // Idempotency: this runs only when creating a brand new appointment.
  if (appointment.paymentType === PAYMENT_TYPE.TOKEN && !appointment.doctorWalletCredited) {
    await doctorModel.findByIdAndUpdate(appointment.docId, {
      $inc: { walletBalance: TOKEN_AMOUNT },
    });
    appointment.doctorWalletCredited = true;
    await appointment.save();
  }

  return appointment;
};

const verifyAppointmentPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.json({ success: false, message: "Missing session id" });
    }

    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    if (!stripeSession) {
      return res.json({ success: false, message: "Session not found" });
    }

    if (
      stripeSession.currency &&
      stripeSession.currency.toLowerCase() !== PAYMENT_CURRENCY
    ) {
      return res.json({ success: false, message: "Invalid payment currency" });
    }

    if (stripeSession.status !== "complete") {
      return res.json({ success: false, message: "Payment not complete yet" });
    }

    const existingAppointment = await appointmentModel.findOne({
      $or: [
        { checkoutSessionId: sessionId },
        { paymentIntentId: stripeSession.payment_intent },
      ],
    });

    if (existingAppointment) {
      return res.json({
        success: true,
        message: "Payment already verified and appointment confirmed",
        appointment: {
          _id: existingAppointment._id,
          status: existingAppointment.status,
          paymentStatus: existingAppointment.paymentStatus,
          paymentType: existingAppointment.paymentType,
        },
      });
    }

    try {
      const appointment = await createAppointmentFromCheckoutSession(stripeSession);

      try {
        await paymentAccepted({
          patientName: appointment.userData.name,
          patientEmail: appointment.userData.email,
          doctorName: appointment.docData.name,
          amount:
            appointment.paymentType === PAYMENT_TYPE.TOKEN
              ? TOKEN_AMOUNT
              : appointment.amount,
          paidAmount: appointment.paidAmount,
          date: appointment.slotDate,
          time: appointment.slotTime,
        });
      } catch (error) {
        console.error("Failed to send payment confirmation email:", error);
      }

      return res.json({
        success: true,
        message:
          appointment.paymentType === PAYMENT_TYPE.TOKEN
            ? "Token payment successful. Your appointment is confirmed."
            : "Payment successful. Your appointment is confirmed.",
        appointment: {
          _id: appointment._id,
          status: appointment.status,
          paymentStatus: appointment.paymentStatus,
          paymentType: appointment.paymentType,
          remainingAmount:
            appointment.paymentType === PAYMENT_TYPE.TOKEN
              ? appointment.amount - appointment.paidAmount
              : 0,
        },
      });
    } catch (error) {
      if (isDuplicateSlotError(error)) {
        const refund = await refundPaymentIntentForConflict(stripeSession);

        return res.status(409).json({
          success: false,
          message: SLOT_CONFLICT_MESSAGE,
          refundInitiated: Boolean(refund),
          refundId: refund?.id || null,
        });
      }

      throw error;
    }
  } catch (error) {
    console.log("VERIFY PAYMENT ERROR:", error);
    return res.json({
      success: false,
      message: error.message || "Verification error",
    });
  }
};

// CREATE STRIPE CHECKOUT SESSION FOR FULL ONLINE PAYMENT
router.post("/create-checkout-session", authUser, async (req, res) => {
  try {
    const { docId, slotDate, slotTime } = req.body;
    const userId = req.user.userId;
    const doctor = await validateDoctorAndSlot({ docId, slotDate, slotTime });
    const fullAmount = assertPkrAmount(doctor.fees, "doctor fee");
    const payableAmount = calculateDiscountedAmount(fullAmount);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: PAYMENT_CURRENCY,
            product_data: {
              name: `Appointment with Dr. ${doctor.name}`,
              description: `Full payment with 10% discount`,
            },
            unit_amount: toStripeMinorUnits(payableAmount, PAYMENT_CURRENCY),
          },
          quantity: 1,
        },
      ],
      success_url: buildSuccessUrl(PAYMENT_TYPE.ONLINE),
      cancel_url: `${process.env.FRONTEND_URL}/appointment/${doctor._id}`,
      metadata: buildBookingMetadata({
        userId,
        docId,
        slotDate,
        slotTime,
        paymentType: PAYMENT_TYPE.ONLINE,
        fullAmount,
        payableAmount,
      }),
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.log("CHECKOUT SESSION ERROR:", err);
    res.json({ success: false, message: err.message || "Checkout session error" });
  }
});

// VERIFY APPOINTMENT PAYMENT AND CREATE APPOINTMENT AFTER SUCCESS
router.post("/verify-payment", verifyAppointmentPayment);

// TOKEN PAYMENT CHECKOUT SESSION
router.post("/create-token-payment-session", authUser, async (req, res) => {
  try {
    const { docId, slotDate, slotTime } = req.body;
    const userId = req.user.userId;
    const doctor = await validateDoctorAndSlot({ docId, slotDate, slotTime });
    const fullAmount = assertPkrAmount(doctor.fees, "doctor fee");
    const payableAmount = TOKEN_AMOUNT;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: PAYMENT_CURRENCY,
            product_data: {
              name: `Token Payment for Dr. ${doctor.name}`,
              description: `Fixed token payment of Rs. 500. Remaining to be paid at clinic.`,
            },
            unit_amount: toStripeMinorUnits(payableAmount, PAYMENT_CURRENCY),
          },
          quantity: 1,
        },
      ],
      success_url: buildSuccessUrl(PAYMENT_TYPE.TOKEN),
      cancel_url: `${process.env.FRONTEND_URL}/appointment/${doctor._id}`,
      metadata: buildBookingMetadata({
        userId,
        docId,
        slotDate,
        slotTime,
        paymentType: PAYMENT_TYPE.TOKEN,
        fullAmount,
        payableAmount,
      }),
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.log("TOKEN PAYMENT SESSION ERROR:", err);
    res.json({ success: false, message: err.message || "Session creation error" });
  }
});

router.post("/verify-token-payment", verifyAppointmentPayment);

// CREATE ONLINE CONSULTATION CHECKOUT SESSION
router.post("/create-online-consult-checkout", async (req, res) => {
  try {
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    // Verify doctor exists and is available for online consultation
    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    if (!doctor.onlineConsultEnabled || !doctor.isOnlineNow) {
      return res.json({ success: false, message: "Doctor is not available for online consultation" });
    }

    const consultFee = assertPkrAmount(doctor.onlineConsultFee, "online consultation fee");
    const stripeConsultFee = toStripeMinorUnits(consultFee, PAYMENT_CURRENCY);

    // Create stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: PAYMENT_CURRENCY,
            product_data: {
              name: `Online Consultation with Dr. ${doctor.name}`,
              description: `Instant video consultation (${doctor.averageConsultDuration || 15} minutes)`,
            },
            unit_amount: stripeConsultFee,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/online-consult-success?session_id={CHECKOUT_SESSION_ID}&doctor_id=${doctorId}`,
      cancel_url: `${process.env.FRONTEND_URL}/online-consulting`,
      metadata: {
        type: 'online_consultation',
        doctorId: doctorId,
          fee: consultFee.toString(),
        currency: PAYMENT_CURRENCY
      }
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.log("ONLINE CONSULT CHECKOUT SESSION ERROR:", err);
    res.json({ success: false, message: err.message || "Checkout session error" });
  }
});

// VERIFY ONLINE CONSULTATION PAYMENT AND CREATE SESSION
router.post("/verify-online-consult-payment", authUser, async (req, res) => {
  try {
    const { sessionId, doctorId } = req.body;

    if (!sessionId || !doctorId) {
      return res.json({ success: false, message: "Missing session id or doctor id" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.json({ success: false, message: "Session not found" });
    }

    if (session.currency && session.currency.toLowerCase() !== PAYMENT_CURRENCY) {
      return res.json({ success: false, message: "Invalid payment currency" });
    }

    if (session.status !== "complete") {
      return res.json({ success: false, message: "Payment not complete yet" });
    }

    // Check if session was already processed
    const existingSession = await onlineConsultSessionModel.findOne({
      paymentIntentId: session.payment_intent
    });

    if (existingSession) {
      return res.json({ 
        success: true, 
        message: "Session already created",
        roomId: existingSession.roomId,
        sessionId: existingSession._id
      });
    }

    // Get doctor details
    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    // Get patient from authenticated user
    const authUser = req.user; // This should be set by auth middleware
    if (!authUser) {
      return res.json({ success: false, message: "User not authenticated" });
    }

    // Generate unique room ID
    const roomId = `consult_${uuidv4()}`;

    // Create online consultation session
    const consultSession = new onlineConsultSessionModel({
      doctorId: doctorId,
      patientId: authUser.id || authUser.userId,
      roomId: roomId,
      fee: fromStripeMinorUnits(session.amount_total, PAYMENT_CURRENCY),
      currency: PAYMENT_CURRENCY,
      durationEstimate: doctor.averageConsultDuration || 15,
      paymentIntentId: session.payment_intent,
      status: "pending_doctor_accept"
    });

    await consultSession.save();

    // Get patient details for notification
    console.log("VERIFY PAYMENT - Looking up patient with ID:", consultSession.patientId);
    const patient = await userModel.findById(consultSession.patientId).select("name email image");
    console.log("VERIFY PAYMENT - Patient found:", patient ? "YES" : "NO");
    if (patient) {
      console.log("VERIFY PAYMENT - Patient data:", { name: patient.name, email: patient.email, hasImage: !!patient.image });
    }

    // Emit socket event to doctor
    const eventData = {
      sessionId: consultSession._id,
      roomId,
      patient: patient ? {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        image: patient.image
      } : {
        id: consultSession.patientId,
        name: 'Unknown Patient',
        email: 'No email',
        image: null
      },
      fee: consultSession.fee,
      durationEstimate: consultSession.durationEstimate,
      createdAt: consultSession.createdAt
    };
    
    console.log("VERIFY PAYMENT - Emitting socket event with patient data:", eventData.patient);
    req.app.get('io').emit(`doctor:${doctorId}:incoming_consult`, eventData);

    return res.json({ 
      success: true, 
      message: "Payment verified and session created",
      roomId: roomId,
      sessionId: consultSession._id
    });
  } catch (err) {
    console.log("VERIFY ONLINE CONSULT PAYMENT ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

export default router;
