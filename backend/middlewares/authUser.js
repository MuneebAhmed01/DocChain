
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
  const jwtSecret = (process.env.JWT_SECRET || "").trim();
  if (!jwtSecret) {
    console.error("❌ JWT_SECRET is not defined in environment variables!");
    return res.status(500).json({
      success: false,
      message: "Server configuration error",
    });
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.trim()) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
    return res.status(401).json({
      success: false,
      message: "Malformed token",
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);

    // Support both payload shapes just in case
    const userId = decoded?.userId ?? decoded?.id;

    req.user = {
      userId,
      email: decoded?.email || null,
    };

    return next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    // console.log("JWT_SECRET =", process.env.JWT_SECRET);
    console.log("Using JWT_SECRET:", jwtSecret);
console.log("Received token:", token);


    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}
