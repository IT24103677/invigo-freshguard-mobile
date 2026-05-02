const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const { createSaleSchema, updateSaleSchema, voidSaleSchema } = require('../validations/saleValidation');
const saleService = require('../services/saleService');
const {
  storeSaleReceipt,
  deleteSaleReceipt,
  findSaleReceipt,
  openSaleReceiptDownloadStream,
} = require('../config/gridfs');
const { buildSaleReceiptPath } = require('../utils/saleReceipt');

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

function serializeSale(sale) {
  const data = sale.toJSON ? sale.toJSON() : { ...sale };
  return {
    ...data,
    receiptImageUrl: buildSaleReceiptPath({
      ...data,
      receiptImageFileId: sale.receiptImageFileId || data.receiptImageFileId,
      receiptImageUpdatedAt: sale.receiptImageUpdatedAt || data.receiptImageUpdatedAt,
    }) || null,
  };
}

async function createSale(req, res) {
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
      data: serializeSale(sale),
      message: 'Sale recorded successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function attachSaleReceipt(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sale id.',
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Receipt image is required.',
      });
    }

    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found.',
      });
    }

    const oldFileId = sale.receiptImageFileId;
    let storedFile = null;

    try {
      storedFile = await storeSaleReceipt({
        saleId: sale._id,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        originalName: req.file.originalname,
      });

      sale.receiptImageFileId = storedFile._id;
      sale.receiptImageFilename = storedFile.filename;
      sale.receiptImageContentType = req.file.mimetype;
      sale.receiptImageUpdatedAt = new Date();
      await sale.save();

      if (oldFileId) {
        await deleteSaleReceipt(oldFileId);
      }
    } catch (error) {
      if (storedFile?._id) {
        await deleteSaleReceipt(storedFile._id).catch(() => null);
      }
      throw error;
    }

    const refreshedSale = await saleService.getSaleById(sale._id);

    return res.status(200).json({
      success: true,
      data: serializeSale(refreshedSale),
      message: 'Receipt uploaded successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getSaleReceiptFile(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sale id.',
      });
    }

    const sale = await Sale.findById(req.params.id);
    if (!sale?.receiptImageFileId) {
      return res.status(404).json({
        success: false,
        message: 'Receipt image not found.',
      });
    }

    const file = await findSaleReceipt(sale.receiptImageFileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Receipt image not found.',
      });
    }

    res.setHeader('Content-Type', file.contentType || sale.receiptImageContentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=300');

    const downloadStream = openSaleReceiptDownloadStream(file._id);
    downloadStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Could not load receipt image right now.' });
        return;
      }
      res.end();
    });

    downloadStream.pipe(res);
  } catch (error) {
    return sendError(res, error);
  }
}

async function getSales(req, res) {
  try {
    const salesResult = await saleService.getSales(req.query);

    return res.status(200).json({
      success: true,
      data: salesResult.items.map(serializeSale),
      meta: salesResult.pagination,
      message: 'Sales loaded successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getSaleById(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sale id.',
      });
    }

    const sale = await saleService.getSaleById(req.params.id);

    return res.status(200).json({
      success: true,
      data: serializeSale(sale),
      message: 'Sale loaded successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateSale(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sale id.',
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
      data: serializeSale(sale),
      message: 'Sale updated successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function voidSale(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sale id.',
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
      data: serializeSale(sale),
      message: 'Sale voided successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  createSale,
  attachSaleReceipt,
  getSaleReceiptFile,
  getSales,
  getSaleById,
  updateSale,
  voidSale,
};
