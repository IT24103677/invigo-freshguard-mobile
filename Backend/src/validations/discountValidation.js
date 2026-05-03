const Joi = require('joi');

const createDiscountSchema = Joi.object({
  productId: Joi.string().hex().length(24).required().messages({
    'string.base': 'productId must be a string.',
    'any.required': 'productId is required.',
  }),
  batchId: Joi.string().hex().length(24).required().messages({
    'string.base': 'batchId must be a string.',
    'any.required': 'batchId is required.',
  }),
  discountPercent: Joi.number().integer().min(1).max(90).required().messages({
    'number.base': 'discountPercent must be a number.',
    'number.integer': 'discountPercent must be a whole number.',
    'number.min': 'discountPercent must be at least 1.',
    'number.max': 'discountPercent cannot exceed 90.',
    'any.required': 'discountPercent is required.',
  }),
  note: Joi.string().trim().max(500).allow('', null).optional(),
  source: Joi.string().valid('MANUAL', 'AI').default('MANUAL'),
});

const updateDiscountSchema = Joi.object({
  discountPercent: Joi.number().integer().min(1).max(90).optional(),
  note: Joi.string().trim().max(500).allow('', null).optional(),
  active: Joi.boolean().optional(),
}).min(1);

module.exports = { createDiscountSchema, updateDiscountSchema };
