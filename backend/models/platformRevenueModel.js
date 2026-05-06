import mongoose from "mongoose";

const platformRevenueSchema = new mongoose.Schema({
  // Transaction Details
  appointmentId: { type: String, required: true },
  transactionType: {
    type: String,
    enum: ["PLATFORM_FEE_EARNED", "PLATFORM_FEE_REFUNDED"],
    required: true,
  },
  
  // Amount Details
  platformFee: { type: Number, required: true },
  currency: { type: String, default: "pkr" },
  
  // Appointment Context
  doctorId: { type: String, required: true },
  userId: { type: String, required: true },
  doctorName: { type: String, required: true },
  userName: { type: String, required: true },
  
  // Payment Details
  paymentType: {
    type: String,
    enum: ["FULL", "TOKEN"],
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["STRIPE", "CASH"],
    required: true,
  },
  
  // Status and Timestamps
  status: {
    type: String,
    enum: ["PENDING", "COMPLETED", "FAILED"],
    default: "COMPLETED",
  },
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date, default: Date.now },
  
  // Metadata
  metadata: {
    type: Object,
    default: {},
  },
});

// Indexes for performance
platformRevenueSchema.index({ appointmentId: 1 });
platformRevenueSchema.index({ doctorId: 1, createdAt: -1 });
platformRevenueSchema.index({ transactionType: 1, createdAt: -1 });
platformRevenueSchema.index({ status: 1 });

const platformRevenueModel =
  mongoose.models.platformRevenue ||
  mongoose.model("platformRevenue", platformRevenueSchema);

export default platformRevenueModel;
