const express = require('express');
const { protect, authorizeRoleFromActive } = require('../middleware/auth');
const {
  getHealthMetrics,
  updateFeatureStatus,
  restartFeature,
  updateGlobalFeatureStatus,
  getExternalServicesStatus
} = require('../controllers/adminHealth.controller');

const router = express.Router();

router.get(
  '/external-services',
  protect,
  authorizeRoleFromActive('admin'),
  getExternalServicesStatus
);

// Super Admin Health Dashboard endpoints
router.get(
  '/metrics',
  protect,
  authorizeRoleFromActive('admin'),
  getHealthMetrics
);

router.put(
  '/features/:featureKey/status',
  protect,
  authorizeRoleFromActive('admin'),
  updateFeatureStatus
);

router.post(
  '/features/:featureKey/restart',
  protect,
  authorizeRoleFromActive('admin'),
  restartFeature
);

router.put(
  '/features/global-status',
  protect,
  authorizeRoleFromActive('admin'),
  updateGlobalFeatureStatus
);

module.exports = router;
