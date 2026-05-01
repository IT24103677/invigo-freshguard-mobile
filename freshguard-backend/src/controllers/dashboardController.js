const dashboardService = require("../services/dashboardService");

const getDashboardSummary = async (req, res) => {
  try {
    const summary = await dashboardService.getDashboardSummary(req.query);

    return res.status(200).json({
      success: true,
      data: summary,
      message: "Dashboard summary loaded successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not load the dashboard summary.",
    });
  }
};

module.exports = {
  getDashboardSummary,
};
