const mongoose = require('mongoose');
const { createBatchSchema, updateBatchSchema } = require('../validations/batchValidation');
const batchService = require('../services/batchService');
const {
  storeBatchDocument,
  findBatchDocument,
  deleteBatchDocument,
  openBatchDocumentDownloadStream,
} = require('../config/gridfs');

function sendError(res, error) {
  const statusCode = error.statusCode || (error.isJoi ? 400 : 500);
  const message = error.isJoi
    ? error.details?.map((detail) => detail.message).join('. ') || error.message
    : error.message || 'Something went wrong.';

  return res.status(statusCode).json({
    success: false,
    message,
  });
}

async function createBatch(req, res) {
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
        message: 'Expiry date cannot be earlier than received date.',
      });
    }

    const batch = await batchService.createBatch({
      ...payload,
      createdBy: req.user?._id ?? null,
    });

    return res.status(201).json({
      success: true,
      data: batch,
      message: 'Batch created successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getBatches(req, res) {
  try {
    const query = {};
    if (req.query.productId && mongoose.Types.ObjectId.isValid(req.query.productId)) {
      query.productId = req.query.productId;
    }

    const batches = await batchService.getBatches(query);
    return res.status(200).json({
      success: true,
      data: batches,
      message: 'Batches loaded successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getBatchById(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid batch id.',
      });
    }

    const batch = await batchService.getBatchById(req.params.id);
    return res.status(200).json({
      success: true,
      data: batch,
      message: 'Batch loaded successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateBatch(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid batch id.' });
    }

    const payload = await updateBatchSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const batch = await batchService.updateBatch(req.params.id, payload);
    return res.status(200).json({
      success: true,
      data: batch,
      message: 'Batch updated successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function deleteBatch(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid batch id.' });
    }

    await batchService.deleteBatch(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Batch deleted successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function uploadBatchDocument(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid batch id.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document file provided.' });
    }

    const batch = await batchService.getBatchById(req.params.id);

    if (batch.documentFileId) {
      await deleteBatchDocument(batch.documentFileId).catch(() => null);
    }

    const stored = await storeBatchDocument({
      batchId: batch.id,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
    });

    const updated = await batchService.updateBatch(req.params.id, {
      documentFileId: stored._id,
      documentUpdatedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Batch document uploaded successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getBatchDocument(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid batch id.' });
    }

    const batch = await batchService.getBatchById(req.params.id);

    if (!batch.documentFileId) {
      return res.status(404).json({ success: false, message: 'No document for this batch.' });
    }

    const file = await findBatchDocument(batch.documentFileId);
    if (!file) {
      return res.status(404).json({ success: false, message: 'Document file not found.' });
    }

    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=31536000');

    const downloadStream = openBatchDocumentDownloadStream(batch.documentFileId);
    downloadStream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ message: 'Failed to stream document.' });
    });
    downloadStream.pipe(res);
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  uploadBatchDocument,
  getBatchDocument,
};
