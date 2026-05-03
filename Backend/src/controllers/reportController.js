const asyncHandler = require('../utils/asyncHandler');
const {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  uploadAttachment,
  removeAttachment,
  streamAttachment,
  getOverviewStats,
} = require('../services/reportService');
const { buildReportAttachmentPath } = require('../utils/reportAttachment');

function serializeReport(report) {
  const data = report?.toJSON ? report.toJSON() : { ...report };
  return {
    ...data,
    attachmentUrl: buildReportAttachmentPath({
      ...data,
      attachmentFileId: report?.attachmentFileId || data.attachmentFileId,
      attachmentUpdatedAt: report?.attachmentUpdatedAt || data.attachmentUpdatedAt,
    }) || null,
  };
}

// GET /api/reports/overview
exports.getOverview = asyncHandler(async (req, res) => {
  const stats = await getOverviewStats();
  res.json({ data: stats });
});

// GET /api/reports
exports.getReports = asyncHandler(async (req, res) => {
  const role    = req.user?.role || 'STAFF';
  const reports = await getReports(req.query, role);
  res.json({ data: reports.map(serializeReport) });
});

// GET /api/reports/:id
exports.getReportById = asyncHandler(async (req, res) => {
  const role   = req.user?.role || 'STAFF';
  const report = await getReportById(req.params.id, role);
  res.json({ data: serializeReport(report) });
});

// POST /api/reports  (admin only)
exports.createReport = asyncHandler(async (req, res) => {
  const userName = req.user?.name || req.user?.username || '';
  const report   = await createReport(req.body, req.user.id, userName);
  res.status(201).json({ data: serializeReport(report) });
});

// PUT /api/reports/:id  (admin only) — update title / visibility
exports.updateReport = asyncHandler(async (req, res) => {
  const report = await updateReport(req.params.id, req.body);
  res.json({ data: serializeReport(report) });
});

// DELETE /api/reports/:id  (admin only)
exports.deleteReport = asyncHandler(async (req, res) => {
  await deleteReport(req.params.id);
  res.json({ message: 'Report deleted.' });
});

// POST /api/reports/:id/attachment  (admin only)
exports.uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) throw require('../utils/httpError')(400, 'No file uploaded.');
  const report = await uploadAttachment(req.params.id, req.file);
  res.json({ data: serializeReport(report) });
});

// GET /api/reports/:id/attachment
exports.getAttachment = asyncHandler(async (req, res) => {
  await streamAttachment(req.params.id, res, {
    userRole: req.user?.role || null,
    attachmentToken: req.query.attachmentToken,
  });
});

// DELETE /api/reports/:id/attachment  (admin only)
exports.removeAttachment = asyncHandler(async (req, res) => {
  await removeAttachment(req.params.id);
  res.json({ message: 'Attachment removed.' });
});
