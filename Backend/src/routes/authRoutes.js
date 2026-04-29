const express = require('express');
const { protect } = require('../middleware/auth');
const {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getCurrentUser,
  changeMyPassword,
} = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getCurrentUser);
router.put('/me/password', protect, changeMyPassword);

module.exports = router;
