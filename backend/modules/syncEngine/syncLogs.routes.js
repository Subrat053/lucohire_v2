const express = require('express');
const router = express.Router();
const {
  getSyncReports,
  getSyncLogSampleJobs,
  getSyncStatsByCountry,
  getSyncErrors,
  triggerDailySync,
  triggerCountrySync,
  triggerSourceSync,
  retrySyncLog
} = require('./syncLogs.controller');
const { protectAdmin, authorizeAdmin } = require('../../middleware/adminAuth');
const { requireOperationalFlags } = require('../../middleware/operationalFeatureGate');

router.use(protectAdmin, authorizeAdmin());

router.get('/reports', getSyncReports);
router.get('/reports/:id/sample-jobs', getSyncLogSampleJobs);
router.get('/stats/by-country', getSyncStatsByCountry);
router.get('/errors', getSyncErrors);
const requireSyncExecution = requireOperationalFlags('ENABLE_SYNC_ENGINE', 'ENABLE_CONNECTORS');
router.post('/run', requireSyncExecution, triggerDailySync);
router.post('/run-country/:countryCode', requireSyncExecution, triggerCountrySync);
router.post('/run-source/:sourceName', requireSyncExecution, triggerSourceSync);
router.post('/errors/:id/retry', requireSyncExecution, retrySyncLog);

module.exports = router;
