const Report   = require('../models/Report');
const Sale      = require('../models/Sale');
const Batch     = require('../models/Batch');
const Discount  = require('../models/Discount');
const createHttpError = require('../utils/httpError');
const { createReportSchema, updateReportSchema } = require('../validations/reportValidation');
const {
  storeReportAttachment,
  findReportAttachment,
  deleteReportAttachment,
  openReportAttachmentDownloadStream,
} = require('../config/gridfs');
const { verifyReportAttachmentToken } = require('../utils/reportAttachment');

// ── Summary computation ───────────────────────────────────────────────────────

async function computeSummary(type) {
  const now = new Date();

  switch (type) {

    case 'SALES': {
      const [activeSales, voidedCount] = await Promise.all([
        Sale.find({ status: 'ACTIVE' }),
        Sale.countDocuments({ status: 'VOID' }),
      ]);

      const totalRevenue  = activeSales.reduce((s, sale) => s + (sale.grandTotal || 0), 0);
      const totalSales    = activeSales.length;

      // Aggregate revenue per product across all active sales
      const productMap = {};
      activeSales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
          const key = item.productNameSnapshot || 'Unknown';
          if (!productMap[key]) productMap[key] = { name: key, revenue: 0, qty: 0 };
          productMap[key].revenue += item.lineTotal   || 0;
          productMap[key].qty     += item.quantity     || 0;
        });
      });

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      return {
        totalRevenue,
        totalSales,
        voidedSales: voidedCount,
        avgSaleValue: totalSales ? +(totalRevenue / totalSales).toFixed(2) : 0,
        topProducts,
      };
    }

    case 'INVENTORY': {
      const batches = await Batch.find({ isActive: true }).populate('productId', 'name sellingPrice');
      const totalBatches   = batches.length;
      const totalQuantity  = batches.reduce((s, b) => s + (b.quantityOnHand || 0), 0);
      const estimatedValue = batches.reduce((s, b) => {
        const price = b.productId?.sellingPrice || 0;
        return s + price * (b.quantityOnHand || 0);
      }, 0);
      return {
        totalBatches,
        totalQuantity,
        estimatedValue: +estimatedValue.toFixed(2),
      };
    }

    case 'EXPIRED': {
      const batches = await Batch
        .find({ isActive: true, expiryDate: { $lt: now } })
        .populate('productId', 'name category');
      return {
        count: batches.length,
        items: batches.slice(0, 30).map((b) => ({
          productName:    b.productId?.name    || 'Unknown',
          category:       b.productId?.category || '',
          batchNumber:    b.batchNumber,
          expiryDate:     b.expiryDate,
          quantityOnHand: b.quantityOnHand,
        })),
      };
    }

    case 'NEAR_EXPIRY': {
      const in30 = new Date(now.getTime() + 30 * 86400000);
      const batches = await Batch
        .find({ isActive: true, expiryDate: { $gte: now, $lte: in30 } })
        .sort({ expiryDate: 1 })
        .populate('productId', 'name category');
      return {
        count: batches.length,
        items: batches.slice(0, 30).map((b) => ({
          productName:    b.productId?.name    || 'Unknown',
          category:       b.productId?.category || '',
          batchNumber:    b.batchNumber,
          expiryDate:     b.expiryDate,
          daysLeft:       Math.ceil((new Date(b.expiryDate) - now) / 86400000),
          quantityOnHand: b.quantityOnHand,
        })),
      };
    }

    case 'LOW_STOCK': {
      const batches = await Batch
        .find({ isActive: true, quantityOnHand: { $gt: 0, $lte: 10 } })
        .sort({ quantityOnHand: 1 })
        .populate('productId', 'name category');
      return {
        count: batches.length,
        items: batches.slice(0, 30).map((b) => ({
          productName:    b.productId?.name    || 'Unknown',
          category:       b.productId?.category || '',
          batchNumber:    b.batchNumber,
          quantityOnHand: b.quantityOnHand,
        })),
      };
    }

    case 'DISCOUNT_USAGE': {
      const [activeSales, activeDiscounts] = await Promise.all([
        Sale.find({ status: 'ACTIVE' }),
        Discount.countDocuments({ active: true }),
      ]);

      let discountedItems = 0;
      let totalSavings    = 0;

      activeSales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
          if ((item.discountRateApplied || 0) > 0) {
            discountedItems++;
            const original = (item.unitPriceSnapshot || 0) * (item.quantity || 0);
            totalSavings  += original * (item.discountRateApplied / 100);
          }
        });
      });

      return {
        activeDiscounts,
        discountedItems,
        totalSavings: +totalSavings.toFixed(2),
      };
    }

    default:
      return {};
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

async function createReport(payload, userId, userName) {
  const { error, value } = createReportSchema.validate(payload);
  if (error) throw createHttpError(400, error.details[0].message);

  const summary = await computeSummary(value.reportType);

  const report = await Report.create({
    ...value,
    createdBy:     userId,
    createdByName: userName || '',
    summary,
  });

  return report;
}

async function getReports(query = {}, userRole = 'STAFF') {
  const filter = { isActive: true };

  // Staff can only see ALL-visibility reports
  if (userRole !== 'ADMIN') filter.visibility = 'ALL';
  // Admin can filter by visibility if requested
  else if (query.visibility) filter.visibility = query.visibility;

  return Report.find(filter).sort({ createdAt: -1 });
}

async function getReportById(id, userRole = 'STAFF') {
  const report = await Report.findById(id);
  if (!report || !report.isActive) throw createHttpError(404, 'Report not found.');
  if (userRole !== 'ADMIN' && report.visibility === 'ADMIN') {
    throw createHttpError(403, 'Access denied.');
  }
  return report;
}

async function updateReport(id, payload) {
  const { error, value } = updateReportSchema.validate(payload);
  if (error) throw createHttpError(400, error.details[0].message);

  const report = await Report.findById(id);
  if (!report || !report.isActive) throw createHttpError(404, 'Report not found.');

  if (value.reportTitle !== undefined) report.reportTitle = value.reportTitle;
  if (value.visibility  !== undefined) report.visibility  = value.visibility;

  await report.save();
  return report;
}

async function deleteReport(id) {
  const report = await Report.findById(id);
  if (!report || !report.isActive) throw createHttpError(404, 'Report not found.');
  // Clean up any attached file from GridFS
  if (report.attachmentFileId) {
    await deleteReportAttachment(report.attachmentFileId).catch(() => {});
  }
  report.isActive = false;
  await report.save();
}

// ── Attachment ────────────────────────────────────────────────────────────────

async function uploadAttachment(id, file) {
  const report = await Report.findById(id);
  if (!report || !report.isActive) throw createHttpError(404, 'Report not found.');

  // Delete old attachment if exists
  if (report.attachmentFileId) {
    await deleteReportAttachment(report.attachmentFileId).catch(() => {});
  }

  const stored = await storeReportAttachment({
    reportId:     id,
    buffer:       file.buffer,
    mimetype:     file.mimetype,
    originalName: file.originalname,
  });

  report.attachmentFileId      = stored._id;
  report.attachmentFilename    = stored.filename;
  report.attachmentContentType = stored.contentType;
  report.attachmentOriginalName = file.originalname;
  report.attachmentUpdatedAt   = new Date();
  await report.save();
  return report;
}

async function removeAttachment(id) {
  const report = await Report.findById(id);
  if (!report || !report.isActive) throw createHttpError(404, 'Report not found.');
  if (!report.attachmentFileId)    throw createHttpError(404, 'No attachment found.');

  await deleteReportAttachment(report.attachmentFileId).catch(() => {});

  report.attachmentFileId       = null;
  report.attachmentFilename     = '';
  report.attachmentContentType  = '';
  report.attachmentOriginalName = '';
  report.attachmentUpdatedAt    = null;
  await report.save();
}

async function streamAttachment(id, res, options = {}) {
  const report = await Report.findById(id);
  if (!report || !report.isActive)  throw createHttpError(404, 'Report not found.');
  if (!report.attachmentFileId)     throw createHttpError(404, 'No attachment found.');

  const hasSignedAccess = verifyReportAttachmentToken(options.attachmentToken, report.id);
  const userRole = String(options.userRole || '').toUpperCase();

  if (!hasSignedAccess) {
    if (!userRole) {
      throw createHttpError(401, 'Authentication required to access this attachment.');
    }
    if (userRole !== 'ADMIN' && report.visibility === 'ADMIN') {
      throw createHttpError(403, 'Access denied.');
    }
  }

  const fileMeta = await findReportAttachment(report.attachmentFileId);
  if (!fileMeta) throw createHttpError(404, 'Attachment file missing from storage.');

  res.set('Content-Type',        report.attachmentContentType  || 'application/octet-stream');
  res.set('Content-Disposition', `inline; filename="${encodeURIComponent(report.attachmentOriginalName || 'attachment')}"`);
  res.set('Cache-Control',       'private, max-age=3600');

  const stream = openReportAttachmentDownloadStream(report.attachmentFileId);
  stream.pipe(res);
}

// ── Overview dashboard (used by the Reports page top stats) ──────────────────

async function getOverviewStats() {
  const now        = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalSalesCount,
    todaySalesCount,
    expiredBatches,
    lowStockBatches,
    activeDiscounts,
    totalReports,
  ] = await Promise.all([
    Sale.countDocuments({ status: 'ACTIVE' }),
    Sale.countDocuments({ status: 'ACTIVE', saleDateTime: { $gte: startOfDay } }),
    Batch.countDocuments({ isActive: true, expiryDate: { $lt: now } }),
    Batch.countDocuments({ isActive: true, quantityOnHand: { $gt: 0, $lte: 10 } }),
    Discount.countDocuments({ active: true }),
    Report.countDocuments({ isActive: true }),
  ]);

  return {
    totalSalesCount,
    todaySalesCount,
    expiredBatches,
    lowStockBatches,
    activeDiscounts,
    totalReports,
  };
}

module.exports = {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  uploadAttachment,
  removeAttachment,
  streamAttachment,
  getOverviewStats,
};
