// index.jsx

import React from "react";
import { Routes, Route } from "react-router-dom";
import { BlogForm } from "./BlogForm";
import { BlogList } from "./BlogList";




export default function BlogAdminIndex({ token }) {
  return (
    <Routes>
      <Route index element={<BlogList token={token} />} />
      <Route path="new" element={<BlogForm token={token} />} />
      <Route path="edit/:id" element={<BlogForm token={token} />} />
    </Routes>
  );
}
