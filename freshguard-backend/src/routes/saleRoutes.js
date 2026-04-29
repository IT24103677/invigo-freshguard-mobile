const express = require("express");

const saleController = require("../controllers/saleController");

const router = express.Router();

router.post("/", saleController.createSale);
router.get("/", saleController.getSales);
router.get("/:id", saleController.getSaleById);
router.post("/:id/void", saleController.voidSale);

module.exports = router;
