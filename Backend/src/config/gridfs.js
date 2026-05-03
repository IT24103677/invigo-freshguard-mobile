const mongoose = require('mongoose');
const { sanitizeProfileImageName } = require('../utils/profileImage');
const { sanitizeSaleReceiptName } = require('../utils/saleReceipt');

const PROFILE_BUCKET_NAME = 'profilePictures';
const SALE_RECEIPT_BUCKET_NAME = 'saleReceipts';
const PRODUCT_IMAGE_BUCKET_NAME = 'productImages';
const BATCH_DOCUMENT_BUCKET_NAME = 'batchDocuments';
const SUPPLIER_LOGO_BUCKET_NAME = 'supplierLogos';
const DISCOUNT_PROMO_BUCKET_NAME    = 'discountPromos';
const REPORT_ATTACHMENT_BUCKET_NAME = 'reportAttachments';

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

async function storeSupplierLogo({ supplierId, buffer, mimetype, originalName }) {
  const { sanitizeSupplierLogoName } = require('../utils/supplierLogo');
  const filename = `supplier-${supplierId}-${Date.now()}-${sanitizeSupplierLogoName(originalName)}`;
  return storeGridFile({
    bucketName: SUPPLIER_LOGO_BUCKET_NAME,
    filename,
    buffer,
    mimetype,
    metadata: {
      supplierId: String(supplierId || ''),
      originalName: String(originalName || ''),
      kind: 'supplier-logo',
    },
  });
}

async function findSupplierLogo(fileId) {
  return findGridFile(SUPPLIER_LOGO_BUCKET_NAME, fileId);
}

async function deleteSupplierLogo(fileId) {
  return deleteGridFile(SUPPLIER_LOGO_BUCKET_NAME, fileId);
}

function openSupplierLogoDownloadStream(fileId) {
  return openGridDownloadStream(SUPPLIER_LOGO_BUCKET_NAME, fileId);
}

async function storeProductImage({ productId, buffer, mimetype, originalName }) {
  const { sanitizeProductImageName } = require('../utils/productImage');
  const filename = `product-${productId}-${Date.now()}-${sanitizeProductImageName(originalName)}`;
  return storeGridFile({
    bucketName: PRODUCT_IMAGE_BUCKET_NAME,
    filename,
    buffer,
    mimetype,
    metadata: {
      productId: String(productId || ''),
      originalName: String(originalName || ''),
      kind: 'product-image',
    },
  });
}

async function findProductImage(fileId) {
  return findGridFile(PRODUCT_IMAGE_BUCKET_NAME, fileId);
}

async function deleteProductImage(fileId) {
  return deleteGridFile(PRODUCT_IMAGE_BUCKET_NAME, fileId);
}

function openProductImageDownloadStream(fileId) {
  return openGridDownloadStream(PRODUCT_IMAGE_BUCKET_NAME, fileId);
}

async function storeBatchDocument({ batchId, buffer, mimetype, originalName }) {
  const { sanitizeBatchDocumentName } = require('../utils/batchDocument');
  const filename = `batch-${batchId}-${Date.now()}-${sanitizeBatchDocumentName(originalName)}`;
  return storeGridFile({
    bucketName: BATCH_DOCUMENT_BUCKET_NAME,
    filename,
    buffer,
    mimetype,
    metadata: {
      batchId: String(batchId || ''),
      originalName: String(originalName || ''),
      kind: 'batch-document',
    },
  });
}

async function findBatchDocument(fileId) {
  return findGridFile(BATCH_DOCUMENT_BUCKET_NAME, fileId);
}

async function deleteBatchDocument(fileId) {
  return deleteGridFile(BATCH_DOCUMENT_BUCKET_NAME, fileId);
}

function openBatchDocumentDownloadStream(fileId) {
  return openGridDownloadStream(BATCH_DOCUMENT_BUCKET_NAME, fileId);
}

async function storeDiscountPromoImage({ discountId, buffer, mimetype, originalName }) {
  const { sanitizeDiscountPromoImageName } = require('../utils/discountPromoImage');
  const filename = `discount-${discountId}-${Date.now()}-${sanitizeDiscountPromoImageName(originalName)}`;
  return storeGridFile({
    bucketName: DISCOUNT_PROMO_BUCKET_NAME,
    filename,
    buffer,
    mimetype,
    metadata: {
      discountId: String(discountId || ''),
      originalName: String(originalName || ''),
      kind: 'discount-promo-image',
    },
  });
}

async function findDiscountPromoImage(fileId) {
  return findGridFile(DISCOUNT_PROMO_BUCKET_NAME, fileId);
}

async function deleteDiscountPromoImage(fileId) {
  return deleteGridFile(DISCOUNT_PROMO_BUCKET_NAME, fileId);
}

function openDiscountPromoImageDownloadStream(fileId) {
  return openGridDownloadStream(DISCOUNT_PROMO_BUCKET_NAME, fileId);
}

// ── Report Attachments ────────────────────────────────────────────────────────

async function storeReportAttachment({ reportId, buffer, mimetype, originalName }) {
  const safe     = (originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const filename = `report-${reportId}-${Date.now()}-${safe}`;
  return storeGridFile({
    bucketName: REPORT_ATTACHMENT_BUCKET_NAME,
    filename,
    buffer,
    mimetype,
    metadata: {
      reportId:     String(reportId || ''),
      originalName: String(originalName || ''),
      kind:         'report-attachment',
    },
  });
}

async function findReportAttachment(fileId) {
  return findGridFile(REPORT_ATTACHMENT_BUCKET_NAME, fileId);
}

async function deleteReportAttachment(fileId) {
  return deleteGridFile(REPORT_ATTACHMENT_BUCKET_NAME, fileId);
}

function openReportAttachmentDownloadStream(fileId) {
  return openGridDownloadStream(REPORT_ATTACHMENT_BUCKET_NAME, fileId);
}

module.exports = {
  PROFILE_BUCKET_NAME,
  SALE_RECEIPT_BUCKET_NAME,
  PRODUCT_IMAGE_BUCKET_NAME,
  BATCH_DOCUMENT_BUCKET_NAME,
  SUPPLIER_LOGO_BUCKET_NAME,
  DISCOUNT_PROMO_BUCKET_NAME,
  REPORT_ATTACHMENT_BUCKET_NAME,
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
  storeSupplierLogo,
  findSupplierLogo,
  deleteSupplierLogo,
  openSupplierLogoDownloadStream,
  storeProductImage,
  findProductImage,
  deleteProductImage,
  openProductImageDownloadStream,
  storeBatchDocument,
  findBatchDocument,
  deleteBatchDocument,
  openBatchDocumentDownloadStream,
  storeDiscountPromoImage,
  findDiscountPromoImage,
  deleteDiscountPromoImage,
  openDiscountPromoImageDownloadStream,
  storeReportAttachment,
  findReportAttachment,
  deleteReportAttachment,
  openReportAttachmentDownloadStream,
};
