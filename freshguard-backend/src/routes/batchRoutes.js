const express = require("express");

const batchController = require("../controllers/batchController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireRoles("ADMIN", "MANAGER"), batchController.createBatch);
router.get("/", batchController.getBatches);
router.get("/:id", batchController.getBatchById);

module.exports = router;
