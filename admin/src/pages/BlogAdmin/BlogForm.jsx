import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export function BlogForm({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    author: "",
    tags: "",
    imageUrl: "",
    published: true,
  });

  useEffect(() => {
    if (id && id !== "new") {
      axios
        .get(`http://localhost:4000/api/blogs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const d = res.data;
          setForm({
            ...d,
            tags: (d.tags || []).join(","),
          });
        })
        .catch((err) => {
          console.log("FETCH ERROR:", err);
          alert("Error loading blog");
        });
    }
  }, [id, token]);

  const save = async (e) => {
    e.preventDefault();

    const payload = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      author: form.author,
      tags: form.tags.split(",").map((t) => t.trim()),
      imageUrl: form.imageUrl,
      published: form.published,
    };

    try {
      if (id && id !== "new") {
        await axios.put(`http://localhost:4000/api/blogs/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("http://localhost:4000/api/blogs", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      navigate("/admin/blogs");
    } catch (err) {
      console.error("SAVE ERROR:", err);
      alert("Error saving blog");
    }
  };

  // Common Tailwind classes for inputs
  const inputStyle = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all";

  return (
    <div className="p-2 sm:p-6 max-w-4xl mx-auto">
      <form onSubmit={save} className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {id === "new" ? "Create New Post" : "Edit Post"}
          </h2>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Title and Author Group */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Post Title</label>
              <input
                className={inputStyle}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="The Future of Health..."
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Author Name</label>
              <input
                className={inputStyle}
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="Dr. Smith"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-600">Short Excerpt</label>
            <input
              className={inputStyle}
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="A brief summary for the list view..."
            />
          </div>

          {/* Image URL & Tags Group */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Cover Image URL</label>
              <input
                className={inputStyle}
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Tags</label>
              <input
                className={inputStyle}
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="Health, Technology, Lifestyle"
              />
            </div>
          </div>

          {/* Content Editor */}
          <div className="space-y-1 pb-12 sm:pb-8">
            <label className="text-sm font-semibold text-gray-600">Full Content</label>
            <div className="h-64 sm:h-80">
              <ReactQuill
                theme="snow"
                value={form.content}
                onChange={(val) => setForm({ ...form, content: val })}
                className="h-full bg-white"
              />
            </div>
          </div>

          <hr className="mt-8" />

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="w-5 h-5 rounded accent-primary cursor-pointer"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">
                Publish this post immediately
              </span>
            </label>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate("/admin/blogs")}
                className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-8 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-opacity-90 rounded-lg shadow-sm transition-all active:scale-95"
              >
                Save Post
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
