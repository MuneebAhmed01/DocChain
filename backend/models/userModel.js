import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  image: {
    type: String,
    default: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23E5E7EB'/%3E%3Cpath d='M50 20c8.3 0 15 6.7 15 15s-6.7 15-15 15-15-6.7-15-15 6.7-15 15-15M50 60c16.6 0 30 8 30 18v8H20v-8c0-10 13.4-18 30-18z' fill='%23999'/%3E%3C/svg%3E",
  },
  address: { type: Object, default: { line1: "", line2: "" } },
  gender: { type: String, default: "Not Selected" },
  dob: { type: String, default: "Not Selected" },
  phone: { type: String, default: "000000000" },
  profilePic: {
    url: { type: String, default: "" },
    public_id: { type: String, default: "" }
  },
  // Onboarding & Phone Verification
  phone_number: { type: String, default: null },
  is_phone_verified: { type: Boolean, default: false },
  age: { type: Number, default: null },
  whatsapp_opt_in: { type: Boolean, default: false },
  onboarding_completed: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
