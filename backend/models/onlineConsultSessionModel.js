import mongoose from "mongoose";

const onlineConsultSessionSchema = new mongoose.Schema({
  doctorId: { 
    type: String, 
    required: true,
    ref: 'doctor'
  },
  patientId: { 
    type: String, 
    required: true,
    ref: 'user'
  },
  roomId: { 
    type: String, 
    required: true,
    unique: true
  },
  fee: { 
    type: Number, 
    required: true 
  },
  durationEstimate: { 
    type: Number, 
    required: true,
    default: 15 // minutes
  },
  status: {
    type: String,
    enum: ["pending_doctor_accept", "accepted", "rejected", "active", "completed", "expired"],
    default: "pending_doctor_accept"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  paymentIntentId: {
    type: String,
    default: null
  },
  refundFlag: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
onlineConsultSessionSchema.index({ roomId: 1 });
onlineConsultSessionSchema.index({ doctorId: 1, status: 1 });
onlineConsultSessionSchema.index({ patientId: 1, status: 1 });
onlineConsultSessionSchema.index({ createdAt: 1 });

// Method to check if session is expired (30 minutes timeout)
onlineConsultSessionSchema.methods.isExpired = function() {
  if (this.status === 'completed' || this.status === 'rejected') {
    return false;
  }
  
  const now = new Date();
  const timeDiff = now - this.createdAt;
  const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
  
  return timeDiff > thirtyMinutes;
};

// Pre-save middleware to check expiration
onlineConsultSessionSchema.pre('save', function(next) {
  if (this.isExpired() && this.status === 'pending_doctor_accept') {
    this.status = 'expired';
  }
  next();
});

const onlineConsultSessionModel =
  mongoose.models.onlineConsultSession || 
  mongoose.model("onlineConsultSession", onlineConsultSessionSchema);

export default onlineConsultSessionModel;
