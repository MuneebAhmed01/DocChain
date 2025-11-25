import Blog from "../models/Blog.js";
import slugify from "slugify";

// Create a new blog
export const createBlog = async (req, res) => {
  try {
    const { title, excerpt, content, author, tags, imageUrl, published } = req.body;

    const baseSlug = slugify(title || Date.now().toString(), { lower: true, strict: true });
    let slug = baseSlug;

    // Ensure unique slug
    let counter = 1;
    while (await Blog.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const blog = await Blog.create({ title, slug, excerpt, content, author, tags, imageUrl, published });
    res.status(201).json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all blogs
export const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get blog by ID or slug
export const getBlogById = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    const blog = await Blog.findOne({
      $or: [{ _id: idOrSlug }, { slug: idOrSlug }]
    });

    if (!blog) return res.status(404).json({ message: "Not found" });

    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update blog
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    if (update.title) {
      update.slug = slugify(update.title, { lower: true, strict: true });
    }

    const blog = await Blog.findByIdAndUpdate(id, update, { new: true });

    if (!blog) return res.status(404).json({ message: "Not found" });

    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete blog
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Blog.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
