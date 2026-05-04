import express from "express";
import authUser from "../middlewares/authUser.js";
import {
  sendOTP,
  verifyOTP,
  completeOnboarding,
  getOnboardingStatus,
} from "../controllers/onboardingController.js";

const router = express.Router();

/**
 * POST /api/onboarding/send-otp
 * Send OTP to phone number
 * Auth: Required
 * Body: { phone_number: string }
 */
router.post("/send-otp", authUser, sendOTP);

/**
 * POST /api/onboarding/verify-otp
 * Verify OTP code
 * Auth: Required
 * Body: { phone_number: string, otp_code: string }
 */
router.post("/verify-otp", authUser, verifyOTP);

/**
 * POST /api/onboarding/complete
 * Complete onboarding with phone, age, gender
 * Auth: Required
 * Body: { phone_number: string, age: number, gender: string }
 * Note: Must have verified OTP first
 */
router.post("/complete", authUser, completeOnboarding);

/**
 * GET /api/onboarding/status
 * Check onboarding completion status
 * Auth: Required
 */
router.get("/status", authUser, getOnboardingStatus);

export default router;
