import mongoose from "mongoose";
const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    speciality: { type: String, required: true },
    degree: { type: String, required: true },
    experience: { type: String, required: true },
    about: { type: String, required: true },
    averageRating: { type: Number, default: 0 },
ratingCount: { type: Number, default: 0 },

    available: { type: Boolean, default: true },
    fees: { type: Number, required: true },
    address: { type: Object, required: true },
    date: {
  type: Date,
  default: Date.now,
}
,
    slots_booked: { type: Object, default: {} },
    earnings: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active",
  },
  city: {
  type: String,
  enum: ["Lahore", "Islamabad", "Karachi"],
   set: v => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
  // required: true,
},
  timeSettings: {
    workingDays: {
      type: [String],
      enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      default: ["MON", "TUE", "WED", "THU", "FRI"]
    },
    startTime: {
      type: String,
      default: "14:00"
    },
    endTime: {
      type: String,
      default: "20:00"
    },
    slotDuration: {
      type: Number,
      default: 30
    },
    useCustomSettings: {
      type: Boolean,
      default: false
    }
  },

  // Online Consultation Settings
  onlineConsultEnabled: {
    type: Boolean,
    default: false
  },
  onlineConsultFee: {
    type: Number,
    default: 0
  },
  isOnlineNow: {
    type: Boolean,
    default: false
  },
  averageConsultDuration: {
    type: Number,
    default: 15 // minutes
  },

    // Reliability tracking
    reliabilityScore: { type: Number, default: 100 },
    totalAppointments: { type: Number, default: 0 },
    noShowCount: { type: Number, default: 0 },
    cancellationCount: { type: Number, default: 0 },


  },
  { minimize: false }
);


// 🔥 Important index for filtering
doctorSchema.index({ city: 1, speciality: 1 });

// Compute reliability score before saving
doctorSchema.pre("save", function computeReliability(next) {
  try {
    const noShow = Number(this.noShowCount || 0);
    const cancels = Number(this.cancellationCount || 0);
    let score = 100 - noShow * 10 - cancels * 7;
    if (score < 0) score = 0;
    if (score > 100) score = 100;
    this.reliabilityScore = Math.round(score);
    next();
  } catch (err) {
    next(err);
  }
});

const doctorModel =
  mongoose.models.doctor || mongoose.model("doctor", doctorSchema);

export default doctorModel;
