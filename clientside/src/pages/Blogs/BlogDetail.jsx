import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBlogs } from "../../context/BlogContext";

export default function BlogDetail() {
  const { idOrSlug } = useParams();
  const { blogs } = useBlogs();

  const [blog, setBlog] = useState(null);

  // Try to find blog from context (no extra fetch)
  useEffect(() => {
    const fromContext =
      blogs.find((b) => b._id === idOrSlug) ||
      blogs.find((b) => b.slug === idOrSlug);

    if (fromContext) {
      setBlog(fromContext);
    } else {
      // fallback → if user refreshes or comes from direct link
      fetch(`/api/blogs/${idOrSlug}`)
        .then((res) => res.json())
        .then((data) => setBlog(data))
        .catch(() => setBlog(null));
    }
  }, [idOrSlug, blogs]);

  if (!blog) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center text-gray-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Blog Image */}
      <img
        src={blog.imageUrl || "/placeholder.jpg"}
        className="w-full h-64 object-cover rounded-xl mb-4"
      />

      {/* Title */}
      <h1 className="text-3xl font-bold mb-2">{blog.title}</h1>

      {/* Meta */}
      <p className="text-sm text-gray-500 mb-4">
        By {blog.author || "Admin"} •{" "}
        {new Date(blog.createdAt).toLocaleDateString()}
      </p>

      {/* Content */}
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      ></div>
    </div>
  );
}
