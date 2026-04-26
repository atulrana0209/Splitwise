const { body } = require('express-validator');

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateProfileValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('currencyPreference').optional().isIn(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD']).withMessage('Invalid currency'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
];

const changePasswordValidators = [
  body('oldPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

module.exports = { registerValidators, loginValidators, updateProfileValidators, changePasswordValidators };
