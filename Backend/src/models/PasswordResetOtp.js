const mongoose = require('mongoose');

const passwordResetOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  otp: { type: String, required: true },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);
