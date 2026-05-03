const Batch = require('../models/Batch');
const Product = require('../models/Product');
const createHttpError = require('../utils/httpError');

// ── Risk helpers ──────────────────────────────────────────────────────────────
function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate) - Date.now()) / 86400000);
}

function computeRiskLevel(batch) {
  const days = daysUntilExpiry(batch.expiryDate);
  const qty  = batch.quantityOnHand ?? 0;
  if (days !== null && days < 0)          return 'EXPIRED';
  if (days !== null && days <= 7)         return 'HIGH';
  if (qty === 0)                          return 'HIGH';
  if (days !== null && days <= 30)        return 'MEDIUM';
  if (qty <= 10)                          return 'MEDIUM';
  return 'LOW';
}

function computeSuggestedDiscount(batch) {
  const days = daysUntilExpiry(batch.expiryDate);
  const qty  = batch.quantityOnHand ?? 0;
  if (days !== null && days < 0)  return 30;
  if (days !== null && days <= 3) return 25;
  if (days !== null && days <= 7) return 20;
  if (qty === 0)                  return 15;
  if (days !== null && days <= 14) return 15;
  if (qty <= 5)                   return 10;
  return 0;
}

function annotateBatch(batchDoc) {
  const obj = batchDoc.toJSON ? batchDoc.toJSON() : { ...batchDoc };
  obj.riskLevel        = computeRiskLevel(obj);
  obj.suggestedDiscount = computeSuggestedDiscount(obj);
  obj.daysLeft         = daysUntilExpiry(obj.expiryDate);
  return obj;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
async function createBatch(payload) {
  const product = await Product.findOne({ _id: payload.productId, isActive: true });
  if (!product) throw createHttpError(404, 'Cannot create batch for a missing product.');
  return Batch.create(payload);
}

async function getBatches(query = {}) {
  const filter = { isActive: true };
  if (query.productId) filter.productId = query.productId;

  const batches = await Batch.find(filter)
    .populate('productId', 'name category unitType sellingPrice')
    .sort({ expiryDate: 1, createdAt: -1 });

  return batches.map(annotateBatch);
}

async function getBatchById(batchId) {
  const batch = await Batch.findById(batchId).populate(
    'productId',
    'name category unitType sellingPrice'
  );
  if (!batch || !batch.isActive) throw createHttpError(404, 'Batch not found.');
  return annotateBatch(batch);
}

async function updateBatch(batchId, payload) {
  const batch = await Batch.findById(batchId);
  if (!batch || !batch.isActive) throw createHttpError(404, 'Batch not found.');

  if (payload.expiryDate && payload.receivedDate) {
    if (new Date(payload.expiryDate) < new Date(payload.receivedDate)) {
      throw createHttpError(400, 'Expiry date cannot be earlier than received date.');
    }
  } else if (payload.expiryDate) {
    if (new Date(payload.expiryDate) < batch.receivedDate) {
      throw createHttpError(400, 'Expiry date cannot be earlier than received date.');
    }
  } else if (payload.receivedDate) {
    if (batch.expiryDate < new Date(payload.receivedDate)) {
      throw createHttpError(400, 'Received date cannot be later than expiry date.');
    }
  }

  Object.assign(batch, payload);
  await batch.save();
  const populated = await batch.populate('productId', 'name category unitType sellingPrice');
  return annotateBatch(populated);
}

async function deleteBatch(batchId) {
  const batch = await Batch.findById(batchId);
  if (!batch || !batch.isActive) throw createHttpError(404, 'Batch not found.');
  batch.isActive = false;
  await batch.save();
}

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
};
