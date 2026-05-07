const { body } = require('express-validator');
const mongoose = require('mongoose');

const isMongoId = (value) => mongoose.Types.ObjectId.isValid(value);

const createIOUValidators = [
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('toUserId').custom(isMongoId).withMessage('toUserId must be a valid user ID'),
];

const markSettledValidators = [
  body('toUserId').custom(isMongoId).withMessage('toUserId must be a valid user ID'),
  body('groupId').custom(isMongoId).withMessage('groupId must be a valid group ID'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
];

module.exports = { createIOUValidators, markSettledValidators };


