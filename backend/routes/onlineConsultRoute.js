import express from "express";
import authUser from "../middlewares/authUser.js";
import authDoctor from "../middlewares/authDoctor.js";
import onlineConsultSessionModel from "../models/onlineConsultSessionModel.js";
import doctorModel from "../models/doctorModel.js";
import userModel from "../models/userModel.js";
import { v4 as uuidv4 } from 'uuid';
import jwt from "jsonwebtoken";

const router = express.Router();

// Create online consultation session (after payment)
router.post("/create", authUser, async (req, res) => {
  try {
    const { doctorId, paymentIntentId, fee } = req.body;

    // Validate inputs
    if (!doctorId || !paymentIntentId || !fee) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    // Check if doctor exists and is available for online consultation
    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    if (!doctor.onlineConsultEnabled || !doctor.isOnlineNow) {
      return res.json({ success: false, message: "Doctor is not available for online consultation" });
    }

    // Check if patient has an active session with this doctor
    const existingSession = await onlineConsultSessionModel.findOne({
      doctorId,
      patientId: req.userId,
      status: { $in: ["pending_doctor_accept", "accepted", "active"] }
    });

    if (existingSession) {
      return res.json({ success: false, message: "You already have an active consultation request with this doctor" });
    }

    // Generate unique room ID
    const roomId = `consult_${uuidv4()}`;

    // Create session
    const session = new onlineConsultSessionModel({
      doctorId,
      patientId: req.userId,
      roomId,
      fee,
      durationEstimate: doctor.averageConsultDuration || 15,
      paymentIntentId,
      status: "pending_doctor_accept"
    });

    await session.save();

    // Get patient details for notification
    const patient = await userModel.findById(req.userId).select("name email image");

    // Emit socket event to doctor (will be handled in server.js)
    req.app.get('io').emit(`doctor:${doctorId}:incoming_consult`, {
      sessionId: session._id,
      roomId,
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        image: patient.image
      },
      fee,
      durationEstimate: session.durationEstimate,
      createdAt: session.createdAt
    });

    res.json({ 
      success: true, 
      sessionId: session._id,
      roomId,
      message: "Consultation request sent successfully"
    });

  } catch (error) {
    console.log("CREATE ONLINE CONSULT ERROR:", error);
    res.json({ success: false, message: error.message });
  }
});

// Doctor respond to consultation request
router.post("/respond", authDoctor, async (req, res) => {
  try {
    const { sessionId, action } = req.body; // action: 'accept' or 'reject'

    console.log("DOCTOR RESPONSE - sessionId:", sessionId);
    console.log("DOCTOR RESPONSE - action:", action);
    console.log("DOCTOR RESPONSE - req.userId:", req.userId);

    if (!sessionId || !action) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    if (!['accept', 'reject'].includes(action)) {
      return res.json({ success: false, message: "Invalid action" });
    }

    // Find session
    const session = await onlineConsultSessionModel.findById(sessionId);
    console.log("DOCTOR RESPONSE - session found:", session ? "YES" : "NO");
    console.log("DOCTOR RESPONSE - session status:", session?.status);
    
    if (!session) {
      return res.json({ success: false, message: "Session not found" });
    }

    // Verify doctor owns this session
    console.log("DOCTOR RESPONSE - session.doctorId:", session.doctorId);
    console.log("DOCTOR RESPONSE - req.userId:", req.userId);
    
    if (session.doctorId !== req.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    // Check session status
    if (session.status !== "pending_doctor_accept") {
      console.log("DOCTOR RESPONSE - Session status check failed. Current status:", session.status);
      return res.json({ success: false, message: "Session is no longer pending" });
    }

    // Update session
    if (action === 'accept') {
      session.status = "accepted";
      session.acceptedAt = new Date();
      console.log("DOCTOR RESPONSE - Session accepted");
    } else {
      session.status = "rejected";
      session.refundFlag = true;
      console.log("DOCTOR RESPONSE - Session rejected");
    }

    await session.save();
    console.log("DOCTOR RESPONSE - Session saved successfully");

    // Get doctor details for notification
    const doctor = await doctorModel.findById(req.userId).select("name speciality image");

    // Emit socket event to patient
    console.log("DOCTOR RESPONSE - Emitting to patient:", session.patientId);
    req.app.get('io').emit(`patient:${session.patientId}:consult_response`, {
      sessionId: session._id,
      roomId: session.roomId,
      action,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        speciality: doctor.speciality,
        image: doctor.image
      },
      status: session.status
    });

    console.log("DOCTOR RESPONSE - Socket event emitted to patient");

    console.log("DOCTOR RESPONSE - Response completed successfully");
    res.json({ 
      success: true, 
      message: `Consultation ${action}ed successfully`,
      sessionId: session._id,
      roomId: session.roomId
    });

  } catch (error) {
    console.log("DOCTOR RESPONSE ERROR:", error);
    res.json({ success: false, message: error.message });
  }
});

// Validate room access
router.get("/:roomId/validate", async (req, res) => {
  try {
    console.log("VALIDATE ROOM - Route hit");
    const { roomId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    console.log("VALIDATE ROOM - roomId:", roomId);
    console.log("VALIDATE ROOM - token:", token ? "PRESENT" : "MISSING");

    if (!token) {
      return res.json({ success: false, message: "No token provided" });
    }

    // Find session
    console.log("VALIDATE ROOM - Finding session...");
    const session = await onlineConsultSessionModel.findOne({ roomId });
    console.log("VALIDATE ROOM - Session found:", session ? "YES" : "NO");
    
    if (!session) {
      return res.json({ success: false, message: "Session not found" });
    }

    // Decode token to get user info
    console.log("VALIDATE ROOM - Decoding token...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "demo-secret");
    const userId = decoded.id || decoded.userId;

    // Check if user is part of this session
    const isPatient = session.patientId === userId;
    const isDoctor = session.doctorId === userId;

    if (!isPatient && !isDoctor) {
      return res.json({ success: false, message: "Unauthorized access" });
    }

    // Check session status
    if (session.status !== "accepted" && session.status !== "active") {
      return res.json({ 
        success: false, 
        message: "Consultation is not active",
        status: session.status 
      });
    }

    // Update status to active if this is the first join
    if (session.status === "accepted") {
      session.status = "active";
      session.startedAt = new Date();
      await session.save();

      // Notify the other party that consultation has started
      const otherPartyId = isPatient ? session.doctorId : session.patientId;
      req.app.get('io').emit(`user:${otherPartyId}:consult_started`, {
        sessionId: session._id,
        roomId: session.roomId
      });
    }

    res.json({ 
      success: true, 
      canJoin: true,
      session: {
        sessionId: session._id,
        doctorId: session.doctorId,
        patientId: session.patientId,
        status: session.status,
        fee: session.fee,
        durationEstimate: session.durationEstimate
      },
      userRole: isDoctor ? 'doctor' : 'patient'
    });

  } catch (error) {
    console.log("VALIDATE ROOM ERROR:", error);
    res.json({ success: false, message: error.message });
  }
});

// Get user's online consultation sessions
router.get("/my-sessions", authUser, async (req, res) => {
  try {
    const sessions = await onlineConsultSessionModel.find({ 
      patientId: req.userId 
    })
    .populate('doctorId', 'name speciality image onlineConsultFee')
    .sort({ createdAt: -1 });

    res.json({ success: true, sessions });

  } catch (error) {
    console.log("GET PATIENT SESSIONS ERROR:", error);
    res.json({ success: false, message: error.message });
  }
});

// Get doctor's online consultation sessions
router.get("/doctor-sessions", authDoctor, async (req, res) => {
  try {
    const sessions = await onlineConsultSessionModel.find({ 
      doctorId: req.userId 
    })
    .populate('patientId', 'name email image')
    .sort({ createdAt: -1 });

    res.json({ success: true, sessions });

  } catch (error) {
    console.log("GET DOCTOR SESSIONS ERROR:", error);
    res.json({ success: false, message: error.message });
  }
});

// Update doctor online settings
router.put("/doctor-settings", authDoctor, async (req, res) => {
  try {
    const { onlineConsultEnabled, onlineConsultFee, isOnlineNow } = req.body;

    console.log("Doctor Settings Update Request:");
    console.log("- req.userId:", req.userId);
    console.log("- req.body.docId:", req.body.docId);
    console.log("- Request body:", req.body);

    const doctor = await doctorModel.findById(req.userId);
    console.log("- Found doctor:", doctor ? "YES" : "NO");
    
    if (!doctor) {
      console.log("- Doctor not found for ID:", req.userId);
      return res.json({ success: false, message: "Doctor not found" });
    }

    // Update settings
    if (onlineConsultEnabled !== undefined) {
      doctor.onlineConsultEnabled = onlineConsultEnabled;
    }

    if (onlineConsultFee !== undefined) {
      doctor.onlineConsultFee = onlineConsultFee;
    }

    if (isOnlineNow !== undefined) {
      doctor.isOnlineNow = isOnlineNow;
    }

    await doctor.save();

    res.json({ 
      success: true, 
      message: "Settings updated successfully",
      settings: {
        onlineConsultEnabled: doctor.onlineConsultEnabled,
        onlineConsultFee: doctor.onlineConsultFee,
        isOnlineNow: doctor.isOnlineNow
      }
    });

  } catch (error) {
    console.log("UPDATE DOCTOR SETTINGS ERROR:", error);
    res.json({ success: false, message: error.message });
  }
});

export default router;
