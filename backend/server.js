import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import adminRouter from "./routes/adminRoute.js";

import doctorRouter from "./routes/doctorRoute.js";
import userRouter from "./routes/userRoute.js";

import jwt from "jsonwebtoken";

import blogRoutes from './routes/blogRoutes.js';
import stripeRoutes from './routes/stripeRoutes.js'
import stripeWebhook from "./routes/stripeWebhook.js";
import sendEmail from "./utils/sendEmail.js";
import pendingDoctorRouter from "./routes/pendingDoctorRouter.js";
import mongoose from "mongoose";






const app = express();
const port = process.env.PORT || 4000;
connectCloudinary();
connectDB();

// ✅ CORS - MUST come before routes
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://res.cloudinary.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "authorization","token", "Authorization", "aToken", "atoken", "dToken", "dtoken"],
}));


// Handle preflight requests
app.options("*", cors());

// Parse JSON
app.use(express.json());
app.use("/api/stripe", stripeWebhook);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "demo-secret";


console.log("JWT_SECRET:", process.env.JWT_SECRET);


//email auto
app.get("/test-email", async (req, res) => {
  try {
    sendEmail(
      "alaadinpubg2@gmail.com",
      "Docchain Test Email",
      "If you received this email, your backend email system is working."
    );
    res.send("Email sent successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Email failed");
  }
});






// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};

// Routes
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);
app.use("/api/stripe", stripeRoutes);
app.use("/api/pending-doctor", pendingDoctorRouter);

// blog routes

app.use('/api/blogs', blogRoutes);


// Demo login
app.post("/api/login", (req, res) => {
  const user = { id: 1, username: "demo" };
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "90d" });
  res.json({ success: true, token });
});

// Example protected route
app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is protected data!", user: req.user });
});

app.get("/", (req, res) => res.send("API WORKING"));

app.listen(port, () => console.log("Server started on port", port));

console.log("backend running")