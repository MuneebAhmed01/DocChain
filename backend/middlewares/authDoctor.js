import jwt from "jsonwebtoken";
import doctorModel from "../models/doctorModel.js";
// doctor authentication middleware
const authDoctor = async (req, res, next) => {
  try {

    const { dtoken } = req.headers;
    if (!dtoken) {
      return res.json({
        success: false,
        message: "Not Authorized Login Again",
      });
    }
    const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);
      
    const doctor = await doctorModel.findById(token_decode.id);

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
    next();
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default authDoctor;
