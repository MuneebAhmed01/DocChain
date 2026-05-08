// import express from "express";
// import {
//   registerUser,
//   loginUser,
//   getProfile,
//   updateProfile,
//   bookAppointment,
//   listAppointment,
//   cancelAppointment,
// } from "../controllers/userController.js";
// import authUser from "../middlewares/authUser.js";
// import upload from "../middlewares/multer.js";

// const userRouter = express.Router();

// userRouter.post("/register", registerUser);
// userRouter.post("/login", loginUser);

// userRouter.get("/get-profile", authUser, getProfile);
// userRouter.post(
//   "/update-profile",
//   upload.single("image"),
//   authUser,
//   updateProfile
// );
// userRouter.post("/book-appointment", authUser, bookAppointment);
// userRouter.get("/appointments", authUser, listAppointment);
// userRouter.post("/cancel-appointment", authUser, cancelAppointment);

// export default userRouter;
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userModel from "../models/userModel.js";
import authUser from "../middlewares/authUser.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { getJwtSecret } from "../utils/jwtSecret.js";

import { 
  getProfile,
  bookAppointment,
  listAppointment,
  updateProfile,
  uploadProfilePic,
  cancelAppointment,
  joinOnlineAppointment,
  rateDoctor ,
  getDoctorReviewsUser,
   sendContactEmail 
} from "../controllers/userController.js";

import { patientResponse } from "../controllers/userController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

import welcomeEmail from "../emailTemplates/welcomeEmail.js";
import sendOTPEmail from "../emailTemplates/otpEmail.js";
import { generateOTP, storeOTP, verifyOTP, isEmailVerified } from "../utils/otpUtils.js";

import googleClient from "../utils/googleClient.js";


router.post("/google-login", async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await userModel.findOne({ email });

    // If user does NOT exist → auto create
    if (!user) {
      user = await userModel.create({
        name,
        email,
        password: "GOOGLE_AUTH", // dummy, not used
        image: picture,
      });
    }

    // Create your normal JWT
    const appToken = jwt.sign(
      { userId: user._id, email: user.email },
      getJwtSecret(),
      { expiresIn: "90d" }
    );

    // Return user data to check profile completion
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      age: user.age,
      gender: user.gender,
      image: user.image,
      profilePic: user.profilePic,
    };

    res.json({ success: true, token: appToken, user: userData });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: "Google auth failed" });
  }
});

// ------------------ OTP ROUTES ------------------

// Send OTP for email verification
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    // Validate email format
    if (!String(email).includes("@")) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid email format" 
      });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "An account with this email already exists" 
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    await storeOTP(email, otp, 'signup');

    // Send OTP email
    await sendOTPEmail(email, otp);

    res.json({ 
      success: true, 
      message: "OTP sent successfully to your email" 
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to send OTP" 
    });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and OTP are required" 
      });
    }

    const result = await verifyOTP(email, otp, 'signup');
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: "OTP verified successfully" 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: result.message 
      });
    }
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to verify OTP" 
    });
  }
});

// ------------------ REGISTER ------------------
router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { name, email, password, phone_number, age, gender } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, email, and password are required" 
      });
    }

    // Validate email format
    if (!String(email).includes("@")) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid email format" 
      });
    }

    // Validate password length
    if (String(password).length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters long" 
      });
    }

    // Check if email is verified via OTP
    const isVerified = await isEmailVerified(email, 'signup');
    if (!isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: "Email verification required. Please verify your email with OTP first." 
      });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser)
      return res.json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle profile image upload
    let profilePicData = { url: "", public_id: "" };
    if (req.file) {
      try {
        const imageUpload = await cloudinary.uploader.upload(req.file.path, {
          resource_type: "image",
          folder: "docchain/profile-pics",
          transformation: [
            { width: 500, height: 500, crop: "fill" },
            { quality: "auto" }
          ]
        });
        profilePicData = {
          url: imageUpload.secure_url,
          public_id: imageUpload.public_id
        };
      } catch (uploadError) {
        console.log("Image upload error:", uploadError);
        // Continue with registration even if image upload fails
      }
    }

    // Calculate DOB from age (use January 1st of birth year)
    let dob = "Not Selected";
    if (age && !isNaN(age)) {
      const birthYear = new Date().getFullYear() - parseInt(age);
      dob = `${birthYear}-01-01`;
    }

    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      phone: phone_number || "000000000",
      phone_number: phone_number || null,
      age: age ? parseInt(age) : null,
      gender: gender || "Not Selected",
      dob: dob,
      image: profilePicData.url || undefined,
      profilePic: profilePicData,
    });
    
    try {
      await welcomeEmail(user);
    } catch (emailErr) {
      console.log("Email send error (non-blocking):", emailErr.message);
      // Don't fail registration if email fails
    }
    
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      getJwtSecret(),
      { expiresIn: "90d" }
    );

    res.json({ success: true, token });
  } catch (err) {
    console.log("Register error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ------------------ LOGIN ------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user)
      return res.json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.json({ success: false, message: "Incorrect password" });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      getJwtSecret(),
      { expiresIn: "90d" }
    );

    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ------------------ GET PROFILE ------------------
router.get("/get-profile", authUser, getProfile);

// ⭐ Get doctor reviews (user)
router.get("/doctor-reviews/:docId", getDoctorReviewsUser);

// ------------------ APPOINTMENT ROUTES ADDED ------------------

// Book appointment
router.post("/book-appointment", authUser, bookAppointment);

router.post("/contact", sendContactEmail);
//update profile 
router.post("/update-profile", authUser, upload.single("image"), updateProfile);
// Upload profile picture
router.post("/upload-profile-pic", authUser, upload.single("image"), uploadProfilePic);
// Get user appointments
router.get("/appointments", authUser, listAppointment);
router.post("/appointments/join-online", authUser, joinOnlineAppointment);

// Cancel appointment
router.post("/cancel-appointment", authUser, cancelAppointment);

// Trigger WhatsApp reminder (manual, for demo)
import { sendWhapiReminderForAppointment } from "../services/whapiAppointmentService.js";
router.post("/trigger-reminder", authUser, async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "appointmentId is required" });
    }
    const result = await sendWhapiReminderForAppointment(appointmentId);
    if (result.sent) {
      return res.json({ success: true, message: "Reminder sent successfully", result });
    }
    return res.json({ success: false, message: result.error || "Failed to send reminder", result });
  } catch (error) {
    console.error("[WAPI][TRIGGER-REMINDER] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/rate-doctor", authUser, rateDoctor);

// Patient response after appointment time
router.post("/appointments/:id/patient-response", authUser, patientResponse);


// ------------------ PROFILE COMPLETION ------------------

// Complete profile without OTP verification
router.post("/complete-profile", authUser, async (req, res) => {
  try {
    const { phone_number, age, gender } = req.body;
    const userId = req.user.userId;

    if (!phone_number || !age || !gender) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Calculate DOB from age
    let dob = "Not Selected";
    if (age && !isNaN(age)) {
      const birthYear = new Date().getFullYear() - parseInt(age);
      dob = `${birthYear}-01-01`;
    }

    // Update user profile and mark as complete
    await userModel.findByIdAndUpdate(userId, {
      phone_number: phone_number,
      phone: phone_number,
      age: parseInt(age),
      gender: gender,
      dob: dob,
      is_phone_verified: true, // Auto-verify since no OTP
      onboarding_completed: true,
    });

    res.json({ 
      success: true, 
      message: "Profile completed successfully" 
    });
  } catch (error) {
    console.log("Complete profile error:", error);
    res.status(500).json({ success: false, message: "Failed to complete profile" });
  }
});

export default router;
