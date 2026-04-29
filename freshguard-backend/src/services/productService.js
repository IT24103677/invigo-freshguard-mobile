const Product = require("../models/Product");
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
  return Product.find({ isActive: true }).sort({ createdAt: -1 });
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
