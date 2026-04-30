const express = require("express");

const productController = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireRoles("ADMIN", "MANAGER"), productController.createProduct);
router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);

module.exports = router;
