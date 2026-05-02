const InventoryBatch = require('../models/InventoryBatch');
const Product = require('../models/Product');
const { getCurrentDateOnly, getInventoryStatus, isPastDateOnly, normalizeDateOnly } = require('../utils/inventoryStatus');

const BATCH_NUMBER_REGEX = /^B\d{3,}$/;

function serializeBatch(batch) {
  const value = batch?.toJSON ? batch.toJSON() : batch;
  const product = value.product || {};

  return {
    id: value.id || value._id?.toString(),
    productId: product.id || product._id?.toString() || '',
    productName: product.productName || '',
    productCode: product.productId || '',
    batchNumber: value.batchNumber,
    quantity: value.quantity,
    expiryDate: value.expiryDate,
    status: getInventoryStatus(value.expiryDate),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function validatePayload(body) {
  const payload = {
    productId: String(body.productId || '').trim(),
    batchNumber: String(body.batchNumber || '').trim().toUpperCase(),
    quantity: Number(body.quantity),
    expiryDate: normalizeDateOnly(body.expiryDate),
  };

  if (!payload.productId) return { error: 'Product is required.' };
  if (!payload.batchNumber) return { error: 'Batch number is required.' };
  if (!BATCH_NUMBER_REGEX.test(payload.batchNumber)) return { error: 'Batch number must follow the format B001 or higher.' };
  if (!Number.isFinite(payload.quantity) || payload.quantity <= 50) return { error: 'Quantity must be greater than 50.' };
  if (!payload.expiryDate) return { error: 'Expiry date must be a valid date in YYYY-MM-DD format.' };
  if (isPastDateOnly(payload.expiryDate, getCurrentDateOnly())) return { error: 'Expiry date cannot be in the past.' };

  return { payload };
}

async function getInventoryBatches(req, res, next) {
  try {
    const batches = await InventoryBatch.find()
      .populate('product')
      .sort({ expiryDate: 1, createdAt: -1 });

    res.json(batches.map(serializeBatch));
  } catch (error) {
    next(error);
  }
}

async function createInventoryBatch(req, res, next) {
  try {
    const { payload, error } = validatePayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const product = await Product.findById(payload.productId);
    if (!product) return res.status(400).json({ message: 'Selected product does not exist.' });

    const duplicateBatch = await InventoryBatch.findOne({ batchNumber: payload.batchNumber });
    if (duplicateBatch) return res.status(409).json({ message: 'That batch number already exists.' });

    const batch = await InventoryBatch.create({
      product: product._id,
      batchNumber: payload.batchNumber,
      quantity: payload.quantity,
      expiryDate: payload.expiryDate,
    });

    const populatedBatch = await InventoryBatch.findById(batch._id).populate('product');
    res.status(201).json(serializeBatch(populatedBatch));
  } catch (err) {
    next(err);
  }
}

async function updateInventoryBatch(req, res, next) {
  try {
    const batch = await InventoryBatch.findById(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Inventory batch not found.' });

    const { payload, error } = validatePayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const product = await Product.findById(payload.productId);
    if (!product) return res.status(400).json({ message: 'Selected product does not exist.' });

    const duplicateBatch = await InventoryBatch.findOne({
      batchNumber: payload.batchNumber,
      _id: { $ne: batch._id },
    });
    if (duplicateBatch) return res.status(409).json({ message: 'That batch number already exists.' });

    batch.product = product._id;
    batch.batchNumber = payload.batchNumber;
    batch.quantity = payload.quantity;
    batch.expiryDate = payload.expiryDate;
    await batch.save();

    const populatedBatch = await InventoryBatch.findById(batch._id).populate('product');
    res.json(serializeBatch(populatedBatch));
  } catch (err) {
    next(err);
  }
}

async function deleteInventoryBatch(req, res, next) {
  try {
    const deleted = await InventoryBatch.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Inventory batch not found.' });

    res.json({ message: 'Inventory batch deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInventoryBatches,
  createInventoryBatch,
  updateInventoryBatch,
  deleteInventoryBatch,
};
