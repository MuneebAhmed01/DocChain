import mongoose from "mongoose";

const emailOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['signup', 'password_reset'],
    default: 'signup',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // 5 minutes in seconds
  },
  attempts: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 3,
  },
  isVerified: {
    type: Boolean,
    default: false,
  }
});

// Index for efficient queries
emailOtpSchema.index({ email: 1, purpose: 1 });
emailOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

const emailOtpModel = mongoose.models.emailOtp || mongoose.model("emailOtp", emailOtpSchema);

export default emailOtpModel;
