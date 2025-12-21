import PendingDoctor from "../models/pendingDoctorModel.js";
import bcrypt from "bcrypt";
import Doctor from "../models/doctorModel.js";
export const joinDoctorRequest = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      experience,
      fee,
      specialty,
      about,
      education,
      city,
      address1,
      address2,
    } = req.body;

    // prevent duplicate requests
    const existing = await PendingDoctor.findOne({ email });
    if (existing) {
      return res.json({
        success: false,
        message: "You have already submitted a request",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const pendingDoctor = await PendingDoctor.create({
      fullName,
      email,
      password: hashedPassword,
      experience,
      fee,
    
      specialty,
      about,
      education,
      city,
      address1,
      address2,
      profilePic: req.profilePic,
      degreeProof: req.degreeProof,
    });

    res.json({
      success: true,
      message: "Doctor request submitted for approval",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ ADD THIS FUNCTION (YOU WERE MISSING IT)
export const getPendingDoctors = async (req, res) => {
  try {
    const doctors = await PendingDoctor.find().select("-password");
    console.log("PENDING DOCTOR:", PendingDoctor);
    res.json({ success: true, doctors });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

//approvePendingDoctor api
export const approvePendingDoctor = async (req, res) => {
  console.log("✅ APPROVE API HIT", req.params.id);

  try {
    const { id } = req.params;

    const pendingDoctor = await PendingDoctor.findById(id);
    if (!pendingDoctor) {
      return res.json({ success: false, message: "Request not found" });
    }

    const existingDoctor = await Doctor.findOne({ email: pendingDoctor.email });
    if (existingDoctor) {
      return res.json({
        success: false,
        message: "Doctor already exists",
      });
    }

   const imageUrl = pendingDoctor.profilePic?.url;

if (!imageUrl) {
  return res.json({
    success: false,
    message: "Profile image missing",
  });
}
console.log("PROFILE PIC:", pendingDoctor.profilePic);


    const doctor = await Doctor.create({
      name: pendingDoctor.fullName,
      email: pendingDoctor.email,
      password: pendingDoctor.password, // already hashed
      experience: pendingDoctor.experience,
      fees: pendingDoctor.fee,
      speciality: pendingDoctor.specialty,
      about: pendingDoctor.about,
      degree: pendingDoctor.education,
      city: pendingDoctor.city,
      image: imageUrl,
      address: {
        line1: pendingDoctor.address1,
        line2: pendingDoctor.address2,
      },
      date: new Date(),
    });

    await PendingDoctor.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Doctor approved successfully",
      doctor,
    });
  } catch (error) {
    console.error("❌ APPROVE ERROR:", error);
    res.json({ success: false, message: error.message });
  }
};


//reject api
export const rejectPendingDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const pendingDoctor = await PendingDoctor.findById(id);
    if (!pendingDoctor) {
      return res.json({ success: false, message: "Request not found" });
    }

    await PendingDoctor.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Doctor request rejected",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};