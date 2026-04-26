const express = require('express');
const router = express.Router();
const { markSettled, getGroupSettlements } = require('../controllers/settlementController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { markSettledValidators } = require('../validators/transactionValidators');

router.post('/', protect, markSettledValidators, validate, markSettled);
router.get('/group/:groupId', protect, getGroupSettlements);

module.exports = router;
