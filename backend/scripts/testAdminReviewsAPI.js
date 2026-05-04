import 'dotenv/config';
import mongoose from 'mongoose';
import doctorModel from '../models/doctorModel.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

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

const testAdminReviewsAPI = async () => {
  try {
    await connectDB();
    
    // Get Dr. Richard James
    const doctor = await doctorModel.findOne({ email: 'doc01@gmail.com' });
    
    if (!doctor) {
      console.log('Doctor not found!');
      return;
    }
    
    console.log('Testing API for Dr. Richard James:', doctor.name);
    
    // Create a JWT token for this doctor (same as frontend would use)
    const token = jwt.sign(
      { 
        id: doctor._id.toString(), 
        email: doctor.email 
      },
      'my-demo-secret', // Same as in .env
      { expiresIn: '90d' }
    );
    
    console.log('Generated token length:', token.length);
    
    // Test the API endpoint
    try {
      const response = await axios.get('http://localhost:4000/api/doctor/reviews', {
        headers: { 
          'dToken': token,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('\n=== API RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Success:', response.data.success);
      console.log('Full Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        console.log('Reviews found:', response.data.reviews?.length || 0);
        
        console.log('\n=== REVIEWS ===');
        response.data.reviews?.forEach((review, index) => {
          console.log(`${index + 1}. ${review.user?.name || 'Unknown'} - ${review.rating}/5`);
          console.log(`   Comment: "${review.comment}"`);
          if (review.reply?.text) {
            console.log(`   Reply: "${review.reply.text}"`);
          }
          console.log('---');
        });
      } else {
        console.log('API Error:', response.data.message);
      }
      
    } catch (apiError) {
      console.log('API Call Error:', apiError.message);
      if (apiError.response) {
        console.log('Response Status:', apiError.response.status);
        console.log('Response Data:', apiError.response.data);
      }
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  } finally {
    mongoose.connection.close();
  }
};

testAdminReviewsAPI();
