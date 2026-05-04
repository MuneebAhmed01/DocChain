import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  // Phone number in E.164 format
  phone_number: { type: String, required: true },
  
  // OTP fields
  otp_code: { type: String, required: true }, // Plain text (only for demo/testing)
  otp_hash: { type: String, required: true }, // Hashed OTP for security
  
  // Tracking
  attempts: { type: Number, default: 0, max: 5 },
  max_attempts: { type: Number, default: 5 },
  
  // Status
  is_verified: { type: Boolean, default: false },
  
  // Timestamps
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true }, // OTP expiry time
  
  // Reference to user
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
});

// TTL index - automatically delete OTP after expiry
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Compound index for faster lookups
otpSchema.index({ phone_number: 1, is_verified: 1 });

const otpModel = mongoose.models.otp || mongoose.model("otp", otpSchema);

export default otpModel;
