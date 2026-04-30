const dashboardService = require("../services/dashboardService");

const getDashboardSummary = async (req, res) => {
  try {
    const summary = await dashboardService.getDashboardSummary();

    return res.status(200).json({
      success: true,
      data: summary,
      message: "Dashboard summary fetched successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard summary.",
    });
  }
};

module.exports = {
  getDashboardSummary,
};
