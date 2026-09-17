const express = require('express');
const router = express.Router();
const {
  getRecommendedJobs,
  getSavedJobs,
  toggleSaveJob,
  recordJobApplyClick
} = require('./matching.controller');
const { protect, authorizeRoleFromActive } = require('../../middleware/auth');
const { ensureProviderApproved } = require('../../middleware/providerApproval');
const { requireOperationalFlags } = require('../../middleware/operationalFeatureGate');

router.use(requireOperationalFlags('ENABLE_JOB_AI_MATCHING'));
router.use(protect, authorizeRoleFromActive('provider'), ensureProviderApproved);

router.get('/recommendations', getRecommendedJobs);
router.get('/saved', getSavedJobs);
router.post('/save', toggleSaveJob);
router.post('/:jobId/apply-click', recordJobApplyClick);

module.exports = router;
