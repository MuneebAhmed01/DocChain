import express from "express";
import authUser from "../middlewares/authUser.js";
import { getOnboardingStatus } from "../controllers/onboardingController.js";

const router = express.Router();

const onboardingRemoved = (_req, res) => {
  return res.status(410).json({
    success: false,
    message:
      "OTP onboarding has been removed. Please use the new signup form with phone, age, gender, and image.",
  });
};

router.post("/send-otp", authUser, onboardingRemoved);
router.post("/verify-otp", authUser, onboardingRemoved);
router.post("/complete", authUser, onboardingRemoved);

/**
 * GET /api/onboarding/status
 * Check onboarding completion status
 * Auth: Required
 */
router.get("/status", authUser, getOnboardingStatus);

export default router;
