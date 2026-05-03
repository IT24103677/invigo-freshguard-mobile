const mongoose = require('mongoose');
const { createDiscountSchema, updateDiscountSchema } = require('../validations/discountValidation');
const discountService = require('../services/discountService');
const {
  storeDiscountPromoImage,
  findDiscountPromoImage,
  deleteDiscountPromoImage,
  openDiscountPromoImageDownloadStream,
} = require('../config/gridfs');
const Discount = require('../models/Discount');

function sendError(res, error) {
  const statusCode = error.statusCode || (error.isJoi ? 400 : 500);
  const message = error.isJoi
    ? error.details?.map((d) => d.message).join('. ') || error.message
    : error.message || 'Something went wrong.';
  return res.status(statusCode).json({ success: false, message });
}

async function createDiscount(req, res) {
  try {
    const payload = await createDiscountSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const discount = await discountService.createDiscount(payload, req.user?.id);
    return res.status(201).json({ success: true, data: discount });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getDiscounts(req, res) {
  try {
    const discounts = await discountService.getDiscounts();
    return res.json({ success: true, data: discounts });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getDiscountById(req, res) {
  try {
    const discount = await discountService.getDiscountById(req.params.id);
    return res.json({ success: true, data: discount });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateDiscount(req, res) {
  try {
    const payload = await updateDiscountSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const discount = await discountService.updateDiscount(req.params.id, payload);
    return res.json({ success: true, data: discount });
  } catch (error) {
    return sendError(res, error);
  }
}

async function toggleDiscount(req, res) {
  try {
    const discount = await discountService.toggleDiscount(req.params.id);
    return res.json({ success: true, data: discount });
  } catch (error) {
    return sendError(res, error);
  }
}

async function deleteDiscount(req, res) {
  try {
    const discount = await discountService.getDiscountById(req.params.id);
    if (discount.promotionImageFileId) {
      await deleteDiscountPromoImage(discount.promotionImageFileId);
    }
    await discountService.deleteDiscount(req.params.id);
    return res.json({ success: true, message: 'Discount deleted.' });
  } catch (error) {
    return sendError(res, error);
  }
}

async function uploadPromoImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    const discount = await discountService.getDiscountById(req.params.id);

    if (discount.promotionImageFileId) {
      await deleteDiscountPromoImage(discount.promotionImageFileId).catch(() => {});
    }

    const stored = await storeDiscountPromoImage({
      discountId:   discount.id,
      buffer:       req.file.buffer,
      mimetype:     req.file.mimetype,
      originalName: req.file.originalname,
    });

    const updated = await discountService.updateDiscount(discount.id, {
      promotionImageFileId:   stored._id,
      promotionImageUpdatedAt: new Date(),
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getPromoImage(req, res) {
  try {
    const discount = await discountService.getDiscountById(req.params.id);

    if (!discount.promotionImageFileId) {
      return res.status(404).json({ success: false, message: 'No promotion image uploaded.' });
    }

    const file = await findDiscountPromoImage(discount.promotionImageFileId);
    if (!file) {
      return res.status(404).json({ success: false, message: 'Promotion image file not found.' });
    }

    res.set('Content-Type', file.contentType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');

    const stream = openDiscountPromoImageDownloadStream(discount.promotionImageFileId);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ success: false, message: 'Error streaming image.' });
    });
    stream.pipe(res);
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  createDiscount,
  getDiscounts,
  getDiscountById,
  updateDiscount,
  toggleDiscount,
  deleteDiscount,
  uploadPromoImage,
  getPromoImage,
};
