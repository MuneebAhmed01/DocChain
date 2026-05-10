import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 inline-block text-gray-500" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
  </svg>
);

export default function PendingBlogs({ token }) {
  const [blogs, setBlogs] = useState([]);
  const [loadingMap, setLoadingMap] = useState({});
  const lockRef = useRef({});

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

  const fetchPendingBlogs = async () => {
    try {
      if (!token) {
        setBlogs([]);
        return;
      }

      const res = await axios.get(`${backendUrl}/api/blogs/admin/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setBlogs(data);
    } catch (err) {
      console.error("Fetch pending blogs error", err);
      toast.error(
        err.response?.data?.message || "Failed to fetch pending blogs",
      );
      setBlogs([]);
    }
  };

  useEffect(() => {
    fetchPendingBlogs();
  }, [token]);

  const updateStatus = async (id, status) => {
    if (lockRef.current[id]) return;
    lockRef.current[id] = true;
    setLoadingMap((prev) => ({ ...prev, [id]: status }));
    try {
      await axios.patch(
        `${backendUrl}/api/blogs/admin/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success(`Blog ${status === "approved" ? "approved" : "rejected"}`);
      await fetchPendingBlogs();
    } catch (err) {
      console.error("Update blog status error", err);
      toast.error(
        err.response?.data?.message || "Failed to update blog status",
      );
    } finally {
      lockRef.current[id] = false;
      setLoadingMap((prev) => ({ ...prev, [id]: null }));
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
          Pending Blogs
        </h2>
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
                    disabled={!!loadingMap[b._id]}
                    className="text-green-600 hover:text-green-700 font-medium mr-4 disabled:opacity-50 inline-flex items-center justify-center min-w-[70px]"
                  >
                    {loadingMap[b._id] === "approved" ? <Spinner /> : "Approve"}
                  </button>
                  <button
                    onClick={() => updateStatus(b._id, "rejected")}
                    disabled={!!loadingMap[b._id]}
                    className="text-red-500 hover:text-red-700 font-medium disabled:opacity-50 inline-flex items-center justify-center min-w-[70px]"
                  >
                    {loadingMap[b._id] === "rejected" ? <Spinner /> : "Reject"}
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
