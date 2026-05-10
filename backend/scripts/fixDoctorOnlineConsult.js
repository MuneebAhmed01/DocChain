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
  // Process in smaller batches to avoid memory issues
  let processed = 0;
  const batchSize = 10;
  let hasMore = true;
  
  while (hasMore) {
    const doctors = await doctorModel
      .find({
        $or: [
          { onlineConsultEnabled: { $exists: false } },
          { onlineConsultEnabled: null }
        ]
      })
      .limit(batchSize)
      .lean();

    if (doctors.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing batch of ${doctors.length} doctors...`);

    for (const doctor of doctors) {
      await doctorModel.findByIdAndUpdate(doctor._id, {
        onlineConsultEnabled: true,
        onlineConsultFee: doctor.fees || 0
      });
      console.log(`✅ Updated: ${doctor.name} (${doctor.email})`);
      processed++;
    }

    // Small delay to prevent overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`🎉 Completed! Updated ${processed} doctors successfully`);
} catch (error) {
  console.error("❌ Update failed:", error);
  process.exit(1);
}

await mongoose.disconnect();
