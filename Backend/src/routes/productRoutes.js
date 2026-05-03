const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadProductImage } = require('../middleware/productImageUpload');
const productController = require('../controllers/productController');

const router = express.Router();

router.use(protect);
router.post('/', adminOnly, productController.createProduct);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', adminOnly, productController.updateProduct);
router.delete('/:id', adminOnly, productController.deleteProduct);
router.post('/:id/image', adminOnly, uploadProductImage, productController.uploadProductImage);
router.get('/:id/image', productController.getProductImage);

module.exports = router;
