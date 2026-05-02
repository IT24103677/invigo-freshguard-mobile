const express = require('express');
const {
  getInventoryBatches,
  createInventoryBatch,
  updateInventoryBatch,
  deleteInventoryBatch,
} = require('../controllers/inventoryBatchController');

const router = express.Router();

router.get('/', getInventoryBatches);
router.post('/', createInventoryBatch);
router.put('/:id', updateInventoryBatch);
router.delete('/:id', deleteInventoryBatch);

module.exports = router;
