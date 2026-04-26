const express = require('express');
const router = express.Router();
const {
  createGroup,
  getGroups,
  getGroupById,
  deleteGroup,
  addGroupExpense,
  updateExpense,
  deleteExpense,
  getGroupSettlement,
  joinGroupViaCode,
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const {
  createGroupValidators,
  addExpenseValidators,
  updateExpenseValidators,
} = require('../validators/groupValidators');

// Group CRUD
router.route('/')
  .post(protect, createGroupValidators, validate, createGroup)
  .get(protect, getGroups);

// Must come before /:id to avoid route conflicts
router.post('/join', protect, joinGroupViaCode);

router.route('/:id')
  .get(protect, getGroupById)
  .delete(protect, deleteGroup);

// Expenses
router.route('/:id/expenses')
  .post(protect, addExpenseValidators, validate, addGroupExpense);

router.route('/:id/expenses/:expenseId')
  .put(protect, updateExpenseValidators, validate, updateExpense)
  .delete(protect, deleteExpense);

// Settlement plan
router.get('/:id/settle', protect, getGroupSettlement);

module.exports = router;
