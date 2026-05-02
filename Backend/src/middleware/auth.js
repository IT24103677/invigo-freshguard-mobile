const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: 'No token. Please login again.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'User not found or inactive.' });
    }

    if (user.accountLocked) {
      return res.status(401).json({ message: 'Account is locked. Please contact admin.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token. Please login again.' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || String(req.user.role).toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}

module.exports = { protect, adminOnly };
