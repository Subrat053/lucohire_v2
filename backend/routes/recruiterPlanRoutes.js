const express = require('express');
const router = express.Router();
const {
  getAvailablePlans,
  getMyPlan,
  generateCheckoutSession,
  verifyPayment
} = require('../controllers/recruiterPlanController');
const { protect, authorize } = require('../middleware/auth');

// Note: these routes might be mounted under /api/recruiter-plans

router.get('/available', getAvailablePlans);
router.get('/my-plan', protect, getMyPlan);
router.post('/checkout', protect, authorize('recruiter'), generateCheckoutSession);
router.post('/verify', protect, authorize('recruiter'), verifyPayment);

module.exports = router;
