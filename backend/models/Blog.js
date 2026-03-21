import mongoose from 'mongoose';

const { Schema } = mongoose;

const BlogSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String },
    content: { type: String }, // store HTML or markdown
    author: { type: String },
    authorRole: {
      type: String,
      enum: ["admin", "doctor"],
      default: "admin",
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "doctor",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true,
    },
    tags: [{ type: String }],
    imageUrl: { type: String },
    published: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

BlogSchema.pre("save", function syncPublishedWithStatus(next) {
  this.published = this.status === "approved";
  next();
});

export default mongoose.model('Blog', BlogSchema);
