/**
 * Alert Controller
 * ─────────────────
 * Generates and manages inventory risk alerts based on:
 *  1. Near-expiry batches (within X days)
 *  2. Low stock levels (below reorder point)
 *  3. HIGH risk AI classifications
 *
 * Assumes you have an Inventory model available.
 * Adjust import paths to match your project structure.
 */

// ─── Adjust these imports to your project ────────────────────────────────────
// const Inventory = require("../models/Inventory");
// const Product   = require("../models/Product");

const EXPIRY_WARNING_DAYS = 30; // flag batches expiring within 30 days
const LOW_STOCK_THRESHOLD = 10; // flag batches with qty ≤ 10

// ─── Helper: days until a date ────────────────────────────────────────────────
const daysUntil = (dateStr) => {
  if (!dateStr) return Infinity;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ─── Helper: determine alert level ───────────────────────────────────────────
const getAlertLevel = (daysLeft, qty, aiRisk) => {
  if (aiRisk === "HIGH" || daysLeft <= 7 || qty === 0) return "CRITICAL";
  if (daysLeft <= 14 || qty <= 5) return "HIGH";
  if (daysLeft <= EXPIRY_WARNING_DAYS || qty <= LOW_STOCK_THRESHOLD) return "MEDIUM";
  return "LOW";
};

// ─── GET /api/alerts ──────────────────────────────────────────────────────────
exports.getAlerts = async (req, res) => {
  try {
    /*
     * ── REPLACE the mock data below with your real DB query ─────────────────
     *
     * Example with Mongoose:
     *
     *   const inventory = await Inventory.find({}).lean();
     *   const products  = await Product.find({}).lean();
     *   const prodMap   = Object.fromEntries(products.map(p => [p._id, p]));
     *
     * ─────────────────────────────────────────────────────────────────────────
     */

    // ── MOCK DATA – delete once DB is connected ──────────────────────────────
    const inventory = req.app.locals.inventoryService
      ? await req.app.locals.inventoryService.getAll()
      : [];
    // ────────────────────────────────────────────────────────────────────────

    const { level, productId } = req.query;

    // Build alert objects from inventory batches
    let alerts = inventory.map((item) => {
      const daysLeft = daysUntil(item.expiryDate);
      const alertLevel = getAlertLevel(daysLeft, item.quantity, item.riskLevel);

      return {
        id: item.id || item._id,
        productId: item.productId,
        productName: item.productName || `Product #${item.productId}`,
        batchId: item.id,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        expiryDate: item.expiryDate,
        daysUntilExpiry: daysLeft === Infinity ? null : daysLeft,
        sellingPrice: item.sellingPrice,
        costPrice: item.costPrice,
        riskLevel: item.riskLevel || "LOW",
        alertLevel,
        suggestedDiscount: item.suggestedDiscount || null,
        reasons: buildReasons(daysLeft, item.quantity, item.riskLevel),
        createdAt: new Date().toISOString(),
      };
    });

    // Filter out LOW alerts (they don't need attention)
    alerts = alerts.filter((a) => a.alertLevel !== "LOW");

    // Apply query filters
    if (level) alerts = alerts.filter((a) => a.alertLevel === level.toUpperCase());
    if (productId) alerts = alerts.filter((a) => String(a.productId) === String(productId));

    // Sort: CRITICAL first, then by days until expiry ascending
    alerts.sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const levelDiff = (order[a.alertLevel] ?? 9) - (order[b.alertLevel] ?? 9);
      if (levelDiff !== 0) return levelDiff;
      return (a.daysUntilExpiry ?? 9999) - (b.daysUntilExpiry ?? 9999);
    });

    return res.status(200).json({
      alerts,
      summary: buildSummary(alerts),
    });
  } catch (err) {
    console.error("[Alert] getAlerts error:", err);
    return res.status(500).json({ message: "Failed to generate alerts" });
  }
};

// ─── GET /api/alerts/summary ──────────────────────────────────────────────────
exports.getAlertSummary = async (req, res) => {
  try {
    // Re-use the same logic but only return counts
    const allAlerts = []; // replace with real query
    return res.status(200).json(buildSummary(allAlerts));
  } catch (err) {
    console.error("[Alert] getAlertSummary error:", err);
    return res.status(500).json({ message: "Failed to fetch alert summary" });
  }
};

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildReasons(daysLeft, qty, riskLevel) {
  const reasons = [];
  if (riskLevel === "HIGH") reasons.push("AI classified as HIGH RISK");
  if (daysLeft <= 7) reasons.push(`Expires in ${daysLeft} day(s)`);
  else if (daysLeft <= 14) reasons.push(`Expires in ${daysLeft} days`);
  else if (daysLeft <= EXPIRY_WARNING_DAYS) reasons.push(`Nearing expiry (${daysLeft} days left)`);
  if (qty === 0) reasons.push("Out of stock");
  else if (qty <= 5) reasons.push(`Very low stock (${qty} units)`);
  else if (qty <= LOW_STOCK_THRESHOLD) reasons.push(`Low stock (${qty} units)`);
  return reasons;
}

function buildSummary(alerts) {
  const count = (level) => alerts.filter((a) => a.alertLevel === level).length;
  return {
    total: alerts.length,
    critical: count("CRITICAL"),
    high: count("HIGH"),
    medium: count("MEDIUM"),
  };
}
