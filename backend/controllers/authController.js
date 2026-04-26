const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { AppError } = require('../middleware/errorHandler');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError('User with this email already exists', 400));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword });

    res.status(201).json({
      success: true,
      _id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      currencyPreference: user.currencyPreference,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError('Invalid email or password', 401));
    }

    res.json({
      success: true,
      _id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      currencyPreference: user.currencyPreference,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return next(new AppError('User not found', 404));
    res.status(200).json({ success: true, ...user.toObject() });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile (name, avatar, currency, timezone)
// @route   PUT /api/auth/me
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar, currencyPreference, timezone } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));

    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (currencyPreference !== undefined) user.currencyPreference = currencyPreference;
    if (timezone !== undefined) user.timezone = timezone;

    await user.save();

    const updated = user.toObject();
    delete updated.password;

    res.status(200).json({ success: true, ...updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return next(new AppError('Current password is incorrect', 400));
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users, with optional search
// @route   GET /api/auth/users?search=...&limit=20
// @access  Private
const getAllUsers = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const limit = Math.min(parseInt(req.query.limit) || 20, 50); // cap at 50

    const query = { _id: { $ne: req.user.id } };

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { email: regex }];
    }

    const users = await User.find(query).select('-password').limit(limit);
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, loginUser, getMe, updateProfile, changePassword, getAllUsers };
