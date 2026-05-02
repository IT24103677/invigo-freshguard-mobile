const Sale = require('../models/Sale');

function buildDateFilter(query = {}) {
  if (!query.from && !query.to) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    return {
      $gte: startOfToday,
      $lt: endOfToday,
    };
  }

  const saleDateTime = {};
  if (query.from) {
    saleDateTime.$gte = new Date(query.from);
  }
  if (query.to) {
    saleDateTime.$lte = new Date(query.to);
  }

  return saleDateTime;
}

async function getDashboardSummary(query) {
  const saleDateTime = buildDateFilter(query);

  const [activeSales, voidedSalesCount, latestActiveSale] = await Promise.all([
    Sale.find({
      status: 'ACTIVE',
      saleDateTime,
    }).lean(),
    Sale.countDocuments({
      status: 'VOID',
      saleDateTime,
    }),
    Sale.findOne({
      status: 'ACTIVE',
      saleDateTime,
    })
      .sort({ saleDateTime: -1 })
      .lean(),
  ]);

  return {
    todaysRevenue: activeSales.reduce((sum, sale) => sum + sale.grandTotal, 0),
    todaysActiveBills: activeSales.length,
    todaysUnitsSold: activeSales.reduce(
      (sum, sale) => sum + sale.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0),
      0
    ),
    voidedSalesCount,
    latestActiveSale: latestActiveSale || null,
  };
}

module.exports = {
  getDashboardSummary,
};
