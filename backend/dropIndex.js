import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const dropPhoneIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    try {
      await usersCollection.dropIndex('phone_number_1');
      console.log('✅ Index "phone_number_1" dropped successfully');
    } catch (err) {
      if (err.message.includes('index not found')) {
        console.log('ℹ️ Index "phone_number_1" does not exist');
      } else {
        throw err;
      }
    }

    // Also check for sparse index
    try {
      await usersCollection.dropIndex('phone_number_1_sparse');
      console.log('✅ Index "phone_number_1_sparse" dropped successfully');
    } catch (err) {
      if (!err.message.includes('index not found')) {
        console.log('ℹ️ No sparse index found');
      }
    }

    await mongoose.disconnect();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

dropPhoneIndex();
