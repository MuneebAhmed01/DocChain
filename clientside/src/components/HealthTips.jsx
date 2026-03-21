import { ArrowRight } from "lucide-react";
import { useBlogs } from "../context/BlogContext";

export default function HealthTips() {
  const { blogs } = useBlogs();

  const sorted = [...blogs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const bigCards = sorted.slice(0, 2);
  const smallCards = sorted.slice(2, 6);

  return (
    <div className="w-full p-4 sm:p-6 flex flex-col gap-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Health Tips & Insights
          </h1>

          <p className="text-gray-500 max-w-full sm:max-w-2xl text-sm sm:text-base mt-1 leading-snug">
            Stay informed with expert advice, health tips, and the latest medical updates.
          </p>
        </div>

        <a
          href="/blogs"
          className="bg-blue-600 text-white font-medium px-4 py-2 rounded-full hover:bg-blue-700 text-sm w-fit"
        >
          Read more
        </a>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">

        {/* LEFT SIDE — 2 big cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bigCards.map((item) => (
            <a
              key={item._id}
              href={`/blog/${item.slug || item._id}`}
              className="rounded-xl overflow-hidden border shadow-sm bg-white hover:shadow-md transition cursor-pointer flex flex-col"
            >
              <img
                src={item.imageUrl || "/placeholder.jpg"}
                className="w-full h-40 sm:h-48 object-cover"
              />

              <div className="p-4 flex flex-col flex-grow">
                <p className="text-xs text-gray-500">
                  {(item.tags || []).join(", ")}
                </p>

                <h2 className="text-base sm:text-lg font-semibold mt-1">
                  {item.title}
                </h2>

                <p className="text-gray-600 text-sm mt-2">
                  {item.excerpt}
                </p>

                <span className="text-blue-600 font-medium text-sm mt-3 inline-block">
                  Read more →
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* RIGHT SIDE — 4 small cards */}
        <div className="flex flex-col gap-3">
          {smallCards.map((item) => (
            <a
              key={item._id}
              href={`/blog/${item.slug || item._id}`}
              className="flex gap-3 p-2 rounded-xl border bg-white shadow-sm hover:shadow-md transition cursor-pointer h-20 sm:h-24"
            >
              <img
                src={item.imageUrl || "/placeholder.jpg"}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
              />

              <div className="flex flex-col justify-center">
                <p className="text-xs text-gray-500">
                  {(item.tags || []).join(", ")}
                </p>

                <h3 className="font-semibold text-sm sm:text-base leading-tight">
                  {item.title}
                </h3>
              </div>
            </a>
          ))}
        </div>

      </div>
    </div>
  );
}