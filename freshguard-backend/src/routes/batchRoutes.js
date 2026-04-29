const express = require("express");

const batchController = require("../controllers/batchController");

const router = express.Router();

router.post("/", batchController.createBatch);
router.get("/", batchController.getBatches);
router.get("/:id", batchController.getBatchById);

module.exports = router;
