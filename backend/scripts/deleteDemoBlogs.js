import "dotenv/config";
import mongoose from "mongoose";
import Blog from "../models/Blog.js";

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const result = await Blog.deleteMany({ isDemo: true });
    console.log(`Deleted ${result.deletedCount} demo blogs`);
  } finally {
    await mongoose.disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Failed to clean demo blogs:", err.message);
    try {
      await mongoose.disconnect();
    } catch (_e) {
      // ignore disconnect errors
    }
    process.exit(1);
  });
