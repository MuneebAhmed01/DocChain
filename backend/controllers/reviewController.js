import reviewModel from "../models/reviewModel.js";
import doctorModel from "../models/doctorModel.js";
import userModel from "../models/userModel.js";

// Get all reviews for a doctor
export const getDoctorReviews = async (req, res) => {
  try {
    const doctorId = req.body.docId; // From auth middleware
    
    if (!doctorId) {
      return res.status(400).json({ success: false, message: "Doctor ID required" });
    }

    const reviews = await reviewModel
      .find({ doctor: doctorId })
      .populate({
        path: 'user',
        select: 'name image'
      })
      .populate({
        path: 'appointment',
        select: 'slotDate'
      })
      .sort({ createdAt: -1 });

    // Calculate average rating
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
      : 0;

    // Count ratings by star
    const ratingCounts = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };
    
    reviews.forEach(review => {
      ratingCounts[review.rating]++;
    });

    res.status(200).json({
      success: true,
      data: {
        reviews,
        summary: {
          totalReviews,
          averageRating: parseFloat(averageRating),
          ratingCounts
        }
      }
    });

  } catch (error) {
    console.error("Error fetching doctor reviews:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Add reply to a review
export const addReviewReply = async (req, res) => {
  try {
    const doctorId = req.body.docId;
    const { reviewId, replyText } = req.body;

    if (!reviewId || !replyText || replyText.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: "Review ID and reply text are required" 
      });
    }

    // Find the review and verify ownership
    const review = await reviewModel.findOne({ 
      _id: reviewId, 
      doctor: doctorId 
    });

    if (!review) {
      return res.status(404).json({ 
        success: false, 
        message: "Review not found or you don't have permission to reply" 
      });
    }

    // Update the review with reply
    review.reply = {
      text: replyText.trim(),
      createdAt: new Date()
    };

    await review.save();

    // Return updated review with populated data
    const updatedReview = await reviewModel
      .findById(reviewId)
      .populate({
        path: 'user',
        select: 'name image'
      })
      .populate({
        path: 'appointment',
        select: 'slotDate'
      });

    res.status(200).json({
      success: true,
      message: "Reply added successfully",
      data: updatedReview
    });

  } catch (error) {
    console.error("Error adding review reply:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update reply to a review
export const updateReviewReply = async (req, res) => {
  try {
    const doctorId = req.body.docId;
    const { reviewId, replyText } = req.body;

    if (!reviewId || !replyText || replyText.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: "Review ID and reply text are required" 
      });
    }

    // Find the review and verify ownership
    const review = await reviewModel.findOne({ 
      _id: reviewId, 
      doctor: doctorId 
    });

    if (!review) {
      return res.status(404).json({ 
        success: false, 
        message: "Review not found or you don't have permission to edit this reply" 
      });
    }

    // Update the reply
    review.reply = {
      text: replyText.trim(),
      createdAt: new Date()
    };

    await review.save();

    // Return updated review with populated data
    const updatedReview = await reviewModel
      .findById(reviewId)
      .populate({
        path: 'user',
        select: 'name image'
      })
      .populate({
        path: 'appointment',
        select: 'slotDate'
      });

    res.status(200).json({
      success: true,
      message: "Reply updated successfully",
      data: updatedReview
    });

  } catch (error) {
    console.error("Error updating review reply:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete reply from a review
export const deleteReviewReply = async (req, res) => {
  try {
    const doctorId = req.body.docId;
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.status(400).json({ 
        success: false, 
        message: "Review ID is required" 
      });
    }

    // Find the review and verify ownership
    const review = await reviewModel.findOne({ 
      _id: reviewId, 
      doctor: doctorId 
    });

    if (!review) {
      return res.status(404).json({ 
        success: false, 
        message: "Review not found or you don't have permission to delete this reply" 
      });
    }

    // Remove the reply
    review.reply = {
      text: "",
      createdAt: null
    };

    await review.save();

    res.status(200).json({
      success: true,
      message: "Reply deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting review reply:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
