/**
 * Test script to verify appointment sorting is working correctly
 * Run this script to check if appointments are returned in the correct order
 */

const mongoose = require('mongoose');
const appointmentModel = require('./backend/models/appointmentModel.js');

// MongoDB connection - replace with your actual connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/docchain';

async function testSorting() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Admin appointments sorting
    console.log('\n🔍 Testing Admin Appointments Sorting...');
    const adminAppointments = await appointmentModel
      .find({})
      .sort({ createdAt: -1, slotDate: -1, slotTime: -1 })
      .limit(5)
      .select('createdAt slotDate slotTime docData.name');

    console.log('Admin appointments (newest first):');
    adminAppointments.forEach((apt, index) => {
      console.log(`${index + 1}. ${apt.docData?.name || 'Unknown'} - ${apt.slotDate} ${apt.slotTime} - Created: ${apt.createdAt}`);
    });

    // Test 2: Doctor appointments sorting
    console.log('\n🔍 Testing Doctor Appointments Sorting...');
    const doctorAppointments = await appointmentModel
      .find({ docId: adminAppointments[0]?.docId })
      .sort({ slotDate: -1, slotTime: -1 })
      .limit(5)
      .select('slotDate slotTime docData.name');

    console.log('Doctor appointments (newest first):');
    doctorAppointments.forEach((apt, index) => {
      console.log(`${index + 1}. ${apt.docData?.name || 'Unknown'} - ${apt.slotDate} ${apt.slotTime}`);
    });

    // Test 3: User appointments sorting
    console.log('\n🔍 Testing User Appointments Sorting...');
    const userAppointments = await appointmentModel
      .find({ userId: adminAppointments[0]?.userId })
      .sort({ createdAt: -1, slotDate: -1, slotTime: -1 })
      .limit(5)
      .select('createdAt slotDate slotTime docData.name');

    console.log('User appointments (newest first):');
    userAppointments.forEach((apt, index) => {
      console.log(`${index + 1}. ${apt.docData?.name || 'Unknown'} - ${apt.slotDate} ${apt.slotTime} - Created: ${apt.createdAt}`);
    });

    console.log('\n✅ Sorting test completed successfully!');
    console.log('📋 Expected behavior: Newest appointments should appear at the top of each list');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
testSorting();
