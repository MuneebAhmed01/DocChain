import 'dotenv/config';
import mongoose from 'mongoose';
import doctorModel from '../models/doctorModel.js';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/jwtSecret.js';

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/docchain');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const testDoctorLogin = async () => {
  try {
    await connectDB();
    
    // Get Dr. Richard James
    const doctor = await doctorModel.findOne({ email: 'doc01@gmail.com' });
    
    if (!doctor) {
      console.log('Doctor not found!');
      return;
    }
    
    console.log('Found doctor:', doctor.name);
    console.log('Doctor ID:', doctor._id);
    
    // Create a JWT token for this doctor
    const token = jwt.sign(
      { 
        id: doctor._id.toString(), 
        email: doctor.email 
      },
      getJwtSecret(),
      { expiresIn: '90d' }
    );
    
    console.log('Generated token:', token);
    console.log('Token length:', token.length);
    
    // Test token verification
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      console.log('Token verification successful:', decoded);
    } catch (error) {
      console.log('Token verification failed:', error.message);
    }
    
  } catch (error) {
    console.error('Error testing login:', error);
  } finally {
    mongoose.connection.close();
  }
};

testDoctorLogin();
