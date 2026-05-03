const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadSupplierLogo } = require('../middleware/supplierLogoUpload');
const {
  getSuppliers,
  createSupplier,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  uploadSupplierLogoHandler,
  getSupplierLogoHandler,
} = require('../controllers/supplierController');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.get('/:id', getSupplierById);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);
router.post('/:id/logo', uploadSupplierLogo, uploadSupplierLogoHandler);
router.get('/:id/logo', getSupplierLogoHandler);

module.exports = router;
