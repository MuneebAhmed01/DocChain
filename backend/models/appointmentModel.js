import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  docId: { type: String, required: true },
  slotDate: { type: String, required: true },
  slotTime: { type: String, required: true },
  userData: { type: Object, required: true },

  paymentIntentId: { type: String, default: null },
  checkoutSessionId: { type: String, default: null },
  isPaid: { type: Boolean, default: false },
  paidAmount: { type: Number, default: 0 }, // <-- actual paid amount
  refundId: { type: String, default: null },
  
  docData: { type: Object, required: true },
  amount: { type: Number, required: true }, // full fee
  date: { type: Number, required: true },
  cancelled: { type: Boolean, default: false },
  payment: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  isRated: { type: Boolean, default: false },
});

const appointmentModel =
  mongoose.models.appointment ||
  mongoose.model("appointment", appointmentSchema);

export default appointmentModel;
