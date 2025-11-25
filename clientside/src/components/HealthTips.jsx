import { ArrowRight } from "lucide-react";
import { useBlogs } from "../context/BlogContext";

export default function HealthTips() {
  const { blogs } = useBlogs(); // ⬅ get blogs from Context

  // Ensure latest blogs appear first
  const sorted = [...blogs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  // 2 big + 4 small layout
  const bigCards = sorted.slice(0, 2);  // first 2 newest blogs
  const smallCards = sorted.slice(2, 6); // next 4

  return (
    <div className="w-full p-4 flex flex-col gap-4">

      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Health Tips & Insights</h1>
          <p className="text-gray-500 max-w-2xl text-sm mt-1 leading-snug">
            Stay informed with expert advice, health tips, and the latest medical updates.
          </p>
        </div>

        {/* Only changed the LINK */}
        <a
          href="/blogs"
          className="bg-blue-600 text-white font-medium px-4 py-2 rounded-full hover:bg-blue-700 text-sm"
        >
          Read more
        </a>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">

        {/* LEFT SIDE — 2 big cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {bigCards.map((item) => (
       <a
  key={item._id}
  href={`/blog/${item.slug || item._id}`}
  className="rounded-xl overflow-hidden border shadow-sm bg-white hover:shadow-md transition cursor-pointer flex flex-col"
>
  <img
    src={item.imageUrl || "/placeholder.jpg"}
    className="w-full h-48 object-cover"
  />

  <div className="p-4 flex flex-col flex-grow">
    <p className="text-xs text-gray-500">{(item.tags || []).join(", ")}</p>

    <h2 className="text-lg font-semibold mt-1">{item.title}</h2>

    <p className="text-gray-600 text-sm mt-2">
      {item.excerpt}
    </p>

    {/* READ MORE BUTTON */}
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
              className="flex gap-3 p-2 rounded-xl border bg-white shadow-sm hover:shadow-md transition cursor-pointer h-20"
            >
              <img
                src={item.imageUrl || "/placeholder.jpg"}
                className="w-16 h-16 rounded-lg object-cover"
              />

              <div className="flex flex-col justify-center">
                <p className="text-xs text-gray-500">
                  {(item.tags || []).join(", ")}
                </p>

                <h3 className="font-semibold text-sm leading-tight">
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
