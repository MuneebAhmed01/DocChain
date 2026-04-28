import mongoose from "mongoose";
import appointmentModel from "../models/appointmentModel.js";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("Database Connected");
    });

    await mongoose.connect(process.env.MONGODB_URI);
    await appointmentModel.syncIndexes();
    console.log("Appointment indexes synced");
  } catch (error) {
    console.log(process.env.MONGODB_URI)
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
