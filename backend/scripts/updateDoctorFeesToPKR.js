import mongoose from 'mongoose';
import doctorModel from '../models/doctorModel.js';
import connectDB from '../config/mongodb.js';
import 'dotenv/config';
import { doctors } from '../config/doctorsData.js';

const updateDoctorFeesToPKR = async () => {
  try {
    await connectDB();

    let updatedCount = 0;

    for (const doctor of doctors) {
      const result = await doctorModel.updateOne(
        { email: doctor.email.toLowerCase() },
        { $set: { fees: doctor.fees } }
      );

      if (result.modifiedCount > 0) {
        updatedCount += 1;
      }
    }

    console.log(`✅ Updated fees for ${updatedCount} doctor records.`);
  } catch (error) {
    console.error('❌ Failed to update doctor fees:', error);
  } finally {
    await mongoose.connection.close();
  }
};

updateDoctorFeesToPKR();