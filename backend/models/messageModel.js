import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chatId: { type: String, required: true, ref: 'chat' },
  appointmentId: { type: String, required: true, ref: 'appointment' },
  senderId: { type: String, required: true },
  senderType: { type: String, enum: ['patient', 'doctor'], required: true },
  receiverId: { type: String, required: true },
  receiverType: { type: String, enum: ['patient', 'doctor'], required: true },
  message: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'image', 'document'], default: 'text' },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileSize: { type: Number, default: null },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ appointmentId: 1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ receiverId: 1 });

const messageModel = mongoose.models.message || mongoose.model("message", messageSchema);

export default messageModel;
