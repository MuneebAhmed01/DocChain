import express from "express";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import streamifier from "streamifier";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import chatModel from "../models/chatModel.js";
import messageModel from "../models/messageModel.js";
import appointmentModel from "../models/appointmentModel.js";
import authChat from "../middlewares/authChat.js";
import { getJwtSecret } from "../utils/jwtSecret.js";
import htmlPdf from "html-pdf";

const router = express.Router();

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });
  
  try {
    const decoded = jwt.verify(token, getJwtSecret());
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
    const allowedTypes = /jpeg|jpg|png|gif|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, JPG, PNG, GIF) and Word documents (.doc, .docx) are allowed. PDF files are not permitted.'));
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
      .find({ doctorId: req.user.userId, isDeleted: false }) // Filter out deleted chats
      .populate({
        path: 'appointmentId',
        model: 'appointment',
        select: 'userData slotDate slotTime'
      })
      .sort({ lastMessageTime: -1 });

    // Get patient data for chats without appointments
    const patientIds = chats
      .filter(chat => !chat.appointmentId)
      .map(chat => chat.patientId);

    let patientsData = {};
    if (patientIds.length > 0) {
      const patients = await mongoose.model('user').find({ _id: { $in: patientIds } }, 'name image');
      patientsData = patients.reduce((acc, patient) => {
        acc[patient._id] = patient;
        return acc;
      }, {});
    }

    const chatList = chats.map(chat => {
      const patientData = chat.appointmentId?.userData || patientsData[chat.patientId] || {};
      return {
        _id: chat._id,
        appointmentId: chat.appointmentId,
        patientName: patientData.name || 'Unknown Patient',
        patientImage: patientData.image || '',
        slotDate: chat.appointmentId?.slotDate || '',
        slotTime: chat.appointmentId?.slotTime || '',
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        unreadCount: chat.unreadDoctorCount,
        isDeleted: chat.isDeleted
      };
    });

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

// Find or create chat between doctor and patient
router.post("/find-or-create", authChat, async (req, res) => {
  try {
    const { doctorId, patientId, appointmentId } = req.body;
    
    // Verify user is either the doctor or patient in this chat
    const isDoctor = req.user.type === 'doctor' && req.user.userId === doctorId;
    const isPatient = req.user.type === 'user' && req.user.userId === patientId;
    
    if (!isDoctor && !isPatient) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Find existing chat
    let chat = await chatModel.findOne({
      doctorId,
      patientId,
      isDeleted: false
    });

    if (!chat) {
      // Create new chat
      chat = new chatModel({
        doctorId,
        patientId,
        appointmentId: appointmentId || null
      });
      await chat.save();
    }

    // Get participant data
    const doctor = await mongoose.model('doctor').findById(doctorId, 'name image');
    const patient = await mongoose.model('user').findById(patientId, 'name image');

    res.json({
      success: true,
      chat: {
        _id: chat._id,
        doctorId: chat.doctorId,
        patientId: chat.patientId,
        appointmentId: chat.appointmentId,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        doctorName: doctor?.name || 'Unknown Doctor',
        doctorImage: doctor?.image || '',
        patientName: patient?.name || 'Unknown Patient',
        patientImage: patient?.image || ''
      }
    });
  } catch (error) {
    console.error("Error finding/creating chat:", error);
    res.status(500).json({ success: false, message: "Failed to find/create chat" });
  }
});

// Delete chat (doctor only)
router.delete("/delete/:chatId", authChat, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Verify user is a doctor
    if (req.user.type !== 'doctor') {
      return res.status(403).json({ success: false, message: "Only doctors can delete chats" });
    }

    // Find chat and verify ownership
    const chat = await chatModel.findOne({
      _id: chatId,
      doctorId: req.user.userId,
      isDeleted: false
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found or already deleted" });
    }

    // Soft delete the chat
    chat.isDeleted = true;
    chat.deletedBy = 'doctor';
    chat.deletedAt = new Date();
    await chat.save();

    res.json({ success: true, message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ success: false, message: "Failed to delete chat" });
  }
});

// Generate PDF of chat messages
router.post("/generate-pdf", authChat, async (req, res) => {
  try {
    const { chatId, appointmentId } = req.body;
    
    if (!chatId && !appointmentId) {
      return res.status(400).json({ success: false, message: "Chat ID or Appointment ID is required" });
    }

    let chat;
    if (appointmentId) {
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

      chat = await chatModel.findOne({ appointmentId });
    } else {
      // Verify user is part of the chat
      chat = await chatModel.findById(chatId);
      if (!chat) {
        return res.status(404).json({ success: false, message: "Chat not found" });
      }

      const isPatient = req.user.type === 'user' && chat.patientId === req.user.userId;
      const isDoctor = req.user.type === 'doctor' && chat.doctorId === req.user.userId;

      if (!isPatient && !isDoctor) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    // Get messages
    const messages = await messageModel
      .find({ chatId: chat._id })
      .sort({ createdAt: 1 });

    // Get participant details
    let doctor, patient;
    if (chat.appointmentId) {
      const appointment = await appointmentModel.findById(chat.appointmentId);
      doctor = appointment.docData;
      patient = appointment.userData;
    } else {
      doctor = await mongoose.model('doctor').findById(chat.doctorId);
      patient = await mongoose.model('user').findById(chat.patientId);
    }

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Chat History - ${patient?.name || 'Patient'} & ${doctor?.name || 'Doctor'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .participants { margin-bottom: 20px; }
          .message { margin-bottom: 15px; padding: 10px; border-radius: 5px; }
          .doctor-message { background-color: #e3f2fd; margin-left: 20%; }
          .patient-message { background-color: #f3e5f5; margin-right: 20%; }
          .message-info { font-size: 12px; color: #666; margin-bottom: 5px; }
          .message-content { font-size: 14px; line-height: 1.4; }
          .file-attachment { color: #1976d2; text-decoration: underline; }
          .date-header { text-align: center; font-weight: bold; color: #666; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Chat History</h1>
          <div class="participants">
            <p><strong>Patient:</strong> ${patient?.name || 'Unknown Patient'}</p>
            <p><strong>Doctor:</strong> ${doctor?.name || 'Unknown Doctor'}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
        
        <div class="messages">
          ${messages.map((msg, index) => {
            const isDoctor = msg.senderType === 'doctor';
            const messageClass = isDoctor ? 'doctor-message' : 'patient-message';
            const senderName = isDoctor ? doctor?.name || 'Doctor' : patient?.name || 'Patient';
            
            // Add date header for new days
            const messageDate = new Date(msg.createdAt).toLocaleDateString();
            const prevDate = index > 0 ? new Date(messages[index - 1].createdAt).toLocaleDateString() : null;
            const dateHeader = messageDate !== prevDate ? `<div class="date-header">${messageDate}</div>` : '';
            
            return `
              ${dateHeader}
              <div class="message ${messageClass}">
                <div class="message-info">
                  <strong>${senderName}</strong> - ${new Date(msg.createdAt).toLocaleTimeString()}
                </div>
                <div class="message-content">
                  ${msg.message || ''}
                  ${msg.fileUrl ? `<br><a href="${msg.fileUrl}" class="file-attachment">📎 ${msg.fileName || 'Attachment'}</a>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </body>
      </html>
    `;

    // Generate PDF using html-pdf
    const pdfOptions = {
      format: 'A4',
      border: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    };

    // Create PDF buffer
    const pdfBuffer = await new Promise((resolve, reject) => {
      htmlPdf.create(htmlContent, pdfOptions).toBuffer((err, buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });

    // Upload PDF to Cloudinary
    const pdfFile = {
      buffer: pdfBuffer,
      originalname: `Chat_History_${patient?.name || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`,
      mimetype: 'application/pdf'
    };

    const result = await uploadToCloudinary(pdfFile);

    res.json({
      success: true,
      pdfUrl: result.secure_url,
      fileName: pdfFile.originalname,
      fileSize: pdfBuffer.length
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ success: false, message: "Failed to generate PDF" });
  }
});

// Download file from URL
router.get("/download-file", authChat, async (req, res) => {
  try {
    const { fileUrl, fileName } = req.query;
    
    if (!fileUrl) {
      return res.status(400).json({ success: false, message: "File URL is required" });
    }

    console.log('Attempting to download file:', fileUrl);

    // Extract public_id and format from the stored Cloudinary URL.
    // URL format: https://res.cloudinary.com/[cloud_name]/raw/upload/v[version]/[folder]/[public_id].[format]
    const urlParts = fileUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1 || uploadIndex + 1 >= urlParts.length) {
      return res.status(400).json({ success: false, message: "Invalid Cloudinary URL format" });
    }

    const pathParts = urlParts.slice(uploadIndex + 2).join('/');
    const lastPathPart = urlParts[urlParts.length - 1];
    const lastDotIndex = lastPathPart.lastIndexOf('.');

    if (lastDotIndex === -1) {
      return res.status(400).json({ success: false, message: "Invalid file format" });
    }

    const publicId = pathParts.replace(/\.[^/.]+$/, '');
    const format = lastPathPart.slice(lastDotIndex + 1);

    console.log('Extracted public_id:', publicId);

    // Generate a signed download URL for the raw asset.
    const downloadUrl = cloudinary.utils.private_download_url(publicId, format, {
      resource_type: 'raw',
      type: 'upload',
      secure: true,
      attachment: true,
      expires_at: Math.floor(Date.now() / 1000) + 300 // 5 minutes expiry
    });

    console.log('Generated download URL:', downloadUrl);

    return res.redirect(downloadUrl);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ success: false, message: "Failed to download file", error: error.message });
  }
});

// Get unread counts for user
router.get("/unread-counts", authChat, async (req, res) => {
  try {
    let chats;

    if (req.user.type === 'doctor') {
      chats = await chatModel.find({ doctorId: req.user.userId, isDeleted: false });
      const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadDoctorCount, 0);
      res.json({ success: true, totalUnread, chats: chats.length });
    } else {
      chats = await chatModel.find({ patientId: req.user.userId, isDeleted: false });
      const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadPatientCount, 0);
      res.json({ success: true, totalUnread, chats: chats.length });
    }
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    res.status(500).json({ success: false, message: "Failed to fetch unread counts" });
  }
});

export default router;
