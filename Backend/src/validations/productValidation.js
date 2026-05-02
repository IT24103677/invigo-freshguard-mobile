const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).required(),
  category: Joi.string().trim().min(2).required(),
  sku: Joi.string().trim().allow('', null).optional(),
  barcode: Joi.string().trim().allow('', null).optional(),
  brand: Joi.string().trim().allow('', null).optional(),
  supplier: Joi.string().trim().allow('', null).optional(),
  unitType: Joi.string().trim().min(1).required(),
  buyingPrice: Joi.number().min(0).required(),
  sellingPrice: Joi.number().min(0).required(),
  imageUrl: Joi.string().uri().allow('', null).optional(),
});

module.exports = {
  createProductSchema,
};
