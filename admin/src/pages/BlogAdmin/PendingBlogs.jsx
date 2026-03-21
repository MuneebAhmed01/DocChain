import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function PendingBlogs({ token }) {
  const [blogs, setBlogs] = useState([]);
  const [busyId, setBusyId] = useState("");

  const fetchPendingBlogs = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/blogs/admin/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setBlogs(data);
    } catch (err) {
      console.error("Fetch pending blogs error", err);
      setBlogs([]);
    }
  };

  useEffect(() => {
    fetchPendingBlogs();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      setBusyId(id);
      await axios.patch(
        `http://localhost:4000/api/blogs/admin/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBlogs((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error("Update blog status error", err);
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Pending Blogs</h2>
        <Link
          to="/admin/blogs"
          className="w-full sm:w-auto text-center bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium"
        >
          Back To All Blogs
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
              <th className="p-4 border-b">Title</th>
              <th className="p-4 border-b">Author</th>
              <th className="p-4 border-b">Role</th>
              <th className="p-4 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {blogs.map((b) => (
              <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-800">{b.title}</td>
                <td className="p-4 text-gray-600">{b.author || "Unknown"}</td>
                <td className="p-4 text-gray-600 capitalize">{b.authorRole}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => updateStatus(b._id, "approved")}
                    disabled={busyId === b._id}
                    className="text-green-600 hover:text-green-700 font-medium mr-4 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(b._id, "rejected")}
                    disabled={busyId === b._id}
                    className="text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {blogs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-gray-300 mt-4">
          <p className="text-gray-400">No pending blogs right now.</p>
        </div>
      )}
    </div>
  );
}
