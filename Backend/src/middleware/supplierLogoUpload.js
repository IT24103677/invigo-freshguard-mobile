const multer = require('multer');
const {
  MAX_SUPPLIER_LOGO_SIZE_BYTES,
  isAllowedSupplierLogoType,
} = require('../utils/supplierLogo');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SUPPLIER_LOGO_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!isAllowedSupplierLogoType(file?.mimetype)) {
      cb(new Error('Please upload a JPG, PNG, or WEBP image.'));
      return;
    }
    cb(null, true);
  },
});

function uploadSupplierLogo(req, res, next) {
  upload.single('logo')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Supplier logo must be 5 MB or smaller.' });
      return;
    }

    res.status(400).json({ message: error.message || 'Invalid supplier logo upload.' });
  });
}

module.exports = { uploadSupplierLogo };
