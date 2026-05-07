import "dotenv/config";
import mongoose from "mongoose";
import doctorModel from "../models/doctorModel.js";

const [email, phoneNumber] = process.argv.slice(2);

if (!email || !phoneNumber) {
  console.error(
    'Usage: node scripts/setDoctorPhone.js "doc01@gmail.com" "+923001234567"'
  );
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error("Missing MONGODB_URI in environment (.env).");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

const result = await doctorModel.updateOne(
  { email: String(email).toLowerCase().trim() },
  {
    $set: {
      phone_number: String(phoneNumber).trim(),
      whatsapp_opt_in: true,
    },
  }
);

console.log(
  `Updated doctors matched=${result.matchedCount} modified=${result.modifiedCount}`
);

await mongoose.disconnect();
