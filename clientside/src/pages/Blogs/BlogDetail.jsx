import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useBlogs } from "../../context/BlogContext";

export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { blogs } = useBlogs();

  const [blog, setBlog] = useState(null);

  // Try to find blog from context (no extra fetch)
  useEffect(() => {
    const fromContext =
      blogs.find((b) => b._id === id) || blogs.find((b) => b.slug === id);

    if (fromContext) {
      setBlog(fromContext);
    } else {
      // fallback → if user refreshes or comes from direct link
      fetch(`/api/blogs/${id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setBlog(data))
        .catch(() => setBlog(null));
    }
  }, [id, blogs]);

  if (!blog) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center text-gray-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="relative mb-4 overflow-hidden rounded-xl">
        <button
          type="button"
          onClick={() => navigate("/#health-tips")}
          className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur-sm transition hover:bg-white"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Blog Image */}
        <img
          src={blog.imageUrl || "/placeholder.jpg"}
          className="w-full h-48 sm:h-64 md:h-80 object-cover"
        />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold mb-2">{blog.title}</h1>

      {/* Meta */}
      <p className="text-sm text-gray-500 mb-4">
        By{" "}
        {blog.authorRole === "doctor" && blog.doctorId ? (
          <Link
            to={`/appointment/${blog.doctorId}`}
            className="text-primary hover:underline font-medium"
          >
            {blog.author}
          </Link>
        ) : (
          <span>{blog.author || "Admin"}</span>
        )}{" "}
        • {new Date(blog.createdAt).toLocaleDateString()}
      </p>

      {/* Content */}
      <div className="w-full overflow-hidden">
        <div
          className="prose max-w-none break-words"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        ></div>
      </div>
    </div>
  );
}
