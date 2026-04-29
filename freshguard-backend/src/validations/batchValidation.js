const Joi = require("joi");

const createBatchSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  batchNumber: Joi.string().trim().allow("", null).optional(),
  receivedDate: Joi.date().required(),
  expiryDate: Joi.date().required(),
  quantityOnHand: Joi.number().integer().min(0).required(),
  storageCondition: Joi.string().trim().allow("", null).optional(),
  location: Joi.string().trim().allow("", null).optional(),
  createdBy: Joi.string().hex().length(24).optional(),
});

module.exports = {
  createBatchSchema,
};
