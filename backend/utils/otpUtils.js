import crypto from "crypto";
import emailOtpModel from "../models/emailOtpModel.js";

// Generate a secure 6-digit OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store OTP in database
export const storeOTP = async (email, otp, purpose = 'signup') => {
  try {
    // Remove any existing OTPs for this email and purpose
    await emailOtpModel.deleteMany({ email, purpose });
    
    // Create new OTP record
    const otpRecord = await emailOtpModel.create({
      email,
      otp,
      purpose,
      createdAt: new Date(),
    });

    console.log(`🔐 OTP generated for ${email}: ${otp}`); // Show OTP in terminal
    
    return otpRecord;
  } catch (error) {
    console.error("Error storing OTP:", error);
    throw new Error("Failed to store OTP");
  }
};

// Verify OTP
export const verifyOTP = async (email, otp, purpose = 'signup') => {
  try {
    const otpRecord = await emailOtpModel.findOne({
      email,
      otp,
      purpose,
      isVerified: false,
    });

    if (!otpRecord) {
      return { success: false, message: "Invalid OTP" };
    }

    // Check if OTP has expired (TTL index handles this, but double check)
    const now = new Date();
    const otpAge = (now - otpRecord.createdAt) / 1000; // age in seconds
    if (otpAge > 300) { // 5 minutes
      await emailOtpModel.deleteOne({ _id: otpRecord._id });
      return { success: false, message: "OTP has expired" };
    }

    // Increment attempts
    await emailOtpModel.updateOne(
      { _id: otpRecord._id },
      { $inc: { attempts: 1 } }
    );

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts - 1) {
      await emailOtpModel.deleteOne({ _id: otpRecord._id });
      return { success: false, message: "Maximum attempts exceeded. Please request a new OTP." };
    }

    // Mark as verified
    await emailOtpModel.updateOne(
      { _id: otpRecord._id },
      { isVerified: true }
    );

    return { success: true, message: "OTP verified successfully" };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { success: false, message: "Failed to verify OTP" };
  }
};

// Check if email is already verified
export const isEmailVerified = async (email, purpose = 'signup') => {
  try {
    const verifiedRecord = await emailOtpModel.findOne({
      email,
      purpose,
      isVerified: true,
    });

    return !!verifiedRecord;
  } catch (error) {
    console.error("Error checking email verification:", error);
    return false;
  }
};
