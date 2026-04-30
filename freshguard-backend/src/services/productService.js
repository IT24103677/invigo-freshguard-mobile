const Product = require("../models/Product");
const Batch = require("../models/Batch");
const createHttpError = require("../utils/httpError");

const removeEmptyValues = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && value !== "")
  );

const createProduct = async (payload) => {
  const sanitizedPayload = removeEmptyValues(payload);
  const product = await Product.create(sanitizedPayload);
  return product;
};

const getProducts = async () => {
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
        _id: "$productId",
        sellableUnits: { $sum: "$quantityOnHand" },
        activeBatchCount: { $sum: 1 },
        nearestExpiryDate: { $min: "$expiryDate" },
      },
    },
  ]);

  const batchSummaryByProductId = new Map(
    batchSummary.map((summary) => [String(summary._id), summary])
  );

  return products.map((product) => {
    const summary = batchSummaryByProductId.get(String(product._id));

    return {
      ...product,
      sellableUnits: summary?.sellableUnits ?? 0,
      activeBatchCount: summary?.activeBatchCount ?? 0,
      nearestExpiryDate: summary?.nearestExpiryDate ?? null,
    };
  });
};

const getProductById = async (productId) => {
  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    throw createHttpError(404, "Product not found.");
  }

  return product;
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
};
