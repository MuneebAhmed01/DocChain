import mongoose from "mongoose";
import doctorModel from "../models/doctorModel.js";
import { doctors } from "./doctorsData.js";
import { cloudinary } from "../config/cloudinary.js";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

// fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Connect DB
await mongoose.connect(process.env.MONGODB_URI);
console.log("✅ MongoDB Connected");

const seedDoctors = async () => {
  try {
    for (let doc of doctors) {

      console.log("🔄 Uploading:", doc.name);

      const imagePath = path.join(
        __dirname,
        "../../clientside/src/assets",
        `${doc._id}.png`        // doc1.png, doc2.png etc.
      );

      let imageUrl = "";

      try {
        const upload = await cloudinary.uploader.upload(imagePath, {
          folder: "doctors"
        });
        imageUrl = upload.secure_url;
      } catch (err) {
        console.warn(`⚠️ Image missing for ${doc.name}, using placeholder`);
        imageUrl = "https://via.placeholder.com/300";
      }

      const newDoctor = new doctorModel({
        name: doc.name,
        email: doc.name.replace(/\s/g, "").toLowerCase() + "@gmail.com",
        image: imageUrl,
        date: new Date(),
        speciality: doc.speciality,
        degree: doc.degree,
        experience: doc.experience,
        about: doc.about,
        fees: doc.fees,
        address: doc.address,
        password: "12345678"
      });

      await newDoctor.save();
      console.log(`✅ Added: ${doc.name}`);
    }

    console.log("🎉 All doctors seeded successfully");
    process.exit();
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
};

seedDoctors();
