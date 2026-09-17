const express = require('express');
const router = express.Router();
const { protectAdmin, authorizeAdmin } = require('../middleware/adminAuth');
const {
  getAllWithdrawals,
  updateWithdrawalStatus,
  getCommissionSettings,
  updateCommissionSettings,
  getBillingRuleHistory
} = require('../controllers/adminWithdrawalController');

// All routes are restricted to admin dashboard accounts
router.use(protectAdmin);
router.use(authorizeAdmin());

router.get('/', getAllWithdrawals);
router.put('/:id/status', updateWithdrawalStatus);
router.get('/commission-settings/history', getBillingRuleHistory);
router.get('/commission-settings', getCommissionSettings);
router.put('/commission-settings', updateCommissionSettings);

module.exports = router;
