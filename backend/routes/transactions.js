const express = require('express');
const router = express.Router();
const {
  createIOU,
  getUserIOUs,
  approveIOU,
  rejectIOU,
  deleteIOU,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createIOUValidators } = require('../validators/transactionValidators');

router.route('/')
  .post(protect, createIOUValidators, validate, createIOU)
  .get(protect, getUserIOUs);

router.put('/:id/approve', protect, approveIOU);
router.put('/:id/reject', protect, rejectIOU);
router.delete('/:id', protect, deleteIOU);

module.exports = router;
