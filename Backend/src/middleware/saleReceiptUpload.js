const multer = require('multer');
const {
  MAX_SALE_RECEIPT_SIZE_BYTES,
  isAllowedSaleReceiptType,
} = require('../utils/saleReceipt');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SALE_RECEIPT_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!isAllowedSaleReceiptType(file?.mimetype)) {
      cb(new Error('Please upload a JPG, PNG, or WEBP receipt image.'));
      return;
    }

    cb(null, true);
  },
});

function uploadSaleReceipt(req, res, next) {
  upload.single('receipt')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, message: 'Receipt image must be 5 MB or smaller.' });
      return;
    }

    res.status(400).json({ success: false, message: error.message || 'Invalid receipt upload.' });
  });
}

module.exports = {
  uploadSaleReceipt,
};
