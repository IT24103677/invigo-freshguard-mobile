const mongoose = require("mongoose");

const {
  createSaleSchema,
  updateSaleSchema,
  voidSaleSchema,
} = require("../validations/saleValidation");
const saleService = require("../services/saleService");

const sendError = (res, error) => {
  const statusCode = error.statusCode || (error.isJoi ? 400 : 500);
  const message = error.isJoi
    ? error.details?.map((detail) => detail.message).join(". ") || error.message
    : error.message || "Something went wrong.";

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const createSale = async (req, res) => {
  try {
    const payload = await createSaleSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const sale = await saleService.createSale({
      ...payload,
      recordedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: sale,
      message: "Sale recorded successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const attachSaleReceipt = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale id.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Receipt image is required.",
      });
    }

    const receiptImageUrl = `${req.protocol}://${req.get("host")}/uploads/receipts/${req.file.filename}`;
    const sale = await saleService.attachSaleReceipt({
      saleId: req.params.id,
      receiptImageUrl,
    });

    return res.status(200).json({
      success: true,
      data: sale,
      message: "Receipt uploaded successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getSales = async (req, res) => {
  try {
    const salesResult = await saleService.getSales(req.query);

    return res.status(200).json({
      success: true,
      data: salesResult.items,
      meta: salesResult.pagination,
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

const updateSale = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale id.",
      });
    }

    const payload = await updateSaleSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const sale = await saleService.updateSale({
      saleId: req.params.id,
      updates: payload,
      editedBy: req.user._id,
    });

    return res.status(200).json({
      success: true,
      data: sale,
      message: "Sale updated successfully.",
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
      voidedBy: req.user._id,
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
  attachSaleReceipt,
  getSales,
  getSaleById,
  updateSale,
  voidSale,
};
