const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadBatchDocument } = require('../middleware/batchDocumentUpload');
const batchController = require('../controllers/batchController');

const router = express.Router();

router.get('/:id/document', batchController.getBatchDocument);

router.use(protect);
router.post('/', adminOnly, batchController.createBatch);
router.get('/', batchController.getBatches);
router.get('/:id', batchController.getBatchById);
router.put('/:id', adminOnly, batchController.updateBatch);
router.delete('/:id', adminOnly, batchController.deleteBatch);
router.post('/:id/document', adminOnly, uploadBatchDocument, batchController.uploadBatchDocument);

module.exports = router;
