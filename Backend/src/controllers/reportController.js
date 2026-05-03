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

// GET /api/reports/overview
exports.getOverview = asyncHandler(async (req, res) => {
  const stats = await getOverviewStats();
  res.json({ data: stats });
});

// GET /api/reports
exports.getReports = asyncHandler(async (req, res) => {
  const role    = req.user?.role || 'STAFF';
  const reports = await getReports(req.query, role);
  res.json({ data: reports });
});

// GET /api/reports/:id
exports.getReportById = asyncHandler(async (req, res) => {
  const role   = req.user?.role || 'STAFF';
  const report = await getReportById(req.params.id, role);
  res.json({ data: report });
});

// POST /api/reports  (admin only)
exports.createReport = asyncHandler(async (req, res) => {
  const userName = req.user?.name || req.user?.username || '';
  const report   = await createReport(req.body, req.user.id, userName);
  res.status(201).json({ data: report });
});

// PUT /api/reports/:id  (admin only) — update title / visibility
exports.updateReport = asyncHandler(async (req, res) => {
  const report = await updateReport(req.params.id, req.body);
  res.json({ data: report });
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
  res.json({ data: report });
});

// GET /api/reports/:id/attachment  (protect)
exports.getAttachment = asyncHandler(async (req, res) => {
  await streamAttachment(req.params.id, res);
});

// DELETE /api/reports/:id/attachment  (admin only)
exports.removeAttachment = asyncHandler(async (req, res) => {
  await removeAttachment(req.params.id);
  res.json({ message: 'Attachment removed.' });
});
