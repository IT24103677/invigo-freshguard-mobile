const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,30}$/;

function safeUser(user) {
  const obj = user.toJSON ? user.toJSON() : user;
  return {
    ...obj,
    id: obj.id || obj._id?.toString(),
    password: undefined,
  };
}

function parseUserRole(role) {
  const cleanRole = String(role || '').trim().toUpperCase();
  if (!cleanRole) return null;
  if (!['ADMIN', 'STAFF'].includes(cleanRole)) return null;
  return cleanRole;
}

function parseUserStatus(status) {
  const cleanStatus = String(status || '').trim().toUpperCase();
  if (!cleanStatus) return null;
  if (!['ACTIVE', 'INACTIVE'].includes(cleanStatus)) return null;
  return cleanStatus;
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email || '').trim().toLowerCase());
}

function isStrongPassword(password) {
  return STRONG_PASSWORD_REGEX.test(String(password || ''));
}

function isValidDateOnly(value) {
  const clean = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return false;
  const date = new Date(`${clean}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === clean;
}

function getTodayDateOnly() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isFutureDateOnly(value) {
  return String(value || '').trim() > getTodayDateOnly();
}

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users.map(safeUser));
});

const createUser = asyncHandler(async (req, res) => {
  const { username, email, password, name, doj, role } = req.body;

  if (!username || !name || !role || !email || !doj || !password) {
    return res.status(400).json({ message: 'Username, full name, email, joining date, role, and password are required.' });
  }

  const parsedRole = parseUserRole(role);
  if (!parsedRole) {
    return res.status(400).json({ message: 'Role must be ADMIN or STAFF.' });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim();
  const cleanDoj = String(doj).trim();

  if (!USERNAME_REGEX.test(cleanUsername)) {
    return res.status(400).json({ message: 'Username must be 3 to 30 characters using letters, numbers, dots, hyphens, or underscores.' });
  }

  if (cleanName.length < 3) {
    return res.status(400).json({ message: 'Full name must be at least 3 characters.' });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  if (!isValidDateOnly(cleanDoj)) {
    return res.status(400).json({ message: 'Joining date must be a valid date in YYYY-MM-DD format.' });
  }

  if (isFutureDateOnly(cleanDoj)) {
    return res.status(400).json({ message: 'Joining date cannot be in the future.' });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message: 'Password must be 8 to 30 characters and include uppercase, lowercase, and a number.',
    });
  }

  const existing = await User.findOne({
    $or: [
      { username: cleanUsername },
      { email: cleanEmail },
    ],
  });

  if (existing) {
    return res.status(409).json({ message: 'Username or email already exists.' });
  }

  const user = await User.create({
    username: cleanUsername,
    email: cleanEmail,
    password,
    name: cleanName,
    doj: cleanDoj,
    role: parsedRole,
  });

  res.status(201).json(safeUser(user));
});

const updateUser = asyncHandler(async (req, res) => {
  const { username, email, password, name, doj, role, accountLocked, status } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) return res.status(404).json({ message: 'User not found.' });
  const targetIsAdmin = String(user.role || '').toUpperCase() === 'ADMIN';

  const cleanUsername = username ? String(username).trim().toLowerCase() : undefined;
  const cleanEmail = email !== undefined ? String(email || '').trim().toLowerCase() : undefined;
  const cleanName = name !== undefined ? String(name).trim() : undefined;
  const cleanDoj = doj !== undefined ? String(doj).trim() : undefined;
  const parsedStatus = status !== undefined ? parseUserStatus(status) : undefined;

  if (targetIsAdmin) {
    return res.status(403).json({
      message: 'Admin accounts cannot be edited from this screen.',
    });
  }

  if (role !== undefined) {
    const parsedRole = parseUserRole(role);
    if (!parsedRole) {
      return res.status(400).json({ message: 'Role must be ADMIN or STAFF.' });
    }
    user.role = parsedRole;
  }

  if (status !== undefined && !parsedStatus) {
    return res.status(400).json({ message: 'Status must be ACTIVE or INACTIVE.' });
  }

  if (cleanUsername !== undefined && !USERNAME_REGEX.test(cleanUsername)) {
    return res.status(400).json({ message: 'Username must be 3 to 30 characters using letters, numbers, dots, hyphens, or underscores.' });
  }

  if (cleanName !== undefined && cleanName.length < 3) {
    return res.status(400).json({ message: 'Full name must be at least 3 characters.' });
  }

  if (email !== undefined && !cleanEmail) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  if (cleanEmail !== undefined && !isValidEmail(cleanEmail)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  if (cleanDoj !== undefined && !isValidDateOnly(cleanDoj)) {
    return res.status(400).json({ message: 'Joining date must be a valid date in YYYY-MM-DD format.' });
  }

  if (cleanDoj !== undefined && isFutureDateOnly(cleanDoj)) {
    return res.status(400).json({ message: 'Joining date cannot be in the future.' });
  }

  if (password && !isStrongPassword(password)) {
    return res.status(400).json({
      message: 'Password must be 8 to 30 characters and include uppercase, lowercase, and a number.',
    });
  }

  const duplicateChecks = [];
  if (cleanUsername && cleanUsername !== user.username) duplicateChecks.push({ username: cleanUsername });
  if (email !== undefined && cleanEmail !== user.email) duplicateChecks.push({ email: cleanEmail });

  if (duplicateChecks.length) {
    const existing = await User.findOne({
      _id: { $ne: user._id },
      $or: duplicateChecks,
    });

    if (existing) {
      return res.status(409).json({ message: 'Username or email already exists.' });
    }
  }

  if (username) user.username = cleanUsername;
  if (email !== undefined) user.email = cleanEmail;
  if (cleanName !== undefined) user.name = cleanName;
  if (cleanDoj !== undefined) user.doj = cleanDoj;
  if (password) user.password = password;
  if (accountLocked !== undefined) user.accountLocked = Boolean(accountLocked);
  if (parsedStatus) user.status = parsedStatus;

  await user.save();
  res.json(safeUser(user));
});

const deleteUserAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  if (String(user.role).toUpperCase() === 'ADMIN') {
    return res.status(400).json({ message: 'Admin accounts can be edited here, but they cannot be deleted from this screen.' });
  }

  await User.findByIdAndDelete(user._id);
  res.json({ message: 'User deleted successfully.' });
});

const unlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  user.accountLocked = false;
  user.failedLoginAttempts = 0;
  await user.save();
  res.json(safeUser(user));
});

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUserAccount,
  unlockUser,
};
