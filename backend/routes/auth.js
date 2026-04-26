const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
  getAllUsers,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const {
  registerValidators,
  loginValidators,
  updateProfileValidators,
  changePasswordValidators,
} = require('../validators/authValidators');

router.post('/register', registerValidators, validate, registerUser);
router.post('/login', loginValidators, validate, loginUser);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfileValidators, validate, updateProfile);
router.put('/change-password', protect, changePasswordValidators, validate, changePassword);
router.get('/users', protect, getAllUsers);

module.exports = router;
