const express = require("express");

const saleController = require("../controllers/saleController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRoles = require("../middleware/roleMiddleware");
const saleReceiptUpload = require("../middleware/saleReceiptUpload");

const router = express.Router();

router.use(authMiddleware);

router.post("/", saleController.createSale);
router.post(
  "/:id/receipt",
  saleReceiptUpload.single("receipt"),
  saleController.attachSaleReceipt
);
router.get("/", saleController.getSales);
router.get("/:id", saleController.getSaleById);
router.put("/:id", saleController.updateSale);
router.post(
  "/:id/void",
  requireRoles("ADMIN", "MANAGER"),
  saleController.voidSale
);

module.exports = router;
