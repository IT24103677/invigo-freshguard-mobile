const mongoose = require("mongoose");

const { createProductSchema } = require("../validations/productValidation");
const productService = require("../services/productService");

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
};

const createProduct = async (req, res) => {
  try {
    const payload = await createProductSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const product = await productService.createProduct(payload);

    return res.status(201).json({
      success: true,
      data: product,
      message: "Product created successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await productService.getProducts();

    return res.status(200).json({
      success: true,
      data: products,
      message: "Products fetched successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getProductById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id.",
      });
    }

    const product = await productService.getProductById(req.params.id);

    return res.status(200).json({
      success: true,
      data: product,
      message: "Product fetched successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
};
