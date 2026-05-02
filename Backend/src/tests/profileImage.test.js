const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_PROFILE_IMAGE_SIZE_BYTES,
  isAllowedProfileImageType,
  sanitizeProfileImageName,
  buildProfileImagePath,
} = require('../utils/profileImage');

test('profile image helpers keep upload rules strict', () => {
  assert.equal(MAX_PROFILE_IMAGE_SIZE_BYTES, 5 * 1024 * 1024);
  assert.equal(isAllowedProfileImageType('image/jpeg'), true);
  assert.equal(isAllowedProfileImageType('image/png'), true);
  assert.equal(isAllowedProfileImageType('image/webp'), true);
  assert.equal(isAllowedProfileImageType('image/gif'), false);
});

test('profile image filenames are sanitized for GridFS storage', () => {
  assert.equal(sanitizeProfileImageName('my profile!!.png'), 'my-profile-.png');
  assert.equal(sanitizeProfileImageName(''), 'profile-photo');
});

test('profile image path includes cache-busting timestamp when present', () => {
  const path = buildProfileImagePath({
    profileImageFileId: 'avatar-id',
    profileImageUpdatedAt: '2026-05-01T10:00:00.000Z',
  });

  assert.equal(path, '/auth/me/avatar?updatedAt=2026-05-01T10%3A00%3A00.000Z');
  assert.equal(buildProfileImagePath({}), '');
});
