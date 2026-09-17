const express = require('express');
const router = express.Router();
const {
  getCustomPlanOptions,
  getPlaceSuggestions,
  getPlaceDetailsProxy,
  calculateCustomPlanPrice,
  createPendingCustomPlan,
  getCurrentCustomPlan
} = require('../../controllers/provider/customPlan.controller');
const { protect, authorizeRoleFromActive } = require('../../middleware/auth');
const { ensureProviderApproved } = require('../../middleware/providerApproval');

// All custom plan routes require provider authorization and approval status validation
router.use(protect);
router.use(authorizeRoleFromActive('provider'));
router.use(ensureProviderApproved);

router.get('/options', getCustomPlanOptions);
router.get('/place-suggestions', getPlaceSuggestions);
router.get('/place-details', getPlaceDetailsProxy);
router.get('/current', getCurrentCustomPlan);

router.post('/price', calculateCustomPlanPrice);
router.post('/create', createPendingCustomPlan);

module.exports = router;
