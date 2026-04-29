const Batch = require("../models/Batch");
const Product = require("../models/Product");
const createHttpError = require("../utils/httpError");

const createBatch = async (payload) => {
  const product = await Product.findOne({
    _id: payload.productId,
    isActive: true,
  });

  if (!product) {
    throw createHttpError(404, "Cannot create batch for a missing product.");
  }

  const batch = await Batch.create(payload);
  return batch;
};

const getBatches = async () => {
  return Batch.find({ isActive: true })
    .populate("productId", "name category unitType sellingPrice")
    .sort({ expiryDate: 1, createdAt: -1 });
};

const getBatchById = async (batchId) => {
  const batch = await Batch.findById(batchId).populate(
    "productId",
    "name category unitType sellingPrice"
  );

  if (!batch || !batch.isActive) {
    throw createHttpError(404, "Batch not found.");
  }

  return batch;
};

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
};
