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

import { 
  getProfile,
  bookAppointment,
  listAppointment,
  updateProfile,
  cancelAppointment,
  rateDoctor ,
  getDoctorReviewsUser
} from "../controllers/userController.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "demo-secret";
const upload = multer({ dest: "uploads/" });

import welcomeEmail from "../emailTemplates/welcomeEmail.js";

// ------------------ REGISTER ------------------
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await userModel.findOne({ email });
    if (existingUser)
      return res.json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      
      name,
      email,
      password: hashedPassword,
    });
    await welcomeEmail(user);
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token });
  } catch (err) {
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
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ------------------ GET PROFILE ------------------
router.get("/get-profile", authUser, getProfile, async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user.userId)
      .select("-password");

    if (!user)
      return res.json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ⭐ Get doctor reviews (user)
router.get("/doctor-reviews/:docId", getDoctorReviewsUser);

// ------------------ APPOINTMENT ROUTES ADDED ------------------

// Book appointment
router.post("/book-appointment", authUser, bookAppointment);

//update profile 
router.post("/update-profile", authUser, upload.single("image"), updateProfile);
// Get user appointments
router.get("/appointments", authUser, listAppointment);

// Cancel appointment
router.post("/cancel-appointment", authUser, cancelAppointment);

router.post("/rate-doctor", authUser, rateDoctor);


export default router;
