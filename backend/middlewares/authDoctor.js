import jwt from "jsonwebtoken";
import doctorModel from "../models/doctorModel.js";
// doctor authentication middleware
const authDoctor = async (req, res, next) => {
  try {

    const { dtoken } = req.headers;
    console.log("AuthDoctor - dtoken:", dtoken ? "PRESENT" : "MISSING");
    
    if (!dtoken) {
      return res.json({
        success: false,
        message: "Not Authorized Login Again",
      });
    }
    const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);
    console.log("AuthDoctor - token_decode.id:", token_decode.id);
      
    const doctor = await doctorModel.findById(token_decode.id);
    console.log("AuthDoctor - doctor found:", doctor ? "YES" : "NO");

    if (!doctor) {
      return res.json({
        success: false,
        message: "Not Authorized. Doctor does not exist.",
      });
    }

    
    if (doctor.status === "suspended") {
      return res.json({
        success: false,
        message: "Your account has been suspended. Contact admin.",
      });
    }
    req.body.docId = token_decode.id;
    req.userId = token_decode.id; // Add for consistency
    console.log("AuthDoctor - Set req.userId to:", req.userId);
    next();
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default authDoctor;
