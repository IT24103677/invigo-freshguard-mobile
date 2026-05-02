const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const batchController = require('../controllers/batchController');

const router = express.Router();

router.use(protect);
router.post('/', adminOnly, batchController.createBatch);
router.get('/', batchController.getBatches);
router.get('/:id', batchController.getBatchById);

module.exports = router;
