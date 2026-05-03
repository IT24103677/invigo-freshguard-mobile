const mongoose = require('mongoose');
const { createProductSchema, updateProductSchema } = require('../validations/productValidation');
const productService = require('../services/productService');
const {
  storeProductImage,
  findProductImage,
  deleteProductImage,
  openProductImageDownloadStream,
} = require('../config/gridfs');

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

async function updateProduct(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }

    const payload = await updateProductSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const product = await productService.updateProduct(req.params.id, payload);
    return res.status(200).json({
      success: true,
      data: product,
      message: 'Product updated successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function deleteProduct(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }

    await productService.deleteProduct(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function uploadProductImage(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    const product = await productService.getProductById(req.params.id);

    if (product.imageFileId) {
      await deleteProductImage(product.imageFileId).catch(() => null);
    }

    const stored = await storeProductImage({
      productId: product.id,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
    });

    const updated = await productService.updateProduct(req.params.id, {
      imageFileId: stored._id,
      imageUpdatedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Product image uploaded successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getProductImage(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }

    const product = await productService.getProductById(req.params.id);

    if (!product.imageFileId) {
      return res.status(404).json({ success: false, message: 'No image for this product.' });
    }

    const file = await findProductImage(product.imageFileId);
    if (!file) {
      return res.status(404).json({ success: false, message: 'Image file not found.' });
    }

    res.set('Content-Type', file.contentType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000');

    const downloadStream = openProductImageDownloadStream(product.imageFileId);
    downloadStream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ message: 'Failed to stream image.' });
    });
    downloadStream.pipe(res);
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  getProductImage,
};
