const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadProfileImage } = require('../middleware/upload');
const {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getCurrentUser,
  uploadMyProfileAvatar,
  getMyProfileAvatar,
  changeMyPassword,
} = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.put('/me/avatar', protect, uploadProfileImage, uploadMyProfileAvatar);
router.get('/me/avatar', protect, getMyProfileAvatar);
router.get('/me', protect, getCurrentUser);
router.put('/me/password', protect, changeMyPassword);

module.exports = router;
