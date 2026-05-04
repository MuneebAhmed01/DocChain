import 'dotenv/config';
import mongoose from 'mongoose';
import reviewModel from '../models/reviewModel.js';
import doctorModel from '../models/doctorModel.js';
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

const fixDoctorReviews = async () => {
  try {
    await connectDB();
    
    // Get Dr. Richard James
    const doctor = await doctorModel.findOne({ email: 'doc01@gmail.com' });
    
    if (!doctor) {
      console.log('Dr. Richard James not found!');
      return;
    }
    
    console.log('Fixing reviews for Dr. Richard James:', doctor._id);
    
    // Find all reviews that don't have a doctor assigned
    const reviewsWithoutDoctor = await reviewModel.find({ doctor: { $exists: false } });
    console.log(`Found ${reviewsWithoutDoctor.length} reviews without doctor assignment`);
    
    // Assign these reviews to Dr. Richard James
    for (const review of reviewsWithoutDoctor) {
      review.doctor = doctor._id;
      await review.save();
      console.log(`Assigned review ${review._id} to Dr. Richard James`);
    }
    
    // Get all reviews for Dr. Richard James
    const allDoctorReviews = await reviewModel.find({ doctor: doctor._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    
    console.log(`\n=== DR. RICHARD JAMES NOW HAS ${allDoctorReviews.length} REVIEWS ===\n`);
    
    allDoctorReviews.forEach((review, index) => {
      console.log(`${index + 1}. ${review.user?.name || 'Unknown'} - ${review.rating}/5`);
      console.log(`   Comment: "${review.comment}"`);
      console.log(`   Created: ${review.createdAt}`);
      if (review.reply?.text) {
        console.log(`   Reply: "${review.reply.text}"`);
      }
      console.log('---');
    });
    
    // Update doctor's rating count
    const avgRating = allDoctorReviews.reduce((sum, r) => sum + r.rating, 0) / allDoctorReviews.length;
    await doctorModel.findByIdAndUpdate(doctor._id, {
      averageRating: avgRating.toFixed(1),
      ratingCount: allDoctorReviews.length
    });
    
    console.log(`\nUpdated doctor profile:`);
    console.log(`Average Rating: ${avgRating.toFixed(1)}`);
    console.log(`Total Reviews: ${allDoctorReviews.length}`);
    
  } catch (error) {
    console.error('Error fixing reviews:', error);
  } finally {
    mongoose.connection.close();
  }
};

fixDoctorReviews();
