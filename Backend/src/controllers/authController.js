const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const signToken = require('../utils/token');
const asyncHandler = require('../utils/asyncHandler');
const { sendMail } = require('../utils/mailer');
const buildPasswordResetEmail = require('../utils/passwordResetEmail');
const { buildProfileImagePath, readProfileImageToken } = require('../utils/profileImage');
const {
  storeProfileImage,
  findProfileImage,
  deleteProfileImage,
  openProfileImageDownloadStream,
} = require('../config/gridfs');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,30}$/;

function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email || '').trim().toLowerCase());
}

function isStrongPassword(password) {
  return STRONG_PASSWORD_REGEX.test(String(password || ''));
}

function buildAuthUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    name: user.name,
    doj: user.doj,
    role: user.role,
    avatarPath: buildProfileImagePath(user),
    avatarUpdatedAt: user.profileImageUpdatedAt,
    accountLocked: user.accountLocked,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
  };
}

async function saveLoginLog(req, payload) {
  try {
    await LoginHistory.create({
      ...payload,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
  } catch (error) {
    console.error('Failed to save login log:', error.message);
  }
}

const login = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const identifier = String(email || username || '').trim().toLowerCase();

  if (!identifier || !password) {
    await saveLoginLog(req, {
      username: identifier,
      status: 'FAILED',
      reason: 'Missing credentials',
    });
    return res.status(400).json({ message: 'Username/email and password are required.' });
  }

  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  }).select('+password');

  if (!user) {
    await saveLoginLog(req, {
      username: identifier,
      status: 'FAILED',
      reason: 'User not found',
    });
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  if (String(user.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
    await saveLoginLog(req, {
      user: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: 'FAILED',
      reason: 'Inactive account',
    });
    return res.status(403).json({ message: 'Account is inactive. Please contact admin.' });
  }

  if (user.accountLocked) {
    await saveLoginLog(req, {
      user: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: 'FAILED',
      reason: 'Account locked',
    });
    return res.status(403).json({ message: 'Account is locked. Please contact admin.' });
  }

  const matched = await user.matchPassword(password);
  if (!matched) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) user.accountLocked = true;
    await user.save();

    await saveLoginLog(req, {
      user: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: 'FAILED',
      reason: 'Wrong password',
    });
    return res.status(401).json({
      message: user.accountLocked ? 'Too many wrong attempts. Account locked.' : 'Invalid credentials.',
    });
  }

  user.failedLoginAttempts = 0;
  user.lastLoginAt = new Date();
  await user.save();

  await saveLoginLog(req, {
    user: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: 'SUCCESS',
    reason: 'Login success',
  });

  const token = signToken(user);
  return res.json({
    token,
    ...buildAuthUser(user),
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  if (!isValidEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });

  const user = await User.findOne({ email });
  if (!user || String(user.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
    return res.json({
      message: 'If an account exists for that email, password reset instructions have been generated.',
    });
  }

  const otp = makeOtp();
  await PasswordResetOtp.deleteMany({ email });
  await PasswordResetOtp.create({
    email,
    otp,
    verified: false,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  try {
    const emailMessage = buildPasswordResetEmail({
      name: user.name || user.username || 'Invigo user',
      otp,
      expiresInMinutes: 10,
    });

    await sendMail({
      to: email,
      subject: emailMessage.subject,
      html: emailMessage.html,
      text: emailMessage.text,
    });
  } catch (error) {
    await PasswordResetOtp.deleteMany({ email });
    console.error('Failed to send password reset email:', error.message);
    return res.status(500).json({ message: 'Unable to send reset email right now. Please try again shortly.' });
  }

  return res.json({
    message: 'If an account exists for that email, a password reset code has been sent.',
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();

  const record = await PasswordResetOtp.findOne({ email, otp }).sort({ createdAt: -1 });
  if (!record) return res.status(400).json({ message: 'Invalid OTP.' });
  if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired. Please request again.' });

  record.verified = true;
  await record.save();
  return res.json({ message: 'OTP verified.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const newPassword = String(req.body.newPassword || '');

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      message: 'Password must be 8 to 30 characters and include uppercase, lowercase, and a number.',
    });
  }

  const record = await PasswordResetOtp.findOne({ email, verified: true }).sort({ createdAt: -1 });
  if (!record) return res.status(400).json({ message: 'Please verify OTP before resetting password.' });
  if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired. Please request again.' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (String(user.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
    return res.status(403).json({ message: 'Account is inactive. Please contact admin.' });
  }

  user.password = newPassword;
  user.accountLocked = false;
  user.failedLoginAttempts = 0;
  await user.save();

  await PasswordResetOtp.deleteMany({ email });
  return res.json({ message: 'Password reset successful.' });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.json(buildAuthUser(req.user));
});

const uploadMyProfileAvatar = asyncHandler(async (req, res) => {
  if (String(req.user?.role || '').toUpperCase() !== 'STAFF') {
    return res.status(403).json({ message: 'Only staff can manage profile photos here.' });
  }

  if (!req.file?.buffer) {
    return res.status(400).json({ message: 'Please choose a profile photo to upload.' });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (String(user.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
    return res.status(403).json({ message: 'Account is inactive. Please contact admin.' });
  }

  const oldFileId = user.profileImageFileId;
  let storedFile = null;

  try {
    storedFile = await storeProfileImage({
      userId: user._id,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
    });

    user.profileImageFileId = storedFile._id;
    user.profileImageFilename = storedFile.filename;
    user.profileImageContentType = req.file.mimetype;
    user.profileImageUpdatedAt = new Date();
    await user.save();

    if (oldFileId) {
      await deleteProfileImage(oldFileId);
    }
  } catch (error) {
    if (storedFile?._id) {
      await deleteProfileImage(storedFile._id).catch(() => null);
    }
    throw error;
  }

  return res.json({
    message: 'Profile photo updated successfully.',
    user: buildAuthUser(user),
  });
});

const getMyProfileAvatar = asyncHandler(async (req, res) => {
  const tokenPayload = readProfileImageToken(req.query.profileImageToken);
  if (!tokenPayload?.userId) {
    return res.status(401).json({ message: 'Invalid or expired profile photo link.' });
  }

  const user = await User.findById(tokenPayload.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (String(user.role || '').toUpperCase() !== 'STAFF') {
    return res.status(403).json({ message: 'Only staff can view profile photos here.' });
  }

  if (String(user.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
    return res.status(403).json({ message: 'Account is inactive. Please contact admin.' });
  }

  const currentUpdatedAt = user.profileImageUpdatedAt
    ? new Date(user.profileImageUpdatedAt).toISOString()
    : '';

  if (tokenPayload.updatedAt !== currentUpdatedAt) {
    return res.status(401).json({ message: 'Profile photo link is no longer valid.' });
  }

  if (!user.profileImageFileId) {
    return res.status(404).json({ message: 'No profile photo uploaded yet.' });
  }

  const file = await findProfileImage(user.profileImageFileId);
  if (!file) {
    return res.status(404).json({ message: 'Profile photo not found.' });
  }

  res.setHeader('Content-Type', file.contentType || user.profileImageContentType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=300');

  const downloadStream = openProfileImageDownloadStream(file._id);
  downloadStream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Could not load profile photo right now.' });
      return;
    }

    res.end();
  });

  downloadStream.pipe(res);
});

const changeMyPassword = asyncHandler(async (req, res) => {
  if (String(req.user?.role || '').toUpperCase() !== 'STAFF') {
    return res.status(403).json({ message: 'Only staff can manage their profile password here.' });
  }

  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Current password, new password, and confirmation are required.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New password and confirmation do not match.' });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'New password must be different from your current password.' });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      message: 'Password must be 8 to 30 characters and include uppercase, lowercase, and a number.',
    });
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (String(user.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
    return res.status(403).json({ message: 'Account is inactive. Please contact admin.' });
  }

  const matched = await user.matchPassword(currentPassword);
  if (!matched) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  user.failedLoginAttempts = 0;
  user.accountLocked = false;
  await user.save();

  res.json({ message: 'Password updated successfully.' });
});

module.exports = {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getCurrentUser,
  uploadMyProfileAvatar,
  getMyProfileAvatar,
  changeMyPassword,
};
