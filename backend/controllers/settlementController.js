const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { AppError } = require('../middleware/errorHandler');

// @desc    Mark a debt as settled in real life
// @route   POST /api/settlements
// @access  Private
const markSettled = async (req, res, next) => {
  try {
    const { toUserId, groupId, amount, note } = req.body;

    // Verify the group exists and both users are members
    const group = await Group.findOne({ _id: groupId, isArchived: false });
    if (!group) return next(new AppError('Group not found', 404));

    if (!group.members.some((m) => m.toString() === req.user.id)) {
      return next(new AppError('Access denied: you are not a member of this group', 403));
    }

    if (!group.members.some((m) => m.toString() === toUserId)) {
      return next(new AppError('The recipient is not a member of this group', 400));
    }

    if (toUserId === req.user.id) {
      return next(new AppError('You cannot settle a debt with yourself', 400));
    }

    const settlement = await Settlement.create({
      group: groupId,
      fromUser: req.user.id,
      toUser: toUserId,
      amount,
      note: note || '',
    });

    await settlement.populate('fromUser', 'name email avatar');
    await settlement.populate('toUser', 'name email avatar');

    res.status(201).json({ success: true, settlement });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all settlement records for a group
// @route   GET /api/settlements/group/:groupId
// @access  Private
const getGroupSettlements = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return next(new AppError('Group not found', 404));

    if (!group.members.some((m) => m.toString() === req.user.id)) {
      return next(new AppError('Access denied: you are not a member of this group', 403));
    }

    const settlements = await Settlement.find({ group: req.params.groupId })
      .populate('fromUser', 'name email avatar')
      .populate('toUser', 'name email avatar')
      .sort({ settledAt: -1 });

    res.status(200).json({ success: true, count: settlements.length, settlements });
  } catch (error) {
    next(error);
  }
};

module.exports = { markSettled, getGroupSettlements };
