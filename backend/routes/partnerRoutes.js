const express = require('express');
const router = express.Router();
const {
  getPartnerDashboard,
  getMyReferralLink,
  getMyReferrals,
  createProviderByPartner,
  createRecruiterByPartner,
  requestPayout,
  getMyPayouts,
} = require('../controllers/partnerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('partner', 'manager'));

router.get('/dashboard', getPartnerDashboard);
router.get('/referral-link', getMyReferralLink);
router.get('/referrals', getMyReferrals);
router.post('/referrals/provider', createProviderByPartner);
router.post('/referrals/recruiter', createRecruiterByPartner);
router.post('/payout-request', requestPayout);
router.get('/payouts', getMyPayouts);

module.exports = router;
