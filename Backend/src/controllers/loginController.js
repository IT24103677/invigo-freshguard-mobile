const LoginHistory = require('../models/LoginHistory');
const asyncHandler = require('../utils/asyncHandler');

const getLoginHistory = asyncHandler(async (req, res) => {
  const logins = await LoginHistory.find().sort({ loginTime: -1 }).limit(100);
  res.json(logins);
});

module.exports = {
  getLoginHistory,
};
