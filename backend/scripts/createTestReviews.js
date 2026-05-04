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

const createTestReviews = async () => {
  try {
    await connectDB();
    
    // Get a doctor and multiple users/appointments for testing
    const doctor = await doctorModel.findOne();
    const users = await userModel.find().limit(4);
    const appointments = await appointmentModel.find().limit(4);
    
    if (!doctor || users.length === 0 || appointments.length === 0) {
      console.log('Missing required data. Please ensure you have at least one doctor, multiple users, and appointments in the database.');
      return;
    }
    
    console.log('Creating test reviews...');
    console.log('Doctor:', doctor._id);
    console.log('Users available:', users.length);
    console.log('Appointments available:', appointments.length);
    
    // Create sample reviews with different appointments
    const sampleReviews = [
      {
        doctor: doctor._id,
        user: users[0]._id,
        appointment: appointments[0]._id,
        rating: 5,
        comment: "Excellent doctor! Very professional and caring. Took time to explain everything clearly.",
        reply: {
          text: "Thank you so much for your kind words! I'm glad I could help you.",
          createdAt: new Date()
        }
      },
      {
        doctor: doctor._id,
        user: users[1]?._id || users[0]._id,
        appointment: appointments[1]?._id || appointments[0]._id,
        rating: 4,
        comment: "Good experience overall. The doctor was knowledgeable and the treatment was effective."
      },
      {
        doctor: doctor._id,
        user: users[2]?._id || users[0]._id,
        appointment: appointments[2]?._id || appointments[0]._id,
        rating: 3,
        comment: "Average experience. Wait time was a bit long but the doctor was competent."
      },
      {
        doctor: doctor._id,
        user: users[3]?._id || users[0]._id,
        appointment: appointments[3]?._id || appointments[0]._id,
        rating: 5,
        comment: "Outstanding service! Dr. James is amazing and really cares about patients. Highly recommend!"
      }
    ];
    
    // Clear existing reviews for this doctor
    await reviewModel.deleteMany({ doctor: doctor._id });
    
    // Insert new reviews
    const insertedReviews = await reviewModel.insertMany(sampleReviews);
    
    console.log(`Successfully created ${insertedReviews.length} test reviews!`);
    
    // Update doctor's rating in profile
    const avgRating = sampleReviews.reduce((sum, r) => sum + r.rating, 0) / sampleReviews.length;
    await doctorModel.findByIdAndUpdate(doctor._id, {
      averageRating: avgRating.toFixed(1),
      ratingCount: sampleReviews.length
    });
    
    console.log('Updated doctor profile with new ratings');
    
  } catch (error) {
    console.error('Error creating test reviews:', error);
  } finally {
    mongoose.connection.close();
  }
};

createTestReviews();
