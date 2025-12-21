import doctorModel from "../models/doctorModel.js";
import bycrypt from "bcrypt";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import appointmentCompletedPatient from "../emailTemplates/appointmentCompletedPatient.js";
import doctorRegistered from "../emailTemplates/doctorRegistered.js";
import reviewModel from "../models/reviewModel.js";





const changeAvailability = async (req, res) => {
  try {
    const { docId } = req.body;
    const docData = await doctorModel.findById(docId);
    await doctorModel.findByIdAndUpdate(docId, {
      available: !docData.available,
    });
    res.json({ success: true, message: "Availability changed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select(["-password", "-email"]);

    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API for doctor Login
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const doctor = await doctorModel.findOne({ email });

    if (!doctor) {
      return res.json({ success: false, message: "Invalid credentials" });
    }
        // 🔴 BLOCK suspended accounts
    if (doctor.status === "suspended") {
      return res.json({
        success: false,
        message:
          "Your account has been suspended. Contact admin to reactivate.",
      });
    }

    const isMatch = await bycrypt.compare(password, doctor.password);

    if (isMatch) {
      const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get doctor appointments for doctor panel
const appointmentsDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    const appointments = await appointmentModel.find({ docId });

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to mark appointment completed for doctor panel
// doctorController.js
 const appointmentComplete = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appt = await appointmentModel.findById(appointmentId);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

    // Mark appointment as completed
    appt.isCompleted = true;
    await appt.save();
try {
  await appointmentCompletedPatient({
    patientName: appt.userData.name,
    patientEmail: appt.userData.email,
    doctorName: appt.docData.name,
    date: appt.slotDate,
    time: appt.slotTime,
  });
} catch (err) {
  console.error("Failed to send completed appointment email:", err);
}

    // Calculate earnings
    let earningsToAdd = appt.amount; // default full price

    if (appt.isPaid) {
      earningsToAdd = appt.amount * 0.9; // actual paid amount if online
    }

    // Update doctor earnings
    await doctorModel.findByIdAndUpdate(appt.docId, { $inc: { earnings: earningsToAdd } });

    res.json({ success: true, message: "Appointment completed and earnings updated" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// API to cancel appointment for doctor panel
const appointmentCancel = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        cancelled: true,
      });
      // Notify doctor about patient cancellation
try {
  await appointmentCancelledByPatientDoctor({
    patientName: appointmentData.userData.name,
    patientEmail: appointmentData.userData.email,
    doctorName: doctorData.name,
    doctorEmail: doctorData.email,
    date: appointmentData.slotDate,
    time: appointmentData.slotTime,
  });
} catch (err) {
  console.error("Failed to send doctor cancellation email:", err);
}

      return res.json({ success: true, message: "Appointment Cancelled" });
    } else {
      return res.json({ success: false, message: "Cancellation Failed" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
  try {
    const { docId } = req.body;
    const appointments = await appointmentModel.find({ docId });

    let earnings = 0;

    appointments.map((item) => {
      if (item.isCompleted || item.payment) {
        earnings += item.amount;
      }
    });

    let patients = [];

    appointments.map((item) => {
      if (!patients.includes(item.userId)) {
        patients.push(item.userId);
      }
    });

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patients.length,
      latestAppointments: appointments.reverse().slice(0, 5),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get doctor profile for Doctor panel
const doctorProfile = async (req, res) => {
  try {
    const { docId } = req.body;
    const profileData = await doctorModel.findById(docId).select("-password");

    res.json({ success: true, profileData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to update doctor profile data from Doctor panel
const updateDoctorProfile = async (req, res) => {
  try {
    const { docId, fees, address, available } = req.body;

    await doctorModel.findByIdAndUpdate(docId, { fees, address, available });

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
// ⭐ Get reviews for a doctor
const getDoctorReviews = async (req, res) => {
  try {
    const { docId } = req.body;

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

export {
  changeAvailability,
  doctorList,
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  doctorDashboard,
  doctorProfile,
  appointmentComplete,
  updateDoctorProfile,
  getDoctorReviews
};
