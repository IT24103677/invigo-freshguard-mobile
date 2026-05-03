const multer = require('multer');
const {
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  isAllowedProductImageType,
} = require('../utils/productImage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PRODUCT_IMAGE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!isAllowedProductImageType(file?.mimetype)) {
      cb(new Error('Please upload a JPG, PNG, or WEBP image.'));
      return;
    }
    cb(null, true);
  },
});

function uploadProductImage(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Product image must be 5 MB or smaller.' });
      return;
    }

    res.status(400).json({ message: error.message || 'Invalid product image upload.' });
  });
}

module.exports = { uploadProductImage };
