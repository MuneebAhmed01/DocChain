import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const BlogContext = createContext();

export const BlogProvider = ({ children }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all blogs from backend
  const fetchBlogs = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/blogs")
      setBlogs(res.data);
    } catch (err) {
      console.error("Error fetching blogs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  return (
    <BlogContext.Provider value={{ blogs, loading, fetchBlogs }}>
      {children}
    </BlogContext.Provider>
  );
};

export const useBlogs = () => useContext(BlogContext);
