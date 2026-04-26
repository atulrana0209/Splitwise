const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: null, // URL or emoji
  },
  currencyPreference: {
    type: String,
    enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'],
    default: 'INR',
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata',
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
