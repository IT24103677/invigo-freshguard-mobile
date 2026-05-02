const multer = require('multer');
const {
  MAX_PROFILE_IMAGE_SIZE_BYTES,
  isAllowedProfileImageType,
} = require('../utils/profileImage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROFILE_IMAGE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!isAllowedProfileImageType(file?.mimetype)) {
      cb(new Error('Please upload a JPG, PNG, or WEBP image.'));
      return;
    }

    cb(null, true);
  },
});

function uploadProfileImage(req, res, next) {
  upload.single('avatar')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Profile photo must be 5 MB or smaller.' });
      return;
    }

    res.status(400).json({ message: error.message || 'Invalid profile photo upload.' });
  });
}

module.exports = {
  uploadProfileImage,
};
