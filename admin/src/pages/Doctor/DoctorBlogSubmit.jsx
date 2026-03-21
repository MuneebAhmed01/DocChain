import React, { useContext, useState } from "react";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";

export default function DoctorBlogSubmit() {
  const { backendUrl, dToken } = useContext(DoctorContext);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    author: "",
    tags: "",
    imageUrl: "",
  });

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      await axios.post(
        `${backendUrl}/api/blogs/doctor`,
        {
          title: form.title,
          excerpt: form.excerpt,
          content: form.content,
          author: form.author,
          tags: form.tags,
          imageUrl: form.imageUrl,
        },
        {
          headers: { dToken },
        }
      );

      toast.success("Blog submitted for admin approval");
      setForm({
        title: "",
        excerpt: "",
        content: "",
        author: "",
        tags: "",
        imageUrl: "",
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit blog");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-2 sm:p-6 max-w-4xl mx-auto">
      <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Submit Blog</h2>
          <p className="text-sm text-gray-500 mt-1">Your blog will be reviewed by admin before publishing.</p>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Post Title</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Author Name</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-600">Short Excerpt</label>
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Cover Image URL</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Tags</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="health, wellness, prevention"
              />
            </div>
          </div>

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
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg shadow-sm disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit For Review"}
          </button>
        </div>
      </form>
    </div>
  );
}
