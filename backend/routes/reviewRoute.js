import express from "express";
import {
  getDoctorReviews,
  addReviewReply,
  updateReviewReply,
  deleteReviewReply
} from "../controllers/reviewController.js";
import authDoctorMiddleware from "../middlewares/authDoctor.js";

const reviewRouter = express.Router();

// Get all reviews for the authenticated doctor
reviewRouter.get("/doctor/reviews", authDoctorMiddleware, getDoctorReviews);

// Add reply to a review
reviewRouter.post("/review/reply", authDoctorMiddleware, addReviewReply);

// Update reply to a review
reviewRouter.put("/review/reply", authDoctorMiddleware, updateReviewReply);

// Delete reply from a review
reviewRouter.delete("/review/reply/:reviewId", authDoctorMiddleware, deleteReviewReply);

export default reviewRouter;
