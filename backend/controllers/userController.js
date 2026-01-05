import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import appointmentBookedPatient from "../emailTemplates/appointmentBookedPatient.js";
import appointmentBookedDoctor from "../emailTemplates/appointmentBookedDoctor.js";
import appointmentCancelledPatient from "../emailTemplates/appointmentCancelledPatient.js";
import appointmentCancelledDoctor from "../emailTemplates/appointmentCancelledDoctor.js";
import appointmentReminder from "../emailTemplates/appointmentReminder.js";
import reviewModel from "../models/reviewModel.js";
import sendEmail from "../utils/sendEmail.js";




const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Enter a valid email" });
    }

    // Validate strong password
    if (password.length < 8) {
      return res.json({ success: false, message: "Enter a strong password (min 8 chars)" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUser = new userModel({ name, email, password: hashedPassword });
    const user = await newUser.save();

    // Generate JWT with expiration
    const token = jwt.sign(
      { userId: user._id, name: user.name, email: user.email }, // payload
      process.env.JWT_SECRET,
      { expiresIn: "30d" } // token valid for 7 days
    );

    // Return token to frontend
    res.json({ success: true, token });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default registerUser;


// API for user login
const loginUser = async (req, res) => {
  try {
    
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });
    
    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (isMatch) {
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log("Signing with JWT_SECRET:", process.env.JWT_SECRET);
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get user profile data
// const getProfile = async (req, res) => {
//   try {
//     const { userId } = req.body;
//     const useData = await userModel.findById(userId).select("-password");

//     res.json({ success: true, user: useData });
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: error.message });
//   }
// };

const getProfile = async (req, res) => {
  try {
    console.log("req.user:", req.user); // <--- log token payload

    const userId = req.user.userId; // your token uses 'userId'
    if (!userId) {
      console.log("No userId in token!");
      return res.status(400).json({ success: false, message: "User ID missing" });
    }

    const userData = await userModel.findById(userId).select("-password");
    if (!userData) {
      console.log("User not found in DB for id:", userId);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("Fetched user data:", userData);
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error("getProfile error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
const { name, phone, address, dob, gender } = req.body;

    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing" });
    }

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    });

    if (imageFile) {
      // upload image to cloudinary
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      const imageURL = imageUpload.secure_url;

      await userModel.findByIdAndUpdate(userId, { image: imageURL });
    }

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to book appointment
const bookAppointment = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {  docId, slotDate, slotTime } = req.body;

    const docData = await doctorModel.findById(docId).select("-password");

  // / 🔴 NEW: block suspended doctors FIRST
if (docData.status === "suspended") {
  return res.json({
    success: false,
    message: "This doctor has been suspended",
  });
}

// existing availability logic (unchanged)
if (!docData.available) {
  return res.json({
    success: false,
    message: "Doctor not available",
  });
}

    let slots_booked = docData.slots_booked;

    // checking for slot availability
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "Slot not available" });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [];
      slots_booked[slotDate].push(slotTime);
    }

    const userData = await userModel.findById(userId).select("-password");

    delete docData.slots_booked;

    const appointmentData = {
      userId,
      docId,
      userData,
      docData,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
    };

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();
    // Send confirmation email to patient
// await appointmentBookedPatient({
//   patientName: userData.name,
//   patientEmail: userData.email,
//   doctorName: docData.name,
//   doctorEmail: docData.email,
//   date: slotDate,
//   time: slotTime,
// });

// // Notify doctor
// await appointmentBookedDoctor({
//   patientName: userData.name,
//   patientEmail: userData.email,
//   doctorName: docData.name,
//   doctorEmail: docData.email,
//   date: slotDate,
//   time: slotTime,
// });
setTimeout(() => {
  appointmentReminder({
    patientName: userData.name,
    patientEmail: userData.email,
    doctorName: docData.name,
    date: slotDate,
    time: slotTime,
  }).catch(err => console.error("Failed to send reminder email:", err));
}, 60000); // 60000 ms = 1 minute

    // save new slots data in docData
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    res.json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
  try {
   const userId = req.user.userId;
    const appointments = await appointmentModel.find({ userId });

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    // userId now comes from authUser middleware
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user from token",
      });
    }

    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // verify appointment belongs to logged in user
    if (appointmentData.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized action",
      });
    }

    // cancel appointment
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });

    // release doctor slot
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);

    let slots_booked = doctorData.slots_booked;

    slots_booked[slotDate] = slots_booked[slotDate].filter(
      (e) => e !== slotTime
    );

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });
// // Send cancellation email to patient

// appointmentCancelledPatient({
//   patientName: appointmentData.userData.name, patientEmail: appointmentData.userData.email,
//   doctorName: doctorData.name,
//   doctorEmail: doctorData.email,
//   date: slotDate,
//   time: slotTime,
// });

// // Notify doctor
// appointmentCancelledDoctor({
//   patientName: appointmentData.userData.name,
//   patientEmail: appointmentData.userData.email,
//   doctorName: doctorData.name,
//   doctorEmail: doctorData.email,
//   date: slotDate,
//   time: slotTime,
// });

return res.json({
      success: true,
      message: "Appointment Cancelled",
    });

  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};
// ⭐ Rate doctor after completed appointment
export const rateDoctor = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { appointmentId, rating, comment } = req.body;

    if (!appointmentId || !rating) {
      return res.json({ success: false, message: "Rating is required" });
    }

    if (rating < 1 || rating > 5) {
      return res.json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const appt = await appointmentModel.findById(appointmentId);
    if (!appt) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // ✅ Must belong to this user
    if (appt.userId !== userId) {
      return res.json({ success: false, message: "Not authorized" });
    }

    // ✅ Must be completed
    if (!appt.isCompleted) {
      return res.json({ success: false, message: "Appointment not completed yet" });
    }

    // ✅ Must not be rated already
    if (appt.isRated) {
      return res.json({ success: false, message: "You already rated this appointment" });
    }

    // Create review
    const review = await reviewModel.create({
      doctor: appt.docId,
      user: userId,
      appointment: appt._id,
      rating,
      comment: comment || "",
    });

    // ⭐ Update doctor's average rating
    const doctor = await doctorModel.findById(appt.docId);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const newCount = doctor.ratingCount + 1;
    const newAvg =
      (doctor.averageRating * doctor.ratingCount + rating) / newCount;

    doctor.ratingCount = newCount;
    doctor.averageRating = Number(newAvg.toFixed(1));
    await doctor.save();

    // ✅ Mark appointment as rated
    appt.isRated = true;
    await appt.save();

    res.json({ success: true, message: "Thanks for your review!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// ⭐ Get reviews for a doctor (user side)
export const getDoctorReviewsUser = async (req, res) => {
  try {
    const { docId } = req.params;

    const reviews = await reviewModel
      .find({ doctor: docId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, reviews });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
const sendContactEmail = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, problem } = req.body;

    // Validation
    if (!firstName || !lastName || !phone || !email || !problem) {
      return res.json({
        success: false,
        message: "All fields are required",
      });
    }

    const fullName = `${firstName} ${lastName}`;
    const adminEmail = process.env.ADMIN_COMPLAINT_EMAIL;

    const emailBody = `
📩 New Contact Us Submission

Name: ${fullName}
Email: ${email}
Phone: ${phone}

Problem:
${problem}
    `;

    await sendEmail(
      adminEmail,
      "New Contact Us Message - DocChain",
      emailBody
    );

    res.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Contact email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};


export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  sendContactEmail
};
