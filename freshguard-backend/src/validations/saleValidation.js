const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const saleItemSchema = Joi.object({
  productId: Joi.string().pattern(objectIdPattern).required(),
  quantity: Joi.number().integer().min(1).required(),
  discountRateApplied: Joi.number().min(0).max(100).default(0),
  unitPriceOverride: Joi.number().min(0).optional(),
});

const createSaleSchema = Joi.object({
  recordedBy: Joi.string().pattern(objectIdPattern).optional(),
  notes: Joi.string().allow("", null).optional(),
  customerName: Joi.string().allow("", null).optional(),
  customerEmail: Joi.string().email().allow("", null).optional(),
  amountGiven: Joi.number().min(0).allow(null).optional(),
  items: Joi.array().items(saleItemSchema).min(1).required(),
});

const voidSaleSchema = Joi.object({
  voidedBy: Joi.string().pattern(objectIdPattern).optional(),
  voidReason: Joi.string().trim().min(3).required(),
});

module.exports = {
  createSaleSchema,
  voidSaleSchema,
};
