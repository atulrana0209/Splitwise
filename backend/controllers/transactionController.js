const Transaction = require('../models/Transaction');
const { AppError } = require('../middleware/errorHandler');

// @desc    Create a personal IOU
// @route   POST /api/transactions
// @access  Private
const createIOU = async (req, res, next) => {
  try {
    const { description, amount, toUserId } = req.body;

    if (toUserId === req.user.id) {
      return next(new AppError('You cannot create an IOU to yourself', 400));
    }

    const transaction = await Transaction.create({
      description,
      amount,
      group: null,
      paidBy: req.user.id,
      splits: [{ user: toUserId, amount, status: 'PENDING' }],
    });

    await transaction.populate('paidBy', 'name email avatar');
    await transaction.populate('splits.user', 'name email avatar');

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's personal IOUs (paginated)
// @route   GET /api/transactions?page=1&limit=20&status=PENDING
// @access  Private
const getUserIOUs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const query = {
      group: null,
      $or: [{ paidBy: req.user.id }, { 'splits.user': req.user.id }],
    };

    // Optional status filter
    if (req.query.status && ['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status)) {
      query['splits.status'] = req.query.status;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('paidBy', 'name email avatar')
        .populate('splits.user', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve an IOU
// @route   PUT /api/transactions/:id/approve
// @access  Private
const approveIOU = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return next(new AppError('Transaction not found', 404));

    if (transaction.splits[0].user.toString() !== req.user.id) {
      return next(new AppError('Not authorized to approve this IOU', 403));
    }

    if (transaction.splits[0].status !== 'PENDING') {
      return next(new AppError(`IOU is already ${transaction.splits[0].status.toLowerCase()}`, 400));
    }

    transaction.splits[0].status = 'APPROVED';
    await transaction.save();

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject an IOU
// @route   PUT /api/transactions/:id/reject
// @access  Private
const rejectIOU = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return next(new AppError('Transaction not found', 404));

    if (transaction.splits[0].user.toString() !== req.user.id) {
      return next(new AppError('Not authorized to reject this IOU', 403));
    }

    if (transaction.splits[0].status !== 'PENDING') {
      return next(new AppError(`IOU is already ${transaction.splits[0].status.toLowerCase()}`, 400));
    }

    transaction.splits[0].status = 'REJECTED';
    await transaction.save();

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a PENDING IOU (creator only)
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteIOU = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return next(new AppError('Transaction not found', 404));

    if (transaction.paidBy.toString() !== req.user.id) {
      return next(new AppError('Only the creator can delete this IOU', 403));
    }

    if (transaction.splits[0].status !== 'PENDING') {
      return next(new AppError('Only PENDING IOUs can be deleted', 400));
    }

    await transaction.deleteOne();

    res.status(200).json({ success: true, message: 'IOU deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createIOU, getUserIOUs, approveIOU, rejectIOU, deleteIOU };
