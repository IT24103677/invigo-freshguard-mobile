const express = require("express");
const router = express.Router();
const discountController = require("../controllers/discountController");

// Import your existing auth middleware
// Adjust the path to match your project structure
const { verifyToken } = require("../middleware/authMiddleware");

// ─── All routes require a valid JWT ──────────────────────────────────────────
router.use(verifyToken);

// ─── Stats (must come before /:id routes) ────────────────────────────────────
router.get("/stats", discountController.getDiscountStats);

// ─── Collection routes ────────────────────────────────────────────────────────
router.get("/", discountController.getAllDiscounts);
router.post("/", discountController.createDiscount);

// ─── Single-item routes ───────────────────────────────────────────────────────
router.get("/:id", discountController.getDiscountById);
router.put("/:id", discountController.updateDiscount);
router.delete("/:id", discountController.deleteDiscount);

// ─── Toggle active status ─────────────────────────────────────────────────────
// PATCH /api/discounts/:id/active?value=true|false
router.patch("/:id/active", discountController.toggleActive);

module.exports = router;

/*
 * ─── Register in your main app.js / index.js ─────────────────────────────────
 *
 *   const discountRoutes = require("./routes/discountRoutes");
 *   app.use("/api/discounts", discountRoutes);
 *
 * ─── API Endpoint Summary ─────────────────────────────────────────────────────
 *
 *   GET    /api/discounts              → List all discounts (filter: ?active=true, ?productId=123)
 *   GET    /api/discounts/stats        → { total, active, inactive, aiSuggested }
 *   GET    /api/discounts/:id          → Single discount
 *   POST   /api/discounts              → Create discount
 *   PUT    /api/discounts/:id          → Full update
 *   PATCH  /api/discounts/:id/active   → Toggle active (?value=true|false or just toggle)
 *   DELETE /api/discounts/:id          → Delete
 */
