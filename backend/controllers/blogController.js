import mongoose from "mongoose";
import slugify from "slugify";
import Blog from "../models/Blog.js";

async function generateUniqueSlug(title, excludeId = null) {
  const baseSlug = slugify(title || Date.now().toString(), {
    lower: true,
    strict: true,
  });

  let slug = baseSlug;
  let counter = 1;

  while (
    await Blog.findOne(
      excludeId
        ? { slug, _id: { $ne: excludeId } }
        : { slug }
    )
  ) {
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function buildBlogPayload(body) {
  return {
    title: body.title,
    excerpt: body.excerpt,
    content: body.content,
    author: body.author,
    tags: normalizeTags(body.tags),
    imageUrl: body.imageUrl,
  };
}

// Public: only approved blogs
export const getBlogs = async (_req, res) => {
  try {
    const blogs = await Blog.find({ status: "approved" }).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (_err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: list all blogs
export const getAllBlogsAdmin = async (_req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (_err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: list pending blogs
export const getPendingBlogsAdmin = async (_req, res) => {
  try {
    const blogs = await Blog.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (_err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Public details: only approved blog by id/slug
export const getBlogById = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }], status: "approved" }
      : { slug: idOrSlug, status: "approved" };

    const blog = await Blog.findOne(query);

    if (!blog) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(blog);
  } catch (_err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin details by id (can fetch pending/rejected too)
export const getBlogByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(blog);
  } catch (_err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin create (approved by default)
export const createBlog = async (req, res) => {
  try {
    const payload = buildBlogPayload(req.body);
    if (!payload.title || !payload.content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const slug = await generateUniqueSlug(payload.title);

    const blog = await Blog.create({
      ...payload,
      slug,
      authorRole: "admin",
      doctorId: null,
      status: "approved",
      published: true,
    });

    res.status(201).json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Doctor create (always pending)
export const createDoctorBlog = async (req, res) => {
  try {
    const payload = buildBlogPayload(req.body);
    if (!payload.title || !payload.content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const slug = await generateUniqueSlug(payload.title);

    const blog = await Blog.create({
      ...payload,
      slug,
      authorRole: "doctor",
      doctorId: req.userId,
      status: "pending",
      published: false,
    });

    res.status(201).json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin update blog content
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const update = buildBlogPayload(req.body);

    if (req.body.title) {
      update.slug = await generateUniqueSlug(req.body.title, id);
    }

    const blog = await Blog.findByIdAndUpdate(id, update, { new: true });

    if (!blog) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(blog);
  } catch (_err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin approve/reject
export const updateBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      {
        status,
        published: status === "approved",
      },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(blog);
  } catch (_err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin delete
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Blog.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ message: "Deleted successfully" });
  } catch (_err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Doctor: get their own blogs (all statuses)
export const getDoctorBlogs = async (req, res) => {
  try {
    const doctorId = req.userId;
    const blogs = await Blog.find({ doctorId }).sort({ createdAt: -1 });
    res.json({ success: true, blogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Doctor: get approved blogs
export const getDoctorApprovedBlogs = async (req, res) => {
  try {
    const doctorId = req.userId;
    const blogs = await Blog.find({ 
      doctorId, 
      status: "approved" 
    }).sort({ createdAt: -1 });
    res.json({ success: true, blogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Doctor: get rejected blogs
export const getDoctorRejectedBlogs = async (req, res) => {
  try {
    const doctorId = req.userId;
    const blogs = await Blog.find({ 
      doctorId, 
      status: "rejected" 
    }).sort({ createdAt: -1 });
    res.json({ success: true, blogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Doctor: edit their own blog (sets status to pending for re-approval)
export const updateDoctorBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.userId;

    // Check if blog belongs to doctor
    const blog = await Blog.findOne({ _id: id, doctorId });
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    const update = buildBlogPayload(req.body);

    // Reset to pending for re-approval when edited
    update.status = "pending";
    update.published = false;

    if (req.body.title) {
      update.slug = await generateUniqueSlug(req.body.title, id);
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, update, { new: true });
    res.json({ success: true, message: "Blog updated. Awaiting admin approval.", blog: updatedBlog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Doctor: delete their own blog
export const deleteDoctorBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.userId;

    // Check if blog belongs to doctor
    const blog = await Blog.findOne({ _id: id, doctorId });
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    await Blog.findByIdAndDelete(id);
    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
