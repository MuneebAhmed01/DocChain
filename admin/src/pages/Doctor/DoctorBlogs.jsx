import React, { useContext, useEffect, useRef, useState } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const Spinner = ({ color = "white" }) => (
  <svg className={`animate-spin h-4 w-4 inline-block text-${color}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
  </svg>
);

export default function DoctorBlogs() {
  const {
    dToken,
    backendUrl,
    allBlogs,
    getDoctorAllBlogs,
    deleteDoctorBlog,
    updateDoctorBlog,
  } = useContext(DoctorContext);

  const [blogs, setBlogs] = useState([]);
  const [filter, setFilter] = useState("all"); // all, approved, rejected
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    author: "",
    tags: "",
    imageUrl: "",
  });

  const [loadingMap, setLoadingMap] = useState({});
  const lockRef = useRef({});

  useEffect(() => {
    if (dToken) {
      getDoctorAllBlogs();
    }
  }, [dToken]);

  const [viewingId, setViewingId] = useState(null);
  const viewingBlog = blogs.find((b) => b._id === viewingId);

  useEffect(() => {
    let filtered = allBlogs;
    if (filter === "approved") {
      filtered = allBlogs.filter((blog) => blog.status === "approved");
    } else if (filter === "rejected") {
      filtered = allBlogs.filter((blog) => blog.status === "rejected");
    }
    setBlogs(filtered);
  }, [allBlogs, filter]);

  const handleDelete = async (blogId) => {
    if (lockRef.current[blogId]) return;
    if (window.confirm("Are you sure you want to delete this blog?")) {
      lockRef.current[blogId] = true;
      setLoadingMap((prev) => ({ ...prev, [blogId]: "delete" }));
      try {
        await deleteDoctorBlog(blogId);
      } finally {
        lockRef.current[blogId] = false;
        setLoadingMap((prev) => ({ ...prev, [blogId]: null }));
      }
    }
  };

  const handleEditClick = (blog) => {
    setEditingId(blog._id);
    setEditForm({
      title: blog.title,
      excerpt: blog.excerpt,
      content: blog.content,
      author: blog.author,
      tags: Array.isArray(blog.tags) ? blog.tags.join(", ") : blog.tags,
      imageUrl: blog.imageUrl,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (lockRef.current[editingId]) return;
    
    lockRef.current[editingId] = true;
    setLoadingMap((prev) => ({ ...prev, [editingId]: "edit" }));
    try {
      await updateDoctorBlog(editingId, editForm);
      setEditingId(null);
      setEditForm({
        title: "",
        excerpt: "",
        content: "",
        author: "",
        tags: "",
        imageUrl: "",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update blog");
    } finally {
      lockRef.current[editingId] = false;
      setLoadingMap((prev) => ({ ...prev, [editingId]: null }));
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({
      title: "",
      excerpt: "",
      content: "",
      author: "",
      tags: "",
      imageUrl: "",
    });
  };

  return (
    <div className="p-2 sm:p-6 max-w-6xl mx-auto">
      {/* Blog View Modal */}
      {viewingBlog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                {viewingBlog.title}
              </h2>
              <button
                onClick={() => setViewingId(null)}
                className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {viewingBlog.imageUrl && (
                <img
                  src={viewingBlog.imageUrl}
                  alt={viewingBlog.title}
                  className="w-full h-96 object-cover rounded-lg mb-6"
                />
              )}
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  By {viewingBlog.author} •{" "}
                  {new Date(viewingBlog.createdAt).toLocaleDateString()}
                </p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    viewingBlog.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : viewingBlog.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {viewingBlog.status.charAt(0).toUpperCase() +
                    viewingBlog.status.slice(1)}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                {viewingBlog.excerpt}
              </p>
              <div
                className="prose prose-sm max-w-none mb-6"
                dangerouslySetInnerHTML={{ __html: viewingBlog.content }}
              />
              {viewingBlog.tags && viewingBlog.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {viewingBlog.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Blogs</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your blog posts - view approved, rejected, edit, and delete
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300"
          }`}
        >
          All Blogs ({allBlogs.length})
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === "approved"
              ? "bg-green-600 text-white"
              : "bg-white text-gray-700 border border-gray-300"
          }`}
        >
          Approved ({allBlogs.filter((b) => b.status === "approved").length})
        </button>
        <button
          onClick={() => setFilter("rejected")}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === "rejected"
              ? "bg-red-600 text-white"
              : "bg-white text-gray-700 border border-gray-300"
          }`}
        >
          Rejected ({allBlogs.filter((b) => b.status === "rejected").length})
        </button>
      </div>

      {/* Blogs List */}
      {blogs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">No blogs found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {blogs.map((blog) => (
            <div key={blog._id}>
              {editingId === blog._id ? (
                // Edit Form
                <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-300">
                  <div className="mb-4 text-sm text-blue-600 font-semibold">
                    EDITING - Changes will need admin approval
                  </div>
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Title
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm({ ...editForm, title: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Author
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                          value={editForm.author}
                          onChange={(e) =>
                            setEditForm({ ...editForm, author: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Excerpt
                      </label>
                      <textarea
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                        rows="2"
                        value={editForm.excerpt}
                        onChange={(e) =>
                          setEditForm({ ...editForm, excerpt: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Content
                      </label>
                      <ReactQuill
                        value={editForm.content}
                        onChange={(content) =>
                          setEditForm({ ...editForm, content })
                        }
                        theme="snow"
                        className="bg-white rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Tags (comma-separated)
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                          value={editForm.tags}
                          onChange={(e) =>
                            setEditForm({ ...editForm, tags: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Image URL
                        </label>
                        <input
                          type="url"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                          value={editForm.imageUrl}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              imageUrl: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        disabled={!!loadingMap[editingId]}
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center min-w-[130px]"
                      >
                        {loadingMap[editingId] === "edit" ? <Spinner /> : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // Blog Card
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-gray-800">
                            {blog.title}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              blog.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : blog.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {blog.status.charAt(0).toUpperCase() +
                              blog.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          By {blog.author} •{" "}
                          {new Date(blog.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-gray-700 text-sm line-clamp-2">
                          {blog.excerpt}
                        </p>
                      </div>
                      {blog.imageUrl && (
                        <img
                          src={blog.imageUrl}
                          alt={blog.title}
                          className="w-24 h-24 object-cover rounded-lg ml-4"
                        />
                      )}
                    </div>

                    {blog.tags && blog.tags.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {blog.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleEditClick(blog)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                      >
                        ✎ Edit
                      </button>
                      <button
                        disabled={!!loadingMap[blog._id]}
                        onClick={() => handleDelete(blog._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all flex items-center justify-center min-w-[100px]"
                      >
                        {loadingMap[blog._id] === "delete" ? <Spinner /> : "🗑 Delete"}
                      </button>
                      <button
                        onClick={() => setViewingId(blog._id)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-all"
                      >
                        👁 View
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
