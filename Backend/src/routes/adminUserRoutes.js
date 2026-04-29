const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const {
  getUsers,
  createUser,
  updateUser,
  deleteUserAccount,
  unlockUser,
} = require('../controllers/adminUserController');

const router = express.Router();

router.use(protect, adminOnly);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUserAccount);
router.put('/:id/unlock', unlockUser);

module.exports = router;
