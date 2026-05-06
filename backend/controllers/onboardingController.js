import userModel from "../models/userModel.js";
import otpModel from "../models/otpModel.js";
import {
  sendOTPViaSMS,
  verifyOTPCode,
  formatPhoneNumber,
} from "../services/otpService.js";
import validator from "validator";

// Validation helper
const validatePhoneNumber = (phone) => {
  const formatted = formatPhoneNumber(phone);
  return validator.isMobilePhone(formatted, ["en-IN", "en-US", "en-GB", "en-PK"]);
};

const validateAge = (age) => {
  const ageNum = parseInt(age);
  return ageNum >= 18 && ageNum <= 120;
};

const validateGender = (gender) => {
  return ["Male", "Female", "Other"].includes(gender);
};

/**
 * POST /api/onboarding/send-otp
 * Send OTP to phone number
 */
export const sendOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;

    // Validate input
    if (!phone_number || !String(phone_number).trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!validatePhoneNumber(phone_number)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid phone number format. Please use E.164 format (e.g., +14155238886)",
      });
    }

    const formattedPhone = formatPhoneNumber(phone_number);

    // Check if phone already registered
    const existingUser = await userModel.findOne({ phone_number: formattedPhone });
    if (existingUser && existingUser._id.toString() !== req.user?.userId) {
      return res.status(409).json({
        success: false,
        message: "This phone number is already registered",
      });
    }

    // Send OTP
    const result = await sendOTPViaSMS(formattedPhone);

    // Log OTP to terminal for development
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║         OTP SENT TO TERMINAL          ║");
    console.log("╚════════════════════════════════════════╝");
    console.log(`🔐 OTP Code: ${result.otp_code}`);
    console.log(`📱 Phone: ${formattedPhone}`);
    console.log(`⏰ Valid for: 10 minutes`);
    console.log("════════════════════════════════════════\n");

    return res.status(200).json({
      success: true,
      message: result.message,
      phone_number: result.phone_number,
      otp_id: result.otp_id,
    });
  } catch (error) {
    console.error("Error sending OTP:", error);

    // Handle rate limiting
    if (error.message.includes("Too many OTP requests")) {
      return res.status(429).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send OTP",
    });
  }
};

/**
 * POST /api/onboarding/verify-otp
 * Verify OTP and mark user for onboarding
 */
export const verifyOTP = async (req, res) => {
  try {
    const { phone_number, otp_code } = req.body;
    const userId = req.user?.userId;

    // Validate input
    if (!phone_number || !String(phone_number).trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!otp_code || !String(otp_code).trim()) {
      return res.status(400).json({
        success: false,
        message: "OTP code is required",
      });
    }

    // Verify OTP
    const result = await verifyOTPCode(phone_number, otp_code, userId);

    return res.status(200).json({
      success: true,
      message: result.message,
      phone_number: result.phone_number,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);

    // Handle specific errors
    if (error.message.includes("No valid OTP found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes("Invalid OTP") || error.message.includes("attempts")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes("Maximum OTP attempts")) {
      return res.status(429).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify OTP",
    });
  }
};

/**
 * POST /api/onboarding/complete
 * Complete onboarding with phone, age, and gender
 * Requires verified OTP
 */
export const completeOnboarding = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { phone_number, age, gender } = req.body;

    // Validate input
    if (!phone_number || !String(phone_number).trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!age) {
      return res.status(400).json({
        success: false,
        message: "Age is required",
      });
    }

    if (!gender) {
      return res.status(400).json({
        success: false,
        message: "Gender is required",
      });
    }

    if (!validateAge(age)) {
      return res.status(400).json({
        success: false,
        message: "Age must be between 18 and 120",
      });
    }

    if (!validateGender(gender)) {
      return res.status(400).json({
        success: false,
        message: "Gender must be Male, Female, or Other",
      });
    }

    // Check if phone number is verified
    const formattedPhone = formatPhoneNumber(phone_number);
    const verifiedOTP = await otpModel.findOne(
      {
        phone_number: formattedPhone,
        is_verified: true,
        user_id: userId,
      },
      {},
      { sort: { created_at: -1 } }
    );

    if (!verifiedOTP) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is not verified. Please verify OTP before completing onboarding.",
      });
    }

    // Update user
    const user = await userModel.findByIdAndUpdate(
      userId,
      {
        phone_number: formattedPhone,
        age: parseInt(age),
        gender,
        is_phone_verified: true,
        whatsapp_opt_in: true, // Auto opt-in after verification
        onboarding_completed: true,
        updated_at: new Date(),
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Onboarding completed successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        age: user.age,
        gender: user.gender,
        is_phone_verified: user.is_phone_verified,
        whatsapp_opt_in: user.whatsapp_opt_in,
        onboarding_completed: user.onboarding_completed,
      },
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to complete onboarding",
    });
  }
};

/**
 * GET /api/onboarding/status
 * Check onboarding status for current user
 */
export const getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const user = await userModel.findById(userId).select(
      "onboarding_completed is_phone_verified phone_number age gender"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      onboarding_completed: user.onboarding_completed,
      is_phone_verified: user.is_phone_verified,
      phone_number: user.phone_number,
      age: user.age,
      gender: user.gender,
    });
  } catch (error) {
    console.error("Error getting onboarding status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get onboarding status",
    });
  }
};
