import crypto from "crypto";
import twilio from "twilio";
import otpModel from "../models/otpModel.js";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const TWILIO_WHATSAPP_FROM =
  process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
const TWILIO_CONTENT_SID_OTP_VERIFICATION =
  process.env.TWILIO_CONTENT_SID_OTP_VERIFICATION;
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "10");

const getTwilioClient = () => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error(
      "Twilio credentials missing. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
    );
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

export const formatPhoneNumber = (phone) => {
  // Ensure E.164 format
  const normalized = String(phone || "").trim();
  if (!normalized.startsWith("+")) {
    return `+${normalized}`;
  }
  return normalized;
};

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP for secure storage
 */
export const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

/**
 * Verify OTP against hash
 */
export const verifyOTPHash = (otp, hash) => {
  return hashOTP(otp) === hash;
};

const formatToWhatsAppAddress = (phoneNumber) => {
  const normalized = String(phoneNumber || "").trim();
  if (!normalized) return "";
  return normalized.startsWith("whatsapp:")
    ? normalized
    : `whatsapp:${normalized}`;
};

/**
 * Send OTP via Twilio SMS or WhatsApp sandbox
 */
export const sendOTPViaSMS = async (phoneNumber) => {
  const sender = TWILIO_FROM_NUMBER || TWILIO_WHATSAPP_FROM;

  if (!sender) {
    throw new Error(
      "Twilio sender not configured. Set TWILIO_FROM_NUMBER or TWILIO_WHATSAPP_FROM."
    );
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);
  const isWhatsAppSender = sender.startsWith("whatsapp:");
  const recipient = isWhatsAppSender
    ? formatToWhatsAppAddress(formattedPhone)
    : formattedPhone;

  try {
    const client = getTwilioClient();
    
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // Check for rate limiting - max 3 OTPs per phone number in 24 hours
    const recentOTPs = await otpModel.countDocuments({
      phone_number: formattedPhone,
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (recentOTPs >= 3) {
      throw new Error("Too many OTP requests. Please try again later.");
    }

    // Save OTP to database
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const newOTP = await otpModel.create({
      phone_number: formattedPhone,
      otp_code: otp, // For demo/testing only
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
    });

    const messageRequest = {
      from: sender,
      to: recipient,
    };

    if (isWhatsAppSender && TWILIO_CONTENT_SID_OTP_VERIFICATION) {
      messageRequest.contentSid = TWILIO_CONTENT_SID_OTP_VERIFICATION;
      messageRequest.contentVariables = JSON.stringify({
        1: otp,
        2: `${OTP_EXPIRY_MINUTES} minutes`,
      });
    } else {
      messageRequest.body = `Your DocChain verification code is: ${otp}. This code expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
    }

    await client.messages.create(messageRequest);

    return {
      success: true,
      message: "OTP sent successfully",
      phone_number: formattedPhone,
      otp_id: newOTP._id,
      // DEVELOPMENT ONLY - Remove in production
      otp_code: process.env.NODE_ENV === "development" ? otp : undefined,
    };
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw error;
  }
};

/**
 * Verify OTP and mark as verified
 */
export const verifyOTPCode = async (phoneNumber, otpCode, userId = null) => {
  const formattedPhone = formatPhoneNumber(phoneNumber);

  try {
    // Find the latest OTP for this phone
    const otpRecord = await otpModel.findOne(
      {
        phone_number: formattedPhone,
        is_verified: false,
        expires_at: { $gt: new Date() }, // Not expired
      },
      {},
      { sort: { created_at: -1 } }
    );

    if (!otpRecord) {
      throw new Error("No valid OTP found for this phone number");
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      throw new Error(
        `Maximum OTP attempts exceeded. Please request a new OTP.`
      );
    }

    // Verify OTP code
    if (!verifyOTPHash(otpCode, otpRecord.otp_hash)) {
      // Increment attempts
      otpRecord.attempts += 1;
      await otpRecord.save();

      const remainingAttempts =
        otpRecord.max_attempts - otpRecord.attempts;
      throw new Error(
        `Invalid OTP code. ${remainingAttempts} attempts remaining.`
      );
    }

    // Mark OTP as verified
    otpRecord.is_verified = true;
    otpRecord.user_id = userId;
    await otpRecord.save();

    return {
      success: true,
      message: "OTP verified successfully",
      phone_number: formattedPhone,
      otp_id: otpRecord._id,
    };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw error;
  }
};

/**
 * Check if a phone number has a verified OTP
 */
export const isPhoneNumberVerified = async (phoneNumber) => {
  const formattedPhone = formatPhoneNumber(phoneNumber);

  try {
    const verifiedOTP = await otpModel.findOne(
      {
        phone_number: formattedPhone,
        is_verified: true,
      },
      {},
      { sort: { created_at: -1 } }
    );

    return !!verifiedOTP;
  } catch (error) {
    console.error("Error checking phone verification:", error);
    return false;
  }
};

/**
 * Cleanup expired OTPs (optional - TTL index handles this)
 */
export const cleanupExpiredOTPs = async () => {
  try {
    const result = await otpModel.deleteMany({
      expires_at: { $lt: new Date() },
    });
    console.log(`Cleaned up ${result.deletedCount} expired OTPs`);
    return result.deletedCount;
  } catch (error) {
    console.error("Error cleaning up OTPs:", error);
  }
};
