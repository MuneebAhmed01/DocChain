import jwt from "jsonwebtoken";

export default function authAdmin(req, res, next) {
  console.log("AUTH ADMIN HIT");

  // Accept BOTH headers so nothing else breaks
  const authHeader = req.headers.authorization || req.headers.atoken || req.headers.aToken;

  console.log("AUTH HEADER RAW:", authHeader);

  if (!authHeader) {
    return res.status(401).json({ message: "Not Authorized - No Token" });
  }

  // Extract token if it's "Bearer xxxxx"
  let token = authHeader;

  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  console.log("TOKEN RECEIVED:", token);

  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // your normal admin check
    if (decoded.email !== "admin@gmail.com") {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(403).json({ message: "Invalid token" });
  }
}
