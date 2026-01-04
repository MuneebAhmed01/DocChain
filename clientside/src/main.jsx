import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import AppContextProvider from "./context/AppContext.jsx";
import { BlogProvider } from "./context/BlogContext.jsx"; // ⬅ added
import { GoogleOAuthProvider } from "@react-oauth/google";


createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AppContextProvider>
      <BlogProvider>       {/* ⬅ wrap App inside BlogProvider */}
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}   hostedDomain={window.location.origin}>
   <App />
</GoogleOAuthProvider>

      </BlogProvider>
    </AppContextProvider>
  </BrowserRouter>
);

