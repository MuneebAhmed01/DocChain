import mongoose from "mongoose";

const pendingDoctorSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    experience: {
      type: Number,
      min: 0,
      required: true,
    },

    fee: {
      type: Number,
      min: 0,
      required: true,
    },

    specialty: {
      type: String,
      enum: [
        "General Physician",
        "Gynecologist",
        "Dermatologist",
        "Pediatrician",
        "Neurologist",
        "Orthopedic",
      ],
      required: true,
    },

    about: String,

    education: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      enum: ["Lahore", "Islamabad", "Karachi"],
      required: true,
    },

    address1: {
      type: String,
      required: true,
    },

    address2: String,

    profilePic: {
      public_id: String,
      url: String,
    },

    degreeProof: {
      public_id: String,
      url: String,
    },

    status: {
      type: String,
      default: "pending", // pending | approved | rejected
    },
  },
  { timestamps: true }
);

export default mongoose.model("PendingDoctor", pendingDoctorSchema);
