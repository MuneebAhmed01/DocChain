import React, { useState, useEffect } from "react";
import { X, Star, Send, Edit2, Trash2 } from "lucide-react";

const ReviewOverlay = ({
  isOpen,
  onClose,
  reviewsData,
  onAddReply,
  onUpdateReply,
  onDeleteReply,
}) => {
  const [replyTexts, setReplyTexts] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingReply, setEditingReply] = useState(null);

  // Reset reply states when overlay opens/closes
  useEffect(() => {
    if (!isOpen) {
      setReplyTexts({});
      setReplyingTo(null);
      setEditingReply(null);
    }
  }, [isOpen]);

  // Calculate summary from reviews
  const calculateSummary = (reviews) => {
    if (!reviews || reviews.length === 0) return null;

    const totalReviews = reviews.length;
    const averageRating = (
      reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
    ).toFixed(1);

    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      ratingCounts[review.rating]++;
    });

    return {
      totalReviews,
      averageRating: parseFloat(averageRating),
      ratingCounts,
    };
  };

  const summary = calculateSummary(reviewsData?.reviews);

  // Debug reviewsData
  useEffect(() => {
    console.log("ReviewOverlay received reviewsData:", reviewsData);
  }, [reviewsData]);

  if (!isOpen) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const handleReply = async (reviewId) => {
    const text = replyTexts[reviewId];
    if (!text || text.trim() === "") return;

    if (editingReply === reviewId) {
      await onUpdateReply(reviewId, text);
    } else {
      await onAddReply(reviewId, text);
    }

    setReplyTexts({ ...replyTexts, [reviewId]: "" });
    setReplyingTo(null);
    setEditingReply(null);
  };

  const handleEditReply = (reviewId, currentReplyText) => {
    setReplyTexts({ ...replyTexts, [reviewId]: currentReplyText });
    setEditingReply(reviewId);
    setReplyingTo(reviewId);
  };

  const handleDeleteReply = async (reviewId) => {
    if (window.confirm("Are you sure you want to delete this reply?")) {
      await onDeleteReply(reviewId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Overlay Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Patient Reviews
            </h2>
            {summary && (
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {summary.averageRating}
                  </span>
                  <div className="flex">
                    {renderStars(Math.round(summary.averageRating))}
                  </div>
                </div>
                <span className="text-gray-500">
                  ({summary.totalReviews} reviews)
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!reviewsData?.reviews || reviewsData.reviews.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">No reviews yet</div>
              <p className="text-gray-500 mt-2">
                Patients haven't left any reviews yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviewsData.reviews.map((review) => (
                <div key={review._id} className="bg-gray-50 rounded-xl p-6">
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                        {review.user?.image ? (
                          <img
                            src={review.user.image}
                            alt={review.user?.name || "Patient"}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500 font-semibold text-sm">
                            {review.user?.name?.charAt(0).toUpperCase() || "P"}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {review.user?.name || "Anonymous Patient"}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review Comment */}
                  {review.comment && (
                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {review.comment}
                    </p>
                  )}

                  {/* Doctor Reply Section */}
                  <div className="border-t border-gray-200 pt-4">
                    {review.reply?.text ? (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                DR
                              </span>
                            </div>
                            <span className="font-semibold text-blue-900">
                              Doctor Response
                            </span>
                            <span className="text-sm text-blue-700">
                              {formatDate(review.reply.createdAt)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleEditReply(review._id, review.reply.text)
                              }
                              className="p-1 hover:bg-blue-100 rounded transition-colors"
                              title="Edit reply"
                            >
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteReply(review._id)}
                              className="p-1 hover:bg-blue-100 rounded transition-colors"
                              title="Delete reply"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                        <p className="text-blue-900 leading-relaxed">
                          {review.reply.text}
                        </p>
                      </div>
                    ) : (
                      <div>
                        {replyingTo === review._id ? (
                          <div className="space-y-3">
                            <textarea
                              value={replyTexts[review._id] || ""}
                              onChange={(e) =>
                                setReplyTexts({
                                  ...replyTexts,
                                  [review._id]: e.target.value,
                                })
                              }
                              placeholder="Write your response to this review..."
                              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows="3"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReply(review._id)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                              >
                                <Send className="w-4 h-4" />
                                {editingReply === review._id
                                  ? "Update Reply"
                                  : "Send Reply"}
                              </button>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setEditingReply(null);
                                  setReplyTexts({
                                    ...replyTexts,
                                    [review._id]: "",
                                  });
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyingTo(review._id)}
                            className="flex items-center gap-2 px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            Reply
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewOverlay;
