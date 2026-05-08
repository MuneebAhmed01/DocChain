// routes/pendingDoctorRouter.js
import express from "express";
import { joinDoctorRequest, getPendingDoctors ,  approvePendingDoctor,
  rejectPendingDoctor} from "../controllers/pendingDoctorController.js";
import { upload, uploadDoctorDocuments } from "../middlewares/multer.js";
import authUser from "../middlewares/authUser.js";

const pendingDoctorRouter = express.Router();

// Submit doctor join form - PUBLIC for new doctor registration
pendingDoctorRouter.post(
  "/join",
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "degreeProof", maxCount: 1 },
  ]),
  uploadDoctorDocuments,
  joinDoctorRequest
);
pendingDoctorRouter.post("/approve/:id", approvePendingDoctor);
pendingDoctorRouter.post("/reject/:id", rejectPendingDoctor);


// Get all pending doctors (for admin panel)
pendingDoctorRouter.get("/", getPendingDoctors);

export default pendingDoctorRouter;
