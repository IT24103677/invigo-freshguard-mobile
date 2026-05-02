const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const saleItemSchema = Joi.object({
  productId: Joi.string().pattern(objectIdPattern).required(),
  quantity: Joi.number().integer().min(1).required(),
  discountRateApplied: Joi.number().min(0).max(100).default(0),
  unitPriceOverride: Joi.number().min(0).optional(),
});

const createSaleSchema = Joi.object({
  clientRequestKey: Joi.string().trim().min(8).max(100).optional(),
  notes: Joi.string().allow('', null).optional(),
  customerName: Joi.string().allow('', null).optional(),
  customerEmail: Joi.string().email().allow('', null).optional(),
  amountGiven: Joi.number().min(0).required(),
  items: Joi.array().items(saleItemSchema).min(1).required(),
});

const voidSaleSchema = Joi.object({
  voidReason: Joi.string().trim().min(3).required(),
});

const updateSaleSchema = Joi.object({
  notes: Joi.string().allow('', null).optional(),
  customerName: Joi.string().allow('', null).optional(),
  customerEmail: Joi.string().email().allow('', null).optional(),
  editReason: Joi.string().trim().min(3).required(),
}).or('notes', 'customerName', 'customerEmail');

module.exports = {
  createSaleSchema,
  voidSaleSchema,
  updateSaleSchema,
};
