const Joi = require('joi');

const createReportSchema = Joi.object({
  reportTitle: Joi.string().trim().min(1).max(200).required(),
  reportType: Joi.string()
    .valid('INVENTORY', 'EXPIRED', 'NEAR_EXPIRY', 'SALES', 'LOW_STOCK', 'DISCOUNT_USAGE')
    .required(),
  visibility: Joi.string().valid('ADMIN', 'ALL').default('ADMIN'),
});

const updateReportSchema = Joi.object({
  reportTitle: Joi.string().trim().min(1).max(200).optional(),
  visibility:  Joi.string().valid('ADMIN', 'ALL').optional(),
}).min(1);

module.exports = { createReportSchema, updateReportSchema };
