const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const productController = require('../controllers/productController');

const router = express.Router();

router.use(protect);
router.post('/', adminOnly, productController.createProduct);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

module.exports = router;
