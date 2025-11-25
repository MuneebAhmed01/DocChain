import mongoose from 'mongoose';

const { Schema } = mongoose;

const BlogSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String },
    content: { type: String }, // store HTML or markdown
    author: { type: String },
    tags: [{ type: String }],
    imageUrl: { type: String },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Blog', BlogSchema);
