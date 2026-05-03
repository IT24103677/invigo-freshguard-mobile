const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_PROFILE_IMAGE_SIZE_BYTES,
  isAllowedProfileImageType,
  sanitizeProfileImageName,
  readProfileImageToken,
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
  process.env.JWT_SECRET = 'invigo-test-secret';

  const path = buildProfileImagePath({
    _id: { toString: () => 'user-123' },
    profileImageFileId: 'avatar-id',
    profileImageUpdatedAt: '2026-05-01T10:00:00.000Z',
  });

  const url = new URL(`https://example.com${path}`);
  const profileImageToken = url.searchParams.get('profileImageToken');

  assert.equal(url.pathname, '/auth/me/avatar');
  assert.equal(url.searchParams.get('updatedAt'), '2026-05-01T10:00:00.000Z');
  assert.ok(profileImageToken);
  assert.deepEqual(readProfileImageToken(profileImageToken), {
    userId: 'user-123',
    updatedAt: '2026-05-01T10:00:00.000Z',
  });
  assert.equal(buildProfileImagePath({}), '');
});
