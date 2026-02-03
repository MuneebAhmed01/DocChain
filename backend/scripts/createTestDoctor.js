import mongoose from 'mongoose';
import doctorModel from '../models/doctorModel.js';
import connectDB from '../config/mongodb.js';
import 'dotenv/config';

const createTestDoctor = async () => {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    await connectDB();
    
    const testDoctor = new doctorModel({
      _id: new mongoose.Types.ObjectId('678f12345678901234567890'),
      name: 'Dr. Richard James',
      email: 'doc01@gmail.com',
      password: '$2a$10$dummy.hash.for.testing.only', // dummy hash
      image: 'doc1.png',
      speciality: 'General physician',
      degree: 'MBBS',
      experience: '4 Years',
      city: 'Lahore',
      about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
      available: true,
      fees: 50,
      address: {
        line1: "123 Medical Center",
        line2: "Lahore, Pakistan"
      },
      slots_booked: {},
      earnings: 0,
      status: "active"
    });

    await testDoctor.save();
    console.log('✅ Test doctor created successfully!');
    console.log('Doctor ID:', testDoctor._id);
    console.log('Email:', testDoctor.email);
    
  } catch (error) {
    console.error('Error creating test doctor:', error);
  } finally {
    mongoose.connection.close();
  }
};

createTestDoctor();
