import "dotenv/config";
import mongoose from "mongoose";
import doctorModel from "../models/doctorModel.js";

if (!process.env.MONGODB_URI) {
  console.error("Missing MONGODB_URI in environment (.env).");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
console.log("✅ MongoDB Connected");

try {
  // Fix doctors with "Pediatrician" (singular) to "Pediatricians" (plural)
  const doctorsToUpdate = await doctorModel.find({
    speciality: "Pediatrician"
  });

  console.log(`Found ${doctorsToUpdate.length} doctors with 'Pediatrician' speciality`);

  for (const doctor of doctorsToUpdate) {
    await doctorModel.findByIdAndUpdate(doctor._id, {
      speciality: "Pediatricians"
    });
    console.log(`✅ Updated: ${doctor.name} - Changed 'Pediatrician' to 'Pediatricians'`);
  }

  console.log("🎉 Speciality names fixed successfully");
} catch (error) {
  console.error("❌ Update failed:", error);
  process.exit(1);
}

await mongoose.disconnect();
