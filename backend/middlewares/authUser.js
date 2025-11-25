
// export default function authUser(req, res, next) {
  //   const authHeader = req.headers.authorization || req.headers.Authorization;
  
  //   console.log("Received Authorization header:", authHeader);
  
  //   if (!authHeader)
  //     return res.status(401).json({ success: false, message: 'No token provided' });
  
  //   const parts = authHeader.split(' ');
  //   const token = parts.length === 2 ? parts[1] : parts[0];
  //   const secret = (process.env.JWT_SECRET || '').trim();
  
//   try {
//     const decoded = jwt.verify(token, secret);

//     // FIX 🔥
//     req.body.userId = decoded.id;   

//     next();
//   } catch (err) {
  //     return res.status(401).json({ success: false, message: 'Invalid token' });
  //   }
  // }
import jwt from "jsonwebtoken";

export default function authUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Check header existence
    if (!authHeader || !authHeader.trim()) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Validate Bearer structure
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Malformed token",
      });
    }

    const token = parts[1];

    // JWT Secret check
    const secret = (process.env.JWT_SECRET || "").trim();
    if (!secret) {
      console.error("❌ JWT_SECRET is not defined in environment variables!");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, secret);

    // Save user info for next middleware
    req.user = {
      userId: decoded.userId,
      email: decoded.email || null,
    };

    return next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}
