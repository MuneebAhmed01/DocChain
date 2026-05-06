import React, { useContext, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isPendingProfile, token } = useContext(AppContext);
  const location = useLocation();

  useEffect(() => {
    // If user has token but is pending profile completion, redirect to complete-profile
    if (token && isPendingProfile && location.pathname !== "/complete-profile") {
      // This will be handled by the Navigate component below
      return;
    }
  }, [token, isPendingProfile, location.pathname]);

  // If not authenticated at all, redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated but profile is not complete, redirect to complete-profile
  if (token && isPendingProfile && location.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" replace />;
  }

  // If authenticated and profile is complete, allow access
  if (isAuthenticated) {
    return children;
  }

  // Fallback to login (shouldn't reach here but safety net)
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
