import mongoose from 'mongoose';
import doctorModel from '../models/doctorModel.js';
import reviewModel from '../models/reviewModel.js';
import userModel from '../models/userModel.js';

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

const debugDoctor = async () => {
  try {
    await connectDB();
    
    // Get all doctors
    const doctors = await doctorModel.find({}, 'name email averageRating ratingCount');
    console.log('Available doctors:');
    doctors.forEach((doctor, index) => {
      console.log(`${index + 1}. ${doctor.name} (${doctor.email}) - Rating: ${doctor.averageRating || 'N/A'} (${doctor.ratingCount || 0} reviews)`);
      console.log(`   ID: ${doctor._id}`);
    });
    
    // Get all reviews
    const reviews = await reviewModel.find({})
      .populate('doctor', 'name email')
      .populate('user', 'name email');
    
    console.log('\nAll reviews in database:');
    reviews.forEach((review, index) => {
      console.log(`${index + 1}. Rating: ${review.rating}/5 - ${review.user?.name || 'Unknown'}`);
      console.log(`   Doctor: ${review.doctor?.name || 'Unknown'} (${review.doctor?._id})`);
      console.log(`   Comment: ${review.comment}`);
      console.log(`   Review ID: ${review._id}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error debugging:', error);
  } finally {
    mongoose.connection.close();
  }
};

debugDoctor();
