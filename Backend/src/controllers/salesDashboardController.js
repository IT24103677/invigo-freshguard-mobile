const dashboardService = require('../services/dashboardService');

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: error.message || 'Something went wrong.',
  });
}

async function getDashboardSummary(req, res) {
  try {
    const summary = await dashboardService.getDashboardSummary(req.query);
    return res.status(200).json({
      success: true,
      data: summary,
      message: 'Dashboard summary loaded successfully.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  getDashboardSummary,
};
