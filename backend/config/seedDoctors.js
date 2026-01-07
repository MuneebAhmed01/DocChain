import mongoose from "mongoose";
import doctorModel from "../models/doctorModel.js";
import { doctors } from "./doctorsData.js"; // same folder
import { cloudinary } from "./cloudinary.js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

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

      // Build image path using _id
    const imagePath = path.join(__dirname, "../assets", doc.image);

      let imageUrl = "";

      // Check if image exists
      if (!fs.existsSync(imagePath)) {
        console.warn(`⚠️ Image missing for ${doc.name} at ${imagePath}, using placeholder`);
        imageUrl = "https://via.placeholder.com/300";
      } else {
        const upload = await cloudinary.uploader.upload(imagePath, {
          folder: "doctors"
        });
        imageUrl = upload.secure_url;
      }

      await doctorModel.create({
        name: doc.name,
        email: doc.name.replace(/\s/g, "").toLowerCase() + "@gmail.com",
        image: imageUrl,
        speciality: doc.speciality,
        degree: doc.degree,
        experience: doc.experience,
        about: doc.about,
        fees: doc.fees,
        address: doc.address,
        password: "12345678" // hash later if needed
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
