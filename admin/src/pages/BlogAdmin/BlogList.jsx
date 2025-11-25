import React, { useEffect, useState } from "react";
import axios from "axios";

export function BlogList({ token }) {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    axios.get("/api/blogs").then((res) => {
      console.log("API RESPONSE:", res.data);

      // normalize payload
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

    await axios.delete(`/api/blogs/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setBlogs((prev) => prev.filter((b) => b._id !== id));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Blogs</h2>
        <a href="/admin/blogs/new" className="btn">
          + New Blog
        </a>
      </div>

      <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Title</th>
              <th className="p-2">Author</th>
              <th className="p-2">Published</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {blogs.map((b) => (
              <tr key={b._id} className="border-b">
                <td className="p-2">{b.title}</td>
                <td className="p-2">{b.author}</td>
                <td className="p-2">{b.published ? "Yes" : "No"}</td>
                <td className="p-2">
                  <a
                    href={`/admin/blogs/edit/${b._id}`}
                    className="text-blue-600 mr-3"
                  >
                    Edit
                  </a>
                  <button
                    onClick={() => deleteBlog(b._id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {blogs.length === 0 && (
              <tr>
                <td className="p-2" colSpan="4">
                  No blogs yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
