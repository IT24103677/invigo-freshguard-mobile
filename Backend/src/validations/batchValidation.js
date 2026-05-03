const Joi = require('joi');

const createBatchSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  batchNumber: Joi.string().trim().allow('', null).optional(),
  receivedDate: Joi.date().required(),
  expiryDate: Joi.date().required(),
  quantityOnHand: Joi.number().integer().min(0).required(),
  storageCondition: Joi.string().trim().allow('', null).optional(),
  location: Joi.string().trim().allow('', null).optional(),
  costPerUnit: Joi.number().min(0).allow(null).optional(),
  supplierName: Joi.string().trim().allow('', null).optional(),
  notes: Joi.string().trim().allow('', null).optional(),
});

const updateBatchSchema = Joi.object({
  batchNumber: Joi.string().trim().allow('', null).optional(),
  receivedDate: Joi.date().optional(),
  expiryDate: Joi.date().optional(),
  quantityOnHand: Joi.number().integer().min(0).optional(),
  storageCondition: Joi.string().trim().allow('', null).optional(),
  location: Joi.string().trim().allow('', null).optional(),
  costPerUnit: Joi.number().min(0).allow(null).optional(),
  supplierName: Joi.string().trim().allow('', null).optional(),
  notes: Joi.string().trim().allow('', null).optional(),
}).min(1);

module.exports = {
  createBatchSchema,
  updateBatchSchema,
};
