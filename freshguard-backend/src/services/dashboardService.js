const Sale = require("../models/Sale");

const getDashboardSummary = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [todaysActiveSales, voidedSalesCount, latestActiveSale] =
    await Promise.all([
      Sale.find({
        status: "ACTIVE",
        saleDateTime: {
          $gte: startOfToday,
          $lt: endOfToday,
        },
      }).lean(),
      Sale.countDocuments({ status: "VOID" }),
      Sale.findOne({ status: "ACTIVE" }).sort({ saleDateTime: -1 }).lean(),
    ]);

  return {
    todaysRevenue: todaysActiveSales.reduce(
      (sum, sale) => sum + sale.grandTotal,
      0
    ),
    todaysActiveBills: todaysActiveSales.length,
    todaysUnitsSold: todaysActiveSales.reduce(
      (sum, sale) =>
        sum +
        sale.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0),
      0
    ),
    voidedSalesCount,
    latestActiveSale: latestActiveSale ?? null,
  };
};

module.exports = {
  getDashboardSummary,
};
