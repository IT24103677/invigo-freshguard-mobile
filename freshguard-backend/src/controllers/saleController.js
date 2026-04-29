const mongoose = require("mongoose");

const {
  createSaleSchema,
  voidSaleSchema,
} = require("../validations/saleValidation");
const saleService = require("../services/saleService");

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
};

const createSale = async (req, res) => {
  try {
    const payload = await createSaleSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const sale = await saleService.createSale(payload);

    return res.status(201).json({
      success: true,
      data: sale,
      message: "Sale recorded successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getSales = async (req, res) => {
  try {
    const sales = await saleService.getSales(req.query);

    return res.status(200).json({
      success: true,
      data: sales,
      message: "Sales fetched successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getSaleById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale id.",
      });
    }

    const sale = await saleService.getSaleById(req.params.id);

    return res.status(200).json({
      success: true,
      data: sale,
      message: "Sale fetched successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const voidSale = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale id.",
      });
    }

    const payload = await voidSaleSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const sale = await saleService.voidSale({
      saleId: req.params.id,
      voidReason: payload.voidReason,
      voidedBy: payload.voidedBy,
    });

    return res.status(200).json({
      success: true,
      data: sale,
      message: "Sale voided successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  createSale,
  getSales,
  getSaleById,
  voidSale,
};
