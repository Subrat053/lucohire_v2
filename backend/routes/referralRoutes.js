const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMyReferralStats, createUserReferral } = require('../controllers/referralController');
const { updatePaymentMethods, requestWithdrawal } = require('../controllers/withdrawalController');

router.get('/my-stats', protect, getMyReferralStats);
router.post('/payment-methods', protect, updatePaymentMethods);
router.post('/withdraw', protect, requestWithdrawal);
router.post('/invite', protect, createUserReferral);

module.exports = router;
