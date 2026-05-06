// Helper functions for profile picture management

/**
 * Get profile picture URL with cache-busting
 * @param {Object} userData - User data object
 * @param {boolean} forceRefresh - Force refresh with new timestamp
 * @returns {string|null} Profile picture URL or null
 */
export const getProfilePicUrl = (userData, forceRefresh = false) => {
  if (!userData) return null;
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  const getVersionKey = () => {
    // Use stable, data-driven versioning so image URLs do not change on every render.
    return (
      userData?.profilePic?.version ||
      userData?.profilePic?.updatedAt ||
      userData?.updatedAt ||
      userData?.updated_at ||
      userData?.profilePic?.public_id ||
      ""
    );
  };

  const normalizeUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    ) {
      return url;
    }
    if (url.startsWith("/") && backendUrl) {
      return `${backendUrl}${url}`;
    }
    return url;
  };

  const withVersion = (url) => {
    if (!forceRefresh) return url;
    if (url.startsWith("data:") || url.startsWith("blob:")) return url;
    const versionKey = getVersionKey();
    if (!versionKey) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${encodeURIComponent(versionKey)}`;
  };
  
  // Check for new profilePic field first
  if (userData.profilePic?.url || userData.profilePic?.secure_url) {
    const url = normalizeUrl(
      userData.profilePic.url || userData.profilePic.secure_url,
    );
    return url ? withVersion(url) : null;
  }
  
  // Fallback to old image field
  if (userData.image) {
    const url = normalizeUrl(userData.image);
    return url ? withVersion(url) : null;
  }
  
  return null;
};

/**
 * Check if user has a profile picture
 * @param {Object} userData - User data object
 * @returns {boolean} True if user has profile picture
 */
export const hasProfilePicture = (userData) => {
  return !!(userData?.profilePic?.url || userData?.image);
};

/**
 * Get default avatar URL
 * @returns {string} Default avatar URL
 */
export const getDefaultAvatarUrl = () => {
  return "/default-avatar.png";
};
