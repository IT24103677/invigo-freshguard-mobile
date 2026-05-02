const mongoose = require('mongoose');
const { createProductSchema } = require('../validations/productValidation');
const productService = require('../services/productService');

function sendError(res, error) {
  const statusCode = error.statusCode || (error.isJoi ? 400 : 500);
  const message = error.isJoi
    ? error.details?.map((detail) => detail.message).join('. ') || error.message
    : error.message || 'Something went wrong.';

  return res.status(statusCode).json({
    success: false,
    message,
  });
}

async function createProduct(req, res) {
  try {
    const payload = await createProductSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const product = await productService.createProduct({
      ...payload,
      createdBy: req.user?._id ?? null,
    });

    return res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getProducts(req, res) {
  try {
    const products = await productService.getProducts();
    return res.status(200).json({
      success: true,
      data: products,
      message: 'Products loaded successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getProductById(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product id.',
      });
    }

    const product = await productService.getProductById(req.params.id);
    return res.status(200).json({
      success: true,
      data: product,
      message: 'Product loaded successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
};
