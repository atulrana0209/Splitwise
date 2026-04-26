const mongoose = require('mongoose');

/**
 * Tracks real-world settlements between users within a group.
 * Created when a user confirms they have physically paid another user.
 */
const settlementSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be positive'],
  },
  note: {
    type: String,
    default: '',
    maxlength: 200,
  },
  settledAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Settlement', settlementSchema);
