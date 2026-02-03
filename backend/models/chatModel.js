import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  appointmentId: { type: String, required: true, ref: 'appointment' },
  patientId: { type: String, required: true, ref: 'user' },
  doctorId: { type: String, required: true, ref: 'doctor' },
  lastMessage: { type: String, default: '' },
  lastMessageTime: { type: Date, default: Date.now },
  unreadPatientCount: { type: Number, default: 0 },
  unreadDoctorCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

chatSchema.index({ appointmentId: 1 });
chatSchema.index({ patientId: 1 });
chatSchema.index({ doctorId: 1 });

const chatModel = mongoose.models.chat || mongoose.model("chat", chatSchema);

export default chatModel;
