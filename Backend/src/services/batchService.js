const Batch = require('../models/Batch');
const Product = require('../models/Product');
const createHttpError = require('../utils/httpError');

async function createBatch(payload) {
  const product = await Product.findOne({
    _id: payload.productId,
    isActive: true,
  });

  if (!product) {
    throw createHttpError(404, 'Cannot create batch for a missing product.');
  }

  return Batch.create(payload);
}

function getBatches() {
  return Batch.find({ isActive: true })
    .populate('productId', 'name category unitType sellingPrice')
    .sort({ expiryDate: 1, createdAt: -1 });
}

async function getBatchById(batchId) {
  const batch = await Batch.findById(batchId).populate(
    'productId',
    'name category unitType sellingPrice'
  );

  if (!batch || !batch.isActive) {
    throw createHttpError(404, 'Batch not found.');
  }

  return batch;
}

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
};
