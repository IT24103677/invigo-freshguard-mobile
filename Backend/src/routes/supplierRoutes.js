const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const {
  getSuppliers,
  createSupplier,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.get('/:id', getSupplierById);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

module.exports = router;
