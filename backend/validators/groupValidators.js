const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const isMongoId = (value) => mongoose.Types.ObjectId.isValid(value);

const createGroupValidators = [
  body('name').trim().notEmpty().withMessage('Group name is required'),
  body('members').optional().isArray().withMessage('Members must be an array'),
  body('members.*').optional().custom(isMongoId).withMessage('Each member must be a valid user ID'),
  body('currency').optional().isIn(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD']).withMessage('Invalid currency'),
  body('emoji').optional().isString(),
  body('description').optional().isString().isLength({ max: 300 }).withMessage('Description must be under 300 characters'),
];

const addExpenseValidators = [
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('paidBy').optional().custom(isMongoId).withMessage('paidBy must be a valid user ID'),
  body('participants').optional().isArray({ min: 1 }).withMessage('Participants must be a non-empty array'),
  body('splitType')
    .optional()
    .isIn(['EQUAL', 'EXACT', 'PERCENTAGE'])
    .withMessage('splitType must be EQUAL, EXACT, or PERCENTAGE'),
  body('category')
    .optional()
    .isIn(['Food', 'Travel', 'Shopping', 'Utilities', 'Rent', 'Entertainment', 'Other'])
    .withMessage('Invalid category'),
  body('splits').optional().isArray({ min: 1 }).withMessage('splits must be a non-empty array'),
  body('splits.*.userId').optional().custom(isMongoId).withMessage('Each split userId must be valid'),
  body('splits.*.amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Each split amount must be positive (EXACT splits)'),
  body('splits.*.percentage')
    .optional()
    .isFloat({ gt: 0, max: 100 })
    .withMessage('Each split percentage must be between 0 and 100 (PERCENTAGE splits)'),
];

const updateExpenseValidators = [
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('category')
    .optional()
    .isIn(['Food', 'Travel', 'Shopping', 'Utilities', 'Rent', 'Entertainment', 'Other'])
    .withMessage('Invalid category'),
];

module.exports = { createGroupValidators, addExpenseValidators, updateExpenseValidators };
