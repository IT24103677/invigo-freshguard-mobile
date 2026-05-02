const mongoose = require('mongoose');
const { sanitizeProfileImageName } = require('../utils/profileImage');
const { sanitizeSaleReceiptName } = require('../utils/saleReceipt');

const PROFILE_BUCKET_NAME = 'profilePictures';
const SALE_RECEIPT_BUCKET_NAME = 'saleReceipts';

function getBucket(bucketName) {
  const db = mongoose.connection?.db;
  if (!db) {
    throw new Error('MongoDB is not connected yet. GridFS storage is unavailable.');
  }

  return new mongoose.mongo.GridFSBucket(db, { bucketName });
}

function getProfileImageBucket() {
  return getBucket(PROFILE_BUCKET_NAME);
}

function getSaleReceiptBucket() {
  return getBucket(SALE_RECEIPT_BUCKET_NAME);
}

async function storeGridFile({
  bucketName,
  filename,
  buffer,
  mimetype,
  metadata,
}) {
  const bucket = getBucket(bucketName);

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimetype || 'application/octet-stream',
      metadata,
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

async function findGridFile(bucketName, fileId) {
  if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) return null;

  const bucket = getBucket(bucketName);
  const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
  return files[0] || null;
}

async function deleteGridFile(bucketName, fileId) {
  if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) return;

  try {
    const bucket = getBucket(bucketName);
    await bucket.delete(new mongoose.Types.ObjectId(fileId));
  } catch (error) {
    if (error?.code === 26 || /FileNotFound/i.test(String(error?.message || ''))) {
      return;
    }
    throw error;
  }
}

function openGridDownloadStream(bucketName, fileId) {
  if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) {
    throw new Error('Invalid GridFS file id.');
  }

  const bucket = getBucket(bucketName);
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}

async function storeProfileImage({ userId, buffer, mimetype, originalName }) {
  const filename = `staff-${userId}-${Date.now()}-${sanitizeProfileImageName(originalName)}`;
  return storeGridFile({
    bucketName: PROFILE_BUCKET_NAME,
    filename,
    buffer,
    mimetype,
    metadata: {
      userId: String(userId || ''),
      originalName: String(originalName || ''),
      kind: 'staff-profile-avatar',
    },
  });
}

async function findProfileImage(fileId) {
  return findGridFile(PROFILE_BUCKET_NAME, fileId);
}

async function deleteProfileImage(fileId) {
  return deleteGridFile(PROFILE_BUCKET_NAME, fileId);
}

function openProfileImageDownloadStream(fileId) {
  return openGridDownloadStream(PROFILE_BUCKET_NAME, fileId);
}

async function storeSaleReceipt({ saleId, buffer, mimetype, originalName }) {
  const filename = `sale-${saleId}-${Date.now()}-${sanitizeSaleReceiptName(originalName)}`;
  return storeGridFile({
    bucketName: SALE_RECEIPT_BUCKET_NAME,
    filename,
    buffer,
    mimetype,
    metadata: {
      saleId: String(saleId || ''),
      originalName: String(originalName || ''),
      kind: 'sale-receipt',
    },
  });
}

async function findSaleReceipt(fileId) {
  return findGridFile(SALE_RECEIPT_BUCKET_NAME, fileId);
}

async function deleteSaleReceipt(fileId) {
  return deleteGridFile(SALE_RECEIPT_BUCKET_NAME, fileId);
}

function openSaleReceiptDownloadStream(fileId) {
  return openGridDownloadStream(SALE_RECEIPT_BUCKET_NAME, fileId);
}

module.exports = {
  PROFILE_BUCKET_NAME,
  SALE_RECEIPT_BUCKET_NAME,
  getProfileImageBucket,
  getSaleReceiptBucket,
  storeProfileImage,
  findProfileImage,
  deleteProfileImage,
  openProfileImageDownloadStream,
  storeSaleReceipt,
  findSaleReceipt,
  deleteSaleReceipt,
  openSaleReceiptDownloadStream,
};
