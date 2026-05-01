const mongoose = require('mongoose');
const { sanitizeProfileImageName } = require('../utils/profileImage');

const BUCKET_NAME = 'profilePictures';

function getProfileImageBucket() {
  const db = mongoose.connection?.db;
  if (!db) {
    throw new Error('MongoDB is not connected yet. Profile image storage is unavailable.');
  }

  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

async function storeProfileImage({ userId, buffer, mimetype, originalName }) {
  const bucket = getProfileImageBucket();
  const filename = `staff-${userId}-${Date.now()}-${sanitizeProfileImageName(originalName)}`;

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimetype || 'application/octet-stream',
      metadata: {
        userId: String(userId || ''),
        originalName: String(originalName || ''),
        kind: 'staff-profile-avatar',
      },
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        _id: uploadStream.id,
        filename,
        contentType: mimetype || 'application/octet-stream',
      });
    });
    uploadStream.end(buffer);
  });
}

async function findProfileImage(fileId) {
  if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) return null;

  const bucket = getProfileImageBucket();
  const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
  return files[0] || null;
}

async function deleteProfileImage(fileId) {
  if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) return;

  try {
    const bucket = getProfileImageBucket();
    await bucket.delete(new mongoose.Types.ObjectId(fileId));
  } catch (error) {
    if (error?.code === 26 || /FileNotFound/i.test(String(error?.message || ''))) {
      return;
    }
    throw error;
  }
}

function openProfileImageDownloadStream(fileId) {
  if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) {
    throw new Error('Invalid profile image file id.');
  }

  const bucket = getProfileImageBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}

module.exports = {
  BUCKET_NAME,
  getProfileImageBucket,
  storeProfileImage,
  findProfileImage,
  deleteProfileImage,
  openProfileImageDownloadStream,
};
