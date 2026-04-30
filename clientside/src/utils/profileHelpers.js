// Helper functions for profile picture management

/**
 * Get profile picture URL with cache-busting
 * @param {Object} userData - User data object
 * @param {boolean} forceRefresh - Force refresh with new timestamp
 * @returns {string|null} Profile picture URL or null
 */
export const getProfilePicUrl = (userData, forceRefresh = false) => {
  if (!userData) return null;
  
  // Check for new profilePic field first
  if (userData.profilePic?.url) {
    const url = userData.profilePic.url;
    return forceRefresh ? `${url}?t=${Date.now()}` : url;
  }
  
  // Fallback to old image field
  if (userData.image) {
    const url = userData.image;
    return forceRefresh ? `${url}?t=${Date.now()}` : url;
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
