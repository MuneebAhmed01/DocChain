import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  appointmentId: { type: String, ref: 'appointment' }, // Optional - chat can exist independently
  patientId: { type: String, required: true, ref: 'user' },
  doctorId: { type: String, required: true, ref: 'doctor' },
  lastMessage: { type: String, default: '' },
  lastMessageTime: { type: Date, default: Date.now },
  unreadPatientCount: { type: Number, default: 0 },
  unreadDoctorCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false }, // Soft delete for safe deletion
  deletedBy: { type: String, enum: ['doctor', 'patient', null], default: null }, // Track who deleted
  deletedAt: { type: Date, default: null }, // Track when deleted
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

chatSchema.index({ appointmentId: 1 });
chatSchema.index({ patientId: 1 });
chatSchema.index({ doctorId: 1 });
chatSchema.index({ doctorId: 1, patientId: 1 }, { unique: true }); // Ensure one chat per doctor-patient pair
chatSchema.index({ isDeleted: 1 }); // For filtering deleted chats

const chatModel = mongoose.models.chat || mongoose.model("chat", chatSchema);

export default chatModel;
