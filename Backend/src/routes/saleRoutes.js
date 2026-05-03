const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadSaleReceipt } = require('../middleware/saleReceiptUpload');
const saleController = require('../controllers/saleController');

const router = express.Router();

router.get('/:id/receipt-file', saleController.getSaleReceiptFile);

router.use(protect);

router.post('/', saleController.createSale);
router.post('/:id/receipt', uploadSaleReceipt, saleController.attachSaleReceipt);
router.get('/', saleController.getSales);
router.get('/:id', saleController.getSaleById);
router.put('/:id', saleController.updateSale);
router.post('/:id/void', adminOnly, saleController.voidSale);

module.exports = router;
