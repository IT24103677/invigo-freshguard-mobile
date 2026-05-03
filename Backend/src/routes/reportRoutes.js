const express            = require('express');
const router             = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const attachmentUpload   = require('../middleware/reportAttachmentUpload');
const ctrl               = require('../controllers/reportController');

// GET /api/reports/:id/attachment  — signed URL or authenticated access
router.get('/:id/attachment', ctrl.getAttachment);

// GET /api/reports/overview  — all authenticated users
router.get('/overview', protect, ctrl.getOverview);

// GET /api/reports            — staff sees ALL-visibility; admin sees all (filter via ?visibility=)
router.get('/',         protect, ctrl.getReports);

// POST /api/reports           — admin only: generate + store a report
router.post('/',        protect, adminOnly, ctrl.createReport);

// GET /api/reports/:id
router.get('/:id',      protect, ctrl.getReportById);

// PUT /api/reports/:id        — admin only (update title / visibility)
router.put('/:id',      protect, adminOnly, ctrl.updateReport);

// DELETE /api/reports/:id     — admin only
router.delete('/:id',   protect, adminOnly, ctrl.deleteReport);

// POST   /api/reports/:id/attachment  — admin only, upload any doc/image (10 MB)
router.post('/:id/attachment',   protect, adminOnly, attachmentUpload, ctrl.uploadAttachment);

// DELETE /api/reports/:id/attachment  — admin only
router.delete('/:id/attachment', protect, adminOnly, ctrl.removeAttachment);

module.exports = router;
