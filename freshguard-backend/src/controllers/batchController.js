const mongoose = require("mongoose");

const { createBatchSchema } = require("../validations/batchValidation");
const batchService = require("../services/batchService");

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
};

const createBatch = async (req, res) => {
  try {
    const payload = await createBatchSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const receivedDate = new Date(payload.receivedDate);
    const expiryDate = new Date(payload.expiryDate);

    if (expiryDate < receivedDate) {
      return res.status(400).json({
        success: false,
        message: "Expiry date cannot be earlier than received date.",
      });
    }

    const batch = await batchService.createBatch(payload);

    return res.status(201).json({
      success: true,
      data: batch,
      message: "Batch created successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getBatches = async (req, res) => {
  try {
    const batches = await batchService.getBatches();

    return res.status(200).json({
      success: true,
      data: batches,
      message: "Batches fetched successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getBatchById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch id.",
      });
    }

    const batch = await batchService.getBatchById(req.params.id);

    return res.status(200).json({
      success: true,
      data: batch,
      message: "Batch fetched successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
};
