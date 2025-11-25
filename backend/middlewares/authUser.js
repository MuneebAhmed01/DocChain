
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
 import jwt from 'jsonwebtoken';

export default function authUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader.trim() === '') {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ success: false, message: 'Malformed token' });
    }

    const token = parts[1];
    const secret = (process.env.JWT_SECRET || '').trim();

    if (!secret) {
      console.error('JWT_SECRET is not defined!');
      return res.status(500).json({ success: false, message: 'Server misconfiguration' });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // decoded should have userId or email
    next();

  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}
