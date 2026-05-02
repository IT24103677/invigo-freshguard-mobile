const express = require('express');
const { protect } = require('../middleware/auth');
const salesDashboardController = require('../controllers/salesDashboardController');

const router = express.Router();

router.use(protect);
router.get('/summary', salesDashboardController.getDashboardSummary);

module.exports = router;
