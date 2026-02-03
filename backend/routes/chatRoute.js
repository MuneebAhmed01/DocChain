import express from "express";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import streamifier from "streamifier";
import jwt from "jsonwebtoken";
import chatModel from "../models/chatModel.js";
import messageModel from "../models/messageModel.js";
import appointmentModel from "../models/appointmentModel.js";
import authChat from "../middlewares/authChat.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "demo-secret";

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

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  }
});

// Upload file to Cloudinary
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
        folder: 'chat_attachments',
        public_id: `${Date.now()}-${file.originalname}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

// Get doctor's chat list
router.get("/doctor-chats", authChat, async (req, res) => {
  try {
    // Handle different token structures - check if user is doctor
    const userType = req.user.type || 'user'; // Default to user, doctors should have explicit type
    console.log('Doctor chats request - User:', req.user, 'Detected type:', userType);
    
    if (userType !== 'doctor') {
      return res.status(403).json({ success: false, message: "Access denied - not a doctor" });
    }

    const chats = await chatModel
      .find({ doctorId: req.user.userId })
      .populate({
        path: 'appointmentId',
        model: 'appointment',
        select: 'userData slotDate slotTime'
      })
      .sort({ lastMessageTime: -1 });

    const chatList = chats.map(chat => ({
      _id: chat._id,
      appointmentId: chat.appointmentId,
      patientName: chat.appointmentId?.userData?.name || 'Unknown Patient',
      patientImage: chat.appointmentId?.userData?.image || '',
      slotDate: chat.appointmentId?.slotDate || '',
      slotTime: chat.appointmentId?.slotTime || '',
      lastMessage: chat.lastMessage,
      lastMessageTime: chat.lastMessageTime,
      unreadCount: chat.unreadDoctorCount,
      isActive: chat.isActive
    }));

    res.json({ success: true, chats: chatList });
  } catch (error) {
    console.error("Error fetching doctor chats:", error);
    res.status(500).json({ success: false, message: "Failed to fetch chats" });
  }
});

// Get patient chat history for specific appointment
router.get("/patient-history/:appointmentId", authChat, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    console.log('Chat history request:', { appointmentId, user: req.user });

    // Verify appointment exists and user is part of it
    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      console.log('Appointment not found:', appointmentId);
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    console.log('Appointment found:', { userId: appointment.userId, docId: appointment.docId });

    // Handle different token structures
    const userType = req.user.type || 'user'; // Default to user, doctors should have explicit type
    const isPatient = userType === 'user' && appointment.userId === req.user.userId;
    const isDoctor = userType === 'doctor' && appointment.docId === req.user.userId;

    console.log('Access check:', { isPatient, isDoctor, userType, userId: req.user.userId });

    if (!isPatient && !isDoctor) {
      console.log('Access denied for user:', req.user);
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Get chat
    const chat = await chatModel.findOne({ appointmentId });
    if (!chat) {
      return res.json({ success: true, messages: [], chatInfo: null });
    }

    // Get messages
    const messages = await messageModel
      .find({ chatId: chat._id })
      .sort({ createdAt: 1 });

    const chatInfo = {
      _id: chat._id,
      appointmentId: chat.appointmentId,
      patientId: chat.patientId,
      doctorId: chat.doctorId,
      unreadCount: isPatient ? chat.unreadPatientCount : chat.unreadDoctorCount
    };

    res.json({ 
      success: true, 
      messages,
      chatInfo,
      appointment: {
        patientName: appointment.userData.name,
        doctorName: appointment.docData.name,
        patientImage: appointment.userData.image,
        doctorImage: appointment.docData.image
      }
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ success: false, message: "Failed to fetch chat history" });
  }
});

// Mark messages as read
router.put("/mark-read", authChat, async (req, res) => {
  try {
    const { appointmentId } = req.body;

    // Verify appointment exists and user is part of it
    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    const isPatient = req.user.type === 'user' && appointment.userId === req.user.userId;
    const isDoctor = req.user.type === 'doctor' && appointment.docId === req.user.userId;

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const chat = await chatModel.findOne({ appointmentId });
    if (!chat) {
      return res.json({ success: true });
    }

    // Update unread counts
    if (isPatient) {
      chat.unreadPatientCount = 0;
      await messageModel.updateMany(
        { chatId: chat._id, receiverType: 'patient', isRead: false },
        { isRead: true, readAt: new Date() }
      );
    } else {
      chat.unreadDoctorCount = 0;
      await messageModel.updateMany(
        { chatId: chat._id, receiverType: 'doctor', isRead: false },
        { isRead: true, readAt: new Date() }
      );
    }

    await chat.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ success: false, message: "Failed to mark messages as read" });
  }
});

// Upload file for chat
router.post("/upload-file", authChat, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const result = await uploadToCloudinary(req.file);

    res.json({
      success: true,
      fileUrl: result.secure_url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ success: false, message: "Failed to upload file" });
  }
});

// Get unread counts for user
router.get("/unread-counts", authChat, async (req, res) => {
  try {
    let chats;

    if (req.user.type === 'doctor') {
      chats = await chatModel.find({ doctorId: req.user.userId });
      const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadDoctorCount, 0);
      res.json({ success: true, totalUnread, chats: chats.length });
    } else {
      chats = await chatModel.find({ patientId: req.user.userId });
      const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadPatientCount, 0);
      res.json({ success: true, totalUnread, chats: chats.length });
    }
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    res.status(500).json({ success: false, message: "Failed to fetch unread counts" });
  }
});

export default router;
