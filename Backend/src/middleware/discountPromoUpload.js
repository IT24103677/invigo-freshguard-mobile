const multer = require('multer');
const {
  MAX_DISCOUNT_PROMO_IMAGE_SIZE_BYTES,
  isAllowedDiscountPromoImageType,
} = require('../utils/discountPromoImage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DISCOUNT_PROMO_IMAGE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!isAllowedDiscountPromoImageType(file?.mimetype)) {
      cb(new Error('Please upload a JPG, PNG, or WEBP image.'));
      return;
    }
    cb(null, true);
  },
});

function uploadDiscountPromoImage(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Promotion image must be 5 MB or smaller.' });
      return;
    }

    res.status(400).json({ message: error.message || 'Invalid promotion image upload.' });
  });
}

module.exports = { uploadDiscountPromoImage };
