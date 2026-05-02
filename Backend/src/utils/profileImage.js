const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function isAllowedProfileImageType(contentType) {
  return ALLOWED_PROFILE_IMAGE_TYPES.includes(String(contentType || '').trim().toLowerCase());
}

function sanitizeProfileImageName(originalName) {
  const fallback = 'profile-photo';
  const rawName = String(originalName || fallback).trim() || fallback;
  return rawName
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function buildProfileImagePath(user) {
  if (!user?.profileImageFileId) return '';

  const updatedAt = user.profileImageUpdatedAt
    ? new Date(user.profileImageUpdatedAt).toISOString()
    : '';

  return updatedAt
    ? `/auth/me/avatar?updatedAt=${encodeURIComponent(updatedAt)}`
    : '/auth/me/avatar';
}

module.exports = {
  MAX_PROFILE_IMAGE_SIZE_BYTES,
  ALLOWED_PROFILE_IMAGE_TYPES,
  isAllowedProfileImageType,
  sanitizeProfileImageName,
  buildProfileImagePath,
};
