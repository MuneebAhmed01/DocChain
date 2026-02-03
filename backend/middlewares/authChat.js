import jwt from "jsonwebtoken";
import doctorModel from "../models/doctorModel.js";
import userModel from "../models/userModel.js";

// Chat authentication middleware that handles both user and doctor tokens
const authChat = async (req, res, next) => {
  try {
    const { authorization, dtoken, atoken } = req.headers;
    let token = null;
    let userType = 'user';

    // Check for doctor token first
    if (dtoken) {
      token = dtoken;
      userType = 'doctor';
    } else if (atoken) {
      token = atoken;
      userType = 'user';
    } else if (authorization) {
      // Handle Bearer token
      const authHeader = authorization.split(' ');
      if (authHeader[0] === 'Bearer' && authHeader[1]) {
        token = authHeader[1];
        userType = 'user'; // Default to user for Bearer tokens
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token_decode = jwt.verify(token, process.env.JWT_SECRET);
    
    if (userType === 'doctor') {
      const doctor = await doctorModel.findById(token_decode.id);
      if (!doctor) {
        return res.status(403).json({
          success: false,
          message: "Doctor not found",
        });
      }
      if (doctor.status === "suspended") {
        return res.status(403).json({
          success: false,
          message: "Doctor account suspended",
        });
      }
      req.user = {
        userId: token_decode.id,
        type: 'doctor',
        email: doctor.email,
        name: doctor.name
      };
    } else {
      const user = await userModel.findById(token_decode.id || token_decode.userId);
      if (!user) {
        return res.status(403).json({
          success: false,
          message: "User not found",
        });
      }
      req.user = {
        userId: user._id.toString(),
        type: 'user',
        email: user.email,
        name: user.name
      };
    }

    next();
  } catch (error) {
    console.log("Chat auth error:", error);
    res.status(403).json({ 
      success: false, 
      message: "Invalid token" 
    });
  }
};

export default authChat;
