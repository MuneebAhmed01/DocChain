// routes/pendingDoctorRouter.js
import express from "express";
import { joinDoctorRequest, getPendingDoctors ,  approvePendingDoctor,
  rejectPendingDoctor} from "../controllers/pendingDoctorController.js";
import { upload, uploadDoctorDocuments } from "../middlewares/multer.js";
import authUser from "../middlewares/authUser.js";

const pendingDoctorRouter = express.Router();

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.json({ success: false, message: 'File size too large. Maximum size is 5MB.' });
    }
    return res.json({ success: false, message: 'File upload error: ' + err.message });
  } else if (err) {
    return res.json({ success: false, message: err.message });
  }
  next();
};

// Submit doctor join form - PUBLIC for new doctor registration
pendingDoctorRouter.post(
  "/join",
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "degreeProof", maxCount: 1 },
  ]),
  handleMulterError,
  uploadDoctorDocuments,
  joinDoctorRequest
);
pendingDoctorRouter.post("/approve/:id", approvePendingDoctor);
pendingDoctorRouter.post("/reject/:id", rejectPendingDoctor);


// Get all pending doctors (for admin panel)
pendingDoctorRouter.get("/", getPendingDoctors);

export default pendingDoctorRouter;
