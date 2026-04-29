const express = require("express");

const saleController = require("../controllers/saleController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", saleController.createSale);
router.get("/", saleController.getSales);
router.get("/:id", saleController.getSaleById);
router.put("/:id", saleController.updateSale);
router.post(
  "/:id/void",
  requireRoles("ADMIN", "MANAGER"),
  saleController.voidSale
);

module.exports = router;
