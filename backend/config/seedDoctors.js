import mongoose from "mongoose";
import doctorModel from "../models/doctorModel.js";
import { doctors } from "./doctorsData.js";
import connectCloudinary, { cloudinary } from "./cloudinary.js";

import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt"; // ✅ ADD THIS

dotenv.config();
connectCloudinary();

// ES module dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Connect DB
await mongoose.connect(process.env.MONGODB_URI);
console.log("✅ MongoDB Connected");

// Clear existing doctors
await doctorModel.deleteMany({});
console.log("🧹 Existing doctors removed");

const seedDoctors = async () => {
  try {
    for (const doc of doctors) {
      console.log("🔄 Uploading:", doc.name);

      const imagePath = path.join(__dirname, "../assets", doc.image);
      let imageUrl = "";

      if (!fs.existsSync(imagePath)) {
        console.warn(`⚠️ Image missing for ${doc.name}, using placeholder`);
        imageUrl = "https://via.placeholder.com/300";
      } else {
        const upload = await cloudinary.uploader.upload(imagePath, {
          folder: "doctors",
        });
        imageUrl = upload.secure_url;
      }

      // ✅ HASH PASSWORD HERE
      const hashedPassword = await bcrypt.hash(doc.password, 10);

      await doctorModel.create({
        name: doc.name,
        email: doc.email.toLowerCase(), // ✅ good practice
        image: imageUrl,
        speciality: doc.speciality,
        degree: doc.degree,
        city: doc.city,
        experience: doc.experience,
        about: doc.about,
        fees: doc.fees,
        address: doc.address,
        password: hashedPassword, // ✅ HASHED
      });

      console.log(`✅ Added: ${doc.name}`);
    }

    console.log("🎉 All doctors seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedDoctors();
