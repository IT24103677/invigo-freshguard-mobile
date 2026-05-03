const mongoose = require('mongoose');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const Discount = require('../models/Discount');
const createHttpError = require('../utils/httpError');

function removeEmptyValues(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && value !== '')
  );
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  return mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;
}

function getProductId(product) {
  return String(product?.id || product?._id || '');
}

function toPlainProduct(product) {
  if (!product) return null;
  if (typeof product.toJSON === 'function') {
    return product.toJSON();
  }
  return { ...product };
}

function calculateDiscountedSellingPrice(sellingPrice, discountPercent) {
  const baseSellingPrice = Number(sellingPrice || 0);
  const safeDiscountPercent = Math.min(100, Math.max(0, Number(discountPercent || 0)));

  return Number(
    (baseSellingPrice - ((baseSellingPrice * safeDiscountPercent) / 100)).toFixed(2)
  );
}

async function buildProductSummaryMap(productIds) {
  if (!productIds.length) {
    return new Map();
  }

  const batchSummary = await Batch.aggregate([
    {
      $match: {
        isActive: true,
        productId: { $in: productIds },
        quantityOnHand: { $gt: 0 },
        expiryDate: { $gte: startOfToday() },
      },
    },
    {
      $sort: {
        productId: 1,
        expiryDate: 1,
        createdAt: 1,
      },
    },
    {
      $group: {
        _id: '$productId',
        sellableUnits: { $sum: '$quantityOnHand' },
        activeBatchCount: { $sum: 1 },
        nearestExpiryDate: { $first: '$expiryDate' },
        nextSellableBatchId: { $first: '$_id' },
        nextSellableBatchNumber: { $first: '$batchNumber' },
      },
    },
  ]);

  const nextSellableBatchIds = batchSummary
    .map((summary) => summary.nextSellableBatchId)
    .filter(Boolean);

  const activeDiscountByBatchId = new Map();
  if (nextSellableBatchIds.length > 0) {
    const activeDiscounts = await Discount.find({
      batchId: { $in: nextSellableBatchIds },
      active: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    activeDiscounts.forEach((discount) => {
      const batchId = String(discount.batchId);
      if (!activeDiscountByBatchId.has(batchId)) {
        activeDiscountByBatchId.set(batchId, discount);
      }
    });
  }

  return new Map(
    batchSummary.map((summary) => {
      const activeDiscount = activeDiscountByBatchId.get(String(summary.nextSellableBatchId));
      const activeDiscountPercent = Number(activeDiscount?.discountPercent || 0);

      return [
        String(summary._id),
        {
          sellableUnits: Number(summary.sellableUnits || 0),
          activeBatchCount: Number(summary.activeBatchCount || 0),
          nearestExpiryDate: summary.nearestExpiryDate ?? null,
          nextSellableBatchId: summary.nextSellableBatchId
            ? String(summary.nextSellableBatchId)
            : null,
          nextSellableBatchNumber: summary.nextSellableBatchNumber || null,
          activeDiscountPercent,
          hasActiveDiscount: activeDiscountPercent > 0,
        },
      ];
    })
  );
}

function buildProductResponse(product, summary) {
  const plainProduct = toPlainProduct(product);
  const id = getProductId(plainProduct);
  const baseSellingPrice = Number(plainProduct?.sellingPrice || 0);
  const activeDiscountPercent = Number(summary?.activeDiscountPercent || 0);

  return {
    ...plainProduct,
    id,
    _id: id,
    baseSellingPrice,
    sellableUnits: summary?.sellableUnits ?? 0,
    activeBatchCount: summary?.activeBatchCount ?? 0,
    nearestExpiryDate: summary?.nearestExpiryDate ?? null,
    nextSellableBatchId: summary?.nextSellableBatchId ?? null,
    nextSellableBatchNumber: summary?.nextSellableBatchNumber ?? null,
    activeDiscountPercent,
    hasActiveDiscount: activeDiscountPercent > 0,
    discountedSellingPrice: calculateDiscountedSellingPrice(
      baseSellingPrice,
      activeDiscountPercent
    ),
  };
}

async function enrichProducts(products) {
  const productList = products.filter(Boolean);
  if (productList.length === 0) {
    return [];
  }

  const productIds = productList
    .map((product) => toObjectId(product?._id || product?.id))
    .filter(Boolean);

  const summaryMap = await buildProductSummaryMap(productIds);

  return productList.map((product) =>
    buildProductResponse(product, summaryMap.get(getProductId(product)))
  );
}

async function createProduct(payload) {
  const sanitizedPayload = removeEmptyValues(payload);
  const product = await Product.create(sanitizedPayload);
  return buildProductResponse(product);
}

async function getProducts() {
  const products = await Product.find({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();

  return enrichProducts(products);
}

async function getProductById(productId) {
  const product = await Product.findById(productId).lean();
  if (!product || !product.isActive) {
    throw createHttpError(404, 'Product not found.');
  }
  const [enrichedProduct] = await enrichProducts([product]);
  return enrichedProduct;
}

async function updateProduct(productId, payload) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw createHttpError(404, 'Product not found.');
  }

  Object.assign(product, payload);
  await product.save();
  return getProductById(product._id);
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
