const express = require('express');
const router = express.Router();
const {
  getPartners,
  createPartner,
  updatePartner,
  updatePartnerCommissionRate,
  getPartnerDetails,
  getPartnerPayouts,
  approvePartnerPayout,
  rejectPartnerPayout,
  getAllReferrals,
  getAdminDashboardStats,
  updatePartnerStatus,
  assignReferrer,
  getRewards,
  updateRewardStatus,
  markRewardsPaid,
  getRewardSettings,
  updateRewardSettings,
  deletePartner,
  getPartnerReferrals,
} = require('../controllers/adminPartnerController');
const { protectAdmin, authorizeAdmin } = require('../middleware/adminAuth');

router.use(protectAdmin, authorizeAdmin());

// Dashboard stats
router.get('/dashboard/stats', getAdminDashboardStats);

// Partners CRUD
router.get('/', getPartners);
router.post('/', createPartner);
router.get('/payouts/all', getPartnerPayouts);
router.get('/referrals/all', getAllReferrals);

// Rewards
router.get('/rewards', getRewards);
router.patch('/rewards/:id/status', updateRewardStatus);
router.post('/rewards/mark-paid', markRewardsPaid);

// Reward Settings
router.get('/settings/rewards', getRewardSettings);
router.put('/settings/rewards', updateRewardSettings);

// Assign referrer to user
router.patch('/users/:userId/referrer', assignReferrer);

// Partner detail routes
router.get('/:id', getPartnerDetails);
router.get('/:id/referrals', getPartnerReferrals);
router.patch('/:id', updatePartner);
router.delete('/:id', deletePartner);
router.patch('/:id/status', updatePartnerStatus);
router.patch('/:id/commission-rate', updatePartnerCommissionRate);
router.patch('/payouts/:id/approve', approvePartnerPayout);
router.patch('/payouts/:id/reject', rejectPartnerPayout);

module.exports = router;

