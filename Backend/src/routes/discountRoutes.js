const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadDiscountPromoImage } = require('../middleware/discountPromoUpload');
const discountController = require('../controllers/discountController');

const router = express.Router();

router.get('/:id/image', discountController.getPromoImage);

router.use(protect);

router.get('/',        discountController.getDiscounts);
router.post('/',       adminOnly, discountController.createDiscount);
router.get('/:id',     discountController.getDiscountById);
router.put('/:id',     adminOnly, discountController.updateDiscount);
router.delete('/:id',  adminOnly, discountController.deleteDiscount);
router.post('/:id/toggle', adminOnly, discountController.toggleDiscount);
router.post('/:id/image',  adminOnly, uploadDiscountPromoImage, discountController.uploadPromoImage);

module.exports = router;
