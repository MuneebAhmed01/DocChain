import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import adminRouter from "./routes/adminRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import userRouter from "./routes/userRoute.js";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import { Server } from "socket.io";
import blogRoutes from './routes/blogRoutes.js';
import stripeRoutes from './routes/stripeRoutes.js'
import stripeWebhook from "./routes/stripeWebhook.js";
import sendEmail from "./utils/sendEmail.js";
import pendingDoctorRouter from "./routes/pendingDoctorRouter.js";
import mongoose from "mongoose";
import chatRoutes from "./routes/chatRoute.js";
import appointmentModel from "./models/appointmentModel.js";
import chatModel from "./models/chatModel.js";
import messageModel from "./models/messageModel.js";






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
app.use("/api/chat", chatRoutes);

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

// Create HTTP server and Socket.IO
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Socket auth decoded:', decoded);
    
    // Handle different token structures
    socket.userId = decoded.id || decoded.userId;
    socket.userType = decoded.type || (decoded.email ? 'user' : 'doctor');
    
    console.log(`Socket authenticated: userId=${socket.userId}, userType=${socket.userType}`);
    next();
  } catch (err) {
    console.error('Socket auth error:', err.message);
    next(new Error("Authentication error: Invalid token"));
  }
};

// Apply authentication middleware
io.use(authenticateSocket);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}, Type: ${socket.userType}`);

  // Join appointment room
  socket.on('join-room', async (appointmentId) => {
    try {
      // Verify appointment relationship
      const appointment = await appointmentModel.findById(appointmentId);
      if (!appointment) {
        socket.emit('error', 'Appointment not found');
        return;
      }

      // Check if user is part of this appointment
      const isPatient = socket.userType === 'user' && appointment.userId === socket.userId;
      const isDoctor = socket.userType === 'doctor' && appointment.docId === socket.userId;

      if (!isPatient && !isDoctor) {
        socket.emit('error', 'Unauthorized: You are not part of this appointment');
        return;
      }

      // Join the appointment room
      const roomName = `appointment_${appointmentId}`;
      socket.join(roomName);
      socket.currentRoom = roomName;
      socket.appointmentId = appointmentId;

      console.log(`User ${socket.userId} joined room: ${roomName}`);
      socket.emit('joined-room', { appointmentId, roomName });

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Failed to join room');
    }
  });

  // Send message
  socket.on('send-message', async (data) => {
    try {
      const { appointmentId, message, messageType = 'text', fileUrl = null, fileName = null } = data;

      // Verify user is in the correct room
      if (!socket.currentRoom || !socket.appointmentId || socket.appointmentId !== appointmentId) {
        socket.emit('error', 'Unauthorized: Not in correct room');
        return;
      }

      // Get appointment details
      const appointment = await appointmentModel.findById(appointmentId);
      if (!appointment) {
        socket.emit('error', 'Appointment not found');
        return;
      }

      // Determine sender and receiver
      const senderType = socket.userType === 'user' ? 'patient' : 'doctor';
      const senderId = socket.userId;
      const receiverId = senderType === 'patient' ? appointment.docId : appointment.userId;
      const receiverType = senderType === 'patient' ? 'doctor' : 'patient';

      // Find or create chat
      let chat = await chatModel.findOne({ appointmentId });
      if (!chat) {
        chat = new chatModel({
          appointmentId,
          patientId: appointment.userId,
          doctorId: appointment.docId
        });
      }

      // Create message
      const newMessage = new messageModel({
        chatId: chat._id.toString(),
        appointmentId,
        senderId,
        senderType,
        receiverId,
        receiverType,
        message,
        messageType,
        fileUrl,
        fileName
      });

      await newMessage.save();

      // Update chat
      chat.lastMessage = message;
      chat.lastMessageTime = new Date();
      if (receiverType === 'doctor') {
        chat.unreadDoctorCount += 1;
      } else {
        chat.unreadPatientCount += 1;
      }
      await chat.save();

      // Emit to room
      const messageData = {
        _id: newMessage._id,
        appointmentId,
        senderId,
        senderType,
        receiverId,
        receiverType,
        message,
        messageType,
        fileUrl,
        fileName,
        isRead: false,
        createdAt: newMessage.createdAt
      };

      io.to(socket.currentRoom).emit('new-message', messageData);

      // Send notification to receiver
      socket.to(socket.currentRoom).emit('new-message-notification', {
        chatId: chat._id,
        appointmentId,
        senderName: senderType === 'patient' ? appointment.userData.name : appointment.docData.name,
        message,
        unreadCount: receiverType === 'doctor' ? chat.unreadDoctorCount : chat.unreadPatientCount
      });

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  // Mark messages as read
  socket.on('mark-messages-read', async (appointmentId) => {
    try {
      const appointment = await appointmentModel.findById(appointmentId);
      if (!appointment) {
        socket.emit('error', 'Appointment not found');
        return;
      }

      const isPatient = socket.userType === 'user' && appointment.userId === socket.userId;
      const isDoctor = socket.userType === 'doctor' && appointment.docId === socket.userId;

      if (!isPatient && !isDoctor) {
        socket.emit('error', 'Unauthorized');
        return;
      }

      const chat = await chatModel.findOne({ appointmentId });
      if (!chat) return;

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

      // Notify room
      io.to(`appointment_${appointmentId}`).emit('messages-read', {
        appointmentId,
        userType: socket.userType
      });

    } catch (error) {
      console.error('Error marking messages as read:', error);
      socket.emit('error', 'Failed to mark messages as read');
    }
  });

  // Typing indicator
  socket.on('typing', (appointmentId) => {
    socket.to(`appointment_${appointmentId}`).emit('user-typing', {
      userId: socket.userId,
      userType: socket.userType
    });
  });

  socket.on('stop-typing', (appointmentId) => {
    socket.to(`appointment_${appointmentId}`).emit('user-stop-typing', {
      userId: socket.userId,
      userType: socket.userType
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

server.listen(port, () => console.log(`Server started on port ${port} with Socket.IO`));

console.log("backend running")