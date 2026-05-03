const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alertController");

// Adjust path to match your project
const { verifyToken } = require("../middleware/authMiddleware");

router.use(verifyToken);

// GET /api/alerts              → All active alerts (filter: ?level=CRITICAL|HIGH|MEDIUM, ?productId=)
// GET /api/alerts/summary      → { total, critical, high, medium }

router.get("/summary", alertController.getAlertSummary);
router.get("/", alertController.getAlerts);

module.exports = router;

/*
 * Register in app.js:
 *   const alertRoutes = require("./routes/alertRoutes");
 *   app.use("/api/alerts", alertRoutes);
 */
