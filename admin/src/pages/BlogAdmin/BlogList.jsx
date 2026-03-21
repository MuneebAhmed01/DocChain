import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom"; // Recommended over <a> tags for SPA navigation

export function BlogList({ token }) {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    axios.get("/api/blogs").then((res) => {
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.blogs
        ? res.data.blogs
        : [];
      setBlogs(data);
    });
  }, []);

  const deleteBlog = async (id) => {
    if (!confirm("Delete this blog?")) return;
    try {
      await axios.delete(`/api/blogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBlogs((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Blog Management</h2>
        <Link
          to="/admin/blogs/new"
          className="w-full sm:w-auto text-center bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-all"
        >
          + New Blog
        </Link>
      </div>

      {/* Desktop Table View (Visible on Medium screens and up) */}
      <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
              <th className="p-4 border-b">Title</th>
              <th className="p-4 border-b">Author</th>
              <th className="p-4 border-b">Status</th>
              <th className="p-4 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {blogs.map((b) => (
              <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-800">{b.title}</td>
                <td className="p-4 text-gray-600">{b.author}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {b.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <Link to={`/admin/blogs/edit/${b._id}`} className="text-blue-600 hover:text-blue-800 font-medium mr-4">
                    Edit
                  </Link>
                  <button onClick={() => deleteBlog(b._id)} className="text-red-500 hover:text-red-700 font-medium">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Visible on small screens) */}
      <div className="md:hidden flex flex-col gap-4">
        {blogs.map((b) => (
          <div key={b._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-gray-800 flex-1 pr-2">{b.title}</h3>
              <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {b.published ? "Live" : "Draft"}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">By {b.author}</p>
            <div className="flex gap-3 pt-3 border-t border-gray-50">
              <Link
                to={`/admin/blogs/edit/${b._id}`}
                className="flex-1 text-center py-2 text-sm font-semibold bg-blue-50 text-blue-600 rounded-lg"
              >
                Edit
              </Link>
              <button
                onClick={() => deleteBlog(b._id)}
                className="flex-1 py-2 text-sm font-semibold bg-red-50 text-red-500 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {blogs.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
          <p className="text-gray-400">No blogs found. Start by creating one!</p>
        </div>
      )}
    </div>
  );
}
