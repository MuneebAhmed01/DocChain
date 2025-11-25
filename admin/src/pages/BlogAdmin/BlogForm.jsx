import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export function BlogForm({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    author: "",
    tags: "",
    imageUrl: "",
    published: true,
  });

  // 🔥 FIXED: Include Authorization header in GET request
  useEffect(() => {
    if (id && id !== "new") {
      axios
        .get(`http://localhost:4000/api/blogs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const d = res.data;
          setForm({
            ...d,
            tags: (d.tags || []).join(","),
          });
        })
        .catch((err) => {
          console.log("FETCH ERROR:", err);
          alert("Error loading blog");
        });
    }
  }, [id, token]);

  const save = async (e) => {
    e.preventDefault();

    const payload = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      author: form.author,
      tags: form.tags.split(",").map((t) => t.trim()),
      imageUrl: form.imageUrl,
      published: form.published,
    };

    try {
      if (id && id !== "new") {
        // UPDATE
        await axios.put(
          `http://localhost:4000/api/blogs/${id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        // CREATE
        await axios.post(
          "http://localhost:4000/api/blogs",
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      navigate("/admin/blogs");
    } catch (err) {
      console.error("SAVE ERROR:", err);
      alert("Error saving blog");
    }
  };

  return (
    <form onSubmit={save} className="p-6 bg-white rounded-xl shadow space-y-4 overflow-hidden">
      <h2 className="text-xl font-semibold">
        {id === "new" ? "Create Blog" : "Edit Blog"}
      </h2>

      <input
        className="input"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Title"
      />

      <input
        className="input"
        value={form.excerpt}
        onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
        placeholder="Excerpt"
      />

      <input
        className="input"
        value={form.author}
        onChange={(e) => setForm({ ...form, author: e.target.value })}
        placeholder="Author"
      />

      <input
        className="input"
        value={form.imageUrl}
        onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        placeholder="Image URL"
      />

      <div>
        <label className="font-medium">Content</label>
        <ReactQuill
          value={form.content}
          onChange={(val) => setForm({ ...form, content: val })}
          className="bg-white"
        />
      </div>

      <input
        className="input"
        value={form.tags}
        onChange={(e) => setForm({ ...form, tags: e.target.value })}
        placeholder="Tags (comma separated)"
      />

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) =>
            setForm({ ...form, published: e.target.checked })
          }
        />
        Published
      </label>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn">Save</button>
        <button
          type="button"
          onClick={() => navigate("/admin/blogs")}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
