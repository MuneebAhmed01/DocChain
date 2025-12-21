import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "doctor", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "appointment", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

// One review per appointment
reviewSchema.index({ appointment: 1 }, { unique: true });

const reviewModel =
  mongoose.models.review || mongoose.model("review", reviewSchema);

export default reviewModel;
