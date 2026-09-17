const express = require('express');
const router = express.Router();
const {
  getMySubscription,
  getMySubscriptionByAudience,
  selectSubscription,
  requestCustomPlan,
  activateSubscription,
  getAllSubscriptions,
  getRevenue,
} = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/auth');

// User: get own subscription
router.get('/me', protect, getMySubscription);
router.get('/me/:audience', protect, getMySubscriptionByAudience);
router.post('/select', protect, selectSubscription);
router.post('/custom-request', protect, requestCustomPlan);

// Admin: activate subscription for a user
router.post('/activate', protect, authorize('admin'), activateSubscription);

// Admin: view all subscriptions
router.get('/all', protect, authorize('admin'), getAllSubscriptions);

// Admin: revenue stats
router.get('/revenue', protect, authorize('admin'), getRevenue);

module.exports = router;
