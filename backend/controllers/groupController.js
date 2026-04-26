const Group = require('../models/Group');
const Transaction = require('../models/Transaction');
const { minimizeCashFlow } = require('../utils/solver');
const { AppError } = require('../middleware/errorHandler');
const { nanoid } = require('nanoid');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res, next) => {
  try {
    const { name, members, description, emoji, currency } = req.body;

    const allMembers = members?.includes(req.user.id)
      ? members
      : [...(members || []), req.user.id];

    const inviteCode = nanoid(8);

    const group = await Group.create({
      name,
      description,
      emoji,
      currency,
      members: allMembers,
      createdBy: req.user.id,
      inviteCode,
    });

    await group.populate('members', 'name email avatar');

    res.status(201).json({ success: true, group });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's active (non-archived) groups
// @route   GET /api/groups?page=1&limit=20
// @access  Private
const getGroups = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const query = { members: req.user.id, isArchived: false };

    const [groups, total] = await Promise.all([
      Group.find(query)
        .populate('members', 'name email avatar')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Group.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      groups,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single group and its expenses
// @route   GET /api/groups/:id
// @access  Private
const getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, isArchived: false })
      .populate('members', 'name email avatar');

    if (!group) return next(new AppError('Group not found', 404));

    // Ensure membership
    if (!group.members.some((m) => m._id.toString() === req.user.id)) {
      return next(new AppError('Access denied: you are not a member of this group', 403));
    }

    // Back-fill invite code for legacy groups
    if (!group.inviteCode) {
      group.inviteCode = nanoid(8);
      await group.save();
    }

    const transactions = await Transaction.find({ group: req.params.id })
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, group, transactions });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft-delete (archive) a group — creator only
// @route   DELETE /api/groups/:id
// @access  Private
const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return next(new AppError('Group not found', 404));

    if (group.createdBy.toString() !== req.user.id) {
      return next(new AppError('Only the group creator can delete this group', 403));
    }

    group.isArchived = true;
    await group.save();

    res.status(200).json({ success: true, message: 'Group archived successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add expense to a group
// @route   POST /api/groups/:id/expenses
// @access  Private
const addGroupExpense = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, isArchived: false });
    if (!group) return next(new AppError('Group not found', 404));

    if (!group.members.some((m) => m.toString() === req.user.id)) {
      return next(new AppError('Access denied: you are not a member of this group', 403));
    }

    const {
      description,
      amount,
      paidBy,
      participants,
      splits: rawSplits,
      splitType = 'EQUAL',
      category = 'Other',
    } = req.body;

    let splits = [];

    if (splitType === 'EQUAL') {
      if (!participants || participants.length === 0) {
        return next(new AppError('Participants are required for EQUAL splits', 400));
      }
      const splitAmount = Number((amount / participants.length).toFixed(2));
      splits = participants.map((userId) => ({
        user: userId,
        amount: splitAmount,
        status: 'APPROVED',
      }));
    } else if (splitType === 'EXACT') {
      if (!rawSplits || rawSplits.length === 0) {
        return next(new AppError('splits array is required for EXACT split type', 400));
      }
      const total = rawSplits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(total - amount) > 0.01) {
        return next(new AppError(`EXACT splits must sum to ${amount}. Got ${total}`, 400));
      }
      splits = rawSplits.map((s) => ({
        user: s.userId,
        amount: Number(s.amount.toFixed(2)),
        status: 'APPROVED',
      }));
    } else if (splitType === 'PERCENTAGE') {
      if (!rawSplits || rawSplits.length === 0) {
        return next(new AppError('splits array is required for PERCENTAGE split type', 400));
      }
      const totalPct = rawSplits.reduce((sum, s) => sum + s.percentage, 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        return next(new AppError(`Percentages must sum to 100. Got ${totalPct}`, 400));
      }
      splits = rawSplits.map((s) => ({
        user: s.userId,
        amount: Number(((s.percentage / 100) * amount).toFixed(2)),
        percentage: s.percentage,
        status: 'APPROVED',
      }));
    }

    const transaction = await Transaction.create({
      description,
      amount,
      category,
      splitType,
      group: req.params.id,
      paidBy: paidBy || req.user.id,
      splits,
    });

    await transaction.populate('paidBy', 'name email avatar');
    await transaction.populate('splits.user', 'name email avatar');

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an expense (description, amount, category)
// @route   PUT /api/groups/:id/expenses/:expenseId
// @access  Private
const updateExpense = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.expenseId,
      group: req.params.id,
    });

    if (!transaction) return next(new AppError('Expense not found', 404));

    if (transaction.paidBy.toString() !== req.user.id) {
      return next(new AppError('Only the person who paid can edit this expense', 403));
    }

    const { description, amount, category } = req.body;

    if (description !== undefined) transaction.description = description;
    if (category !== undefined) transaction.category = category;

    // If amount changed on an EQUAL split, recalculate
    if (amount !== undefined && amount !== transaction.amount) {
      transaction.amount = amount;
      if (transaction.splitType === 'EQUAL') {
        const splitAmount = Number((amount / transaction.splits.length).toFixed(2));
        transaction.splits.forEach((s) => (s.amount = splitAmount));
      }
    }

    await transaction.save();
    await transaction.populate('paidBy', 'name email avatar');
    await transaction.populate('splits.user', 'name email avatar');

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an expense
// @route   DELETE /api/groups/:id/expenses/:expenseId
// @access  Private
const deleteExpense = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.expenseId,
      group: req.params.id,
    });

    if (!transaction) return next(new AppError('Expense not found', 404));

    const group = await Group.findById(req.params.id);

    const isCreator = group?.createdBy.toString() === req.user.id;
    const isPayer = transaction.paidBy.toString() === req.user.id;

    if (!isCreator && !isPayer) {
      return next(new AppError('Only the payer or group creator can delete this expense', 403));
    }

    await transaction.deleteOne();

    res.status(200).json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get settlement plan using Min Cash Flow
// @route   GET /api/groups/:id/settle
// @access  Private
const getGroupSettlement = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ group: req.params.id });

    const edges = [];
    for (const t of transactions) {
      for (const split of t.splits) {
        if (split.status === 'APPROVED' && split.user.toString() !== t.paidBy.toString()) {
          edges.push({
            from: split.user.toString(),
            to: t.paidBy.toString(),
            amount: split.amount,
          });
        }
      }
    }

    const settlement = minimizeCashFlow(edges);

    res.status(200).json({ success: true, settlement });
  } catch (error) {
    next(error);
  }
};

// @desc    Join a group via invite code
// @route   POST /api/groups/join
// @access  Private
const joinGroupViaCode = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return next(new AppError('Please provide an invite code', 400));
    }

    const group = await Group.findOne({ inviteCode, isArchived: false });
    if (!group) return next(new AppError('Invalid invite code or group not found', 404));

    if (group.members.some((m) => m.toString() === req.user.id)) {
      return next(new AppError('You are already a member of this group', 400));
    }

    group.members.push(req.user.id);
    await group.save();
    await group.populate('members', 'name email avatar');

    res.status(200).json({ success: true, group });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  deleteGroup,
  addGroupExpense,
  updateExpense,
  deleteExpense,
  getGroupSettlement,
  joinGroupViaCode,
};
