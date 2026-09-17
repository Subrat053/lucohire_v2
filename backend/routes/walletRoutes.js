const express = require('express');
const router = express.Router();
const { getWalletSummary, getWalletTransactions } = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

router.get('/summary', protect, getWalletSummary);
router.get('/transactions', protect, getWalletTransactions);

module.exports = router;
