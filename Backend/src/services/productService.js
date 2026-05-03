const Product = require('../models/Product');
const Batch = require('../models/Batch');
const createHttpError = require('../utils/httpError');

function removeEmptyValues(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && value !== '')
  );
}

async function createProduct(payload) {
  const sanitizedPayload = removeEmptyValues(payload);
  return Product.create(sanitizedPayload);
}

async function getProducts() {
  const products = await Product.find({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();

  const productIds = products.map((product) => product._id);
  if (productIds.length === 0) {
    return [];
  }

  const batchSummary = await Batch.aggregate([
    {
      $match: {
        isActive: true,
        productId: { $in: productIds },
        quantityOnHand: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: '$productId',
        sellableUnits: { $sum: '$quantityOnHand' },
        activeBatchCount: { $sum: 1 },
        nearestExpiryDate: { $min: '$expiryDate' },
      },
    },
  ]);

  const summaryMap = new Map(
    batchSummary.map((summary) => [String(summary._id), summary])
  );

  return products.map((product) => {
    const summary = summaryMap.get(String(product._id));
    return {
      ...product,
      id: product._id.toString(),
      sellableUnits: summary?.sellableUnits ?? 0,
      activeBatchCount: summary?.activeBatchCount ?? 0,
      nearestExpiryDate: summary?.nearestExpiryDate ?? null,
    };
  });
}

async function getProductById(productId) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw createHttpError(404, 'Product not found.');
  }
  return product;
}

async function updateProduct(productId, payload) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw createHttpError(404, 'Product not found.');
  }

  Object.assign(product, payload);
  await product.save();
  return product;
}

async function deleteProduct(productId) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw createHttpError(404, 'Product not found.');
  }

  product.isActive = false;
  await product.save();
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
