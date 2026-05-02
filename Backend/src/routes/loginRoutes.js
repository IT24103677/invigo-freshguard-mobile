const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { getLoginHistory } = require('../controllers/loginController');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/', getLoginHistory);

module.exports = router;
