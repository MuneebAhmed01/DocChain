import { useBlogs } from "../../context/BlogContext";

export default function BlogList() {
  const { blogs } = useBlogs();

  // sorted newest → oldest
  const sorted = [...blogs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Health & Wellness Blog</h1>
      <p className="text-gray-500 mb-6">
        Explore expert-written articles, medical insights, and wellness guides.
      </p>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sorted.map((b) => (
          <a
            key={b._id}
            href={`/blog/${b.slug || b._id}`}
            className="block bg-white rounded-xl shadow hover:shadow-md transition overflow-hidden"
          >
            <img
              src={b.imageUrl || "/placeholder.jpg"}
              className="w-full h-40 object-cover"
            />

            <div className="p-4">
              <p className="text-xs text-gray-500 mb-1">
                {(b.tags || []).join(", ")}
              </p>

              <h2 className="font-semibold text-lg">{b.title}</h2>

              <p className="text-gray-600 text-sm mt-2">
                {b.excerpt?.slice(0, 120)}...
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
