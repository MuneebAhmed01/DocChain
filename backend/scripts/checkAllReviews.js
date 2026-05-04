import 'dotenv/config';
import mongoose from 'mongoose';
import reviewModel from '../models/reviewModel.js';
import doctorModel from '../models/doctorModel.js';
import userModel from '../models/userModel.js';
import appointmentModel from '../models/appointmentModel.js';

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

const checkAllReviews = async () => {
  try {
    await connectDB();
    
    // Get all reviews with full population
    const reviews = await reviewModel.find({})
      .populate('doctor', 'name email')
      .populate('user', 'name email')
      .populate('appointment', 'slotDate slotTime')
      .sort({ createdAt: -1 });
    
    console.log(`\n=== ALL REVIEWS IN DATABASE (${reviews.length} total) ===\n`);
    
    reviews.forEach((review, index) => {
      console.log(`${index + 1}. Review ID: ${review._id}`);
      console.log(`   Rating: ${review.rating}/5`);
      console.log(`   Doctor: ${review.doctor?.name || 'Unknown'} (${review.doctor?._id})`);
      console.log(`   User: ${review.user?.name || 'Unknown'} (${review.user?._id})`);
      console.log(`   Appointment: ${review.appointment?._id || 'None'}`);
      console.log(`   Comment: "${review.comment}"`);
      if (review.reply?.text) {
        console.log(`   Reply: "${review.reply.text}"`);
      }
      console.log(`   Created: ${review.createdAt}`);
      console.log('---');
    });
    
    // Group by doctor
    const reviewsByDoctor = {};
    reviews.forEach(review => {
      const doctorId = review.doctor?._id?.toString();
      if (doctorId) {
        if (!reviewsByDoctor[doctorId]) {
          reviewsByDoctor[doctorId] = {
            doctor: review.doctor,
            reviews: []
          };
        }
        reviewsByDoctor[doctorId].reviews.push(review);
      }
    });
    
    console.log('\n=== REVIEWS BY DOCTOR ===\n');
    Object.entries(reviewsByDoctor).forEach(([doctorId, data]) => {
      console.log(`Doctor: ${data.doctor.name} (${data.doctor.email})`);
      console.log(`Total Reviews: ${data.reviews.length}`);
      data.reviews.forEach((review, index) => {
        console.log(`  ${index + 1}. ${review.user?.name || 'Unknown'} - ${review.rating}/5 - "${review.comment}"`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('Error checking reviews:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkAllReviews();
