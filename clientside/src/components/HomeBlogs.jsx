import React from "react";
import { Link } from "react-router-dom";
import { useBlogs } from "../context/BlogContext";

const HomeBlogs = () => {
  const { blogs, loading } = useBlogs();

  // Show only the latest 3 blogs on homepage
  const latestBlogs = blogs.slice(0, 3);

  if (loading) {
    return (
      <div className="w-full py-10 sm:py-14 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Latest Health Articles</h2>
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (latestBlogs.length === 0) {
    return (
      <div className="w-full py-10 sm:py-14 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Latest Health Articles</h2>
            <p className="text-gray-600">No articles available at the moment. Check back soon!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-10 sm:py-14 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Latest Health Articles</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Stay informed with expert health tips, medical insights, and wellness guides from our healthcare professionals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {latestBlogs.map((blog) => (
            <Link
              key={blog._id}
              to={`/blogs/${blog.slug || blog._id}`}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="relative overflow-hidden">
                <img
                  src={blog.imageUrl || "/placeholder-blog.jpg"}
                  alt={blog.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-primary/90 text-white text-xs px-3 py-1 rounded-full">
                    {blog.author || "DocChain Team"}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500">
                    {new Date(blog.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })}
                  </span>
                  {blog.tags && blog.tags.length > 0 && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500">
                        {blog.tags[0]}
                      </span>
                    </>
                  )}
                </div>
                
                <h3 className="font-semibold text-lg text-gray-800 mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {blog.title}
                </h3>
                
                <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                  {blog.excerpt || blog.content?.slice(0, 150) + "..."}
                </p>
                
                <div className="flex items-center text-primary font-medium text-sm group-hover:text-primary/80 transition-colors">
                  Read More
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/blogs"
            className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            View All Articles
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomeBlogs;
