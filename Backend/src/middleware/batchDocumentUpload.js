const multer = require('multer');
const {
  MAX_BATCH_DOCUMENT_SIZE_BYTES,
  isAllowedBatchDocumentType,
} = require('../utils/batchDocument');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BATCH_DOCUMENT_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!isAllowedBatchDocumentType(file?.mimetype)) {
      cb(new Error('Please upload a JPG, PNG, WEBP, or PDF document.'));
      return;
    }
    cb(null, true);
  },
});

function uploadBatchDocument(req, res, next) {
  upload.single('document')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Batch document must be 10 MB or smaller.' });
      return;
    }

    res.status(400).json({ message: error.message || 'Invalid batch document upload.' });
  });
}

module.exports = { uploadBatchDocument };
