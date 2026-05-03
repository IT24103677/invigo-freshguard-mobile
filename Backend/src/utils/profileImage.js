const jwt = require('jsonwebtoken');

const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PROFILE_IMAGE_TOKEN_TYPE = 'profile_image';
const PROFILE_IMAGE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

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

function signProfileImageToken(userId, updatedAt) {
  if (!userId || !updatedAt) return '';

  return jwt.sign(
    {
      type: PROFILE_IMAGE_TOKEN_TYPE,
      userId: String(userId),
      updatedAt: String(updatedAt),
    },
    process.env.JWT_SECRET,
    { expiresIn: PROFILE_IMAGE_TOKEN_TTL_SECONDS }
  );
}

function readProfileImageToken(token) {
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload?.type !== PROFILE_IMAGE_TOKEN_TYPE || !payload?.userId || !payload?.updatedAt) {
      return null;
    }

    return {
      userId: String(payload.userId),
      updatedAt: String(payload.updatedAt),
    };
  } catch (error) {
    return null;
  }
}

function buildProfileImagePath(user) {
  if (!user?.profileImageFileId) return '';

  const updatedAt = user.profileImageUpdatedAt
    ? new Date(user.profileImageUpdatedAt).toISOString()
    : '';
  const userId = user?.id || user?._id?.toString?.() || user?._id;
  const profileImageToken = signProfileImageToken(userId, updatedAt);

  const query = new URLSearchParams();
  if (profileImageToken) query.append('profileImageToken', profileImageToken);
  if (updatedAt) query.append('updatedAt', updatedAt);
  const suffix = query.toString();

  return suffix ? `/auth/me/avatar?${suffix}` : '/auth/me/avatar';
}

module.exports = {
  MAX_PROFILE_IMAGE_SIZE_BYTES,
  ALLOWED_PROFILE_IMAGE_TYPES,
  isAllowedProfileImageType,
  sanitizeProfileImageName,
  signProfileImageToken,
  readProfileImageToken,
  buildProfileImagePath,
};
