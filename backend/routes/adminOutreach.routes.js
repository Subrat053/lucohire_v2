const express = require('express');
const router = express.Router();
const { dispatchCampaign, getQueueStatus, pauseQueue, resumeQueue, stopQueue, getActiveJobs } = require('../controllers/adminOutreach.controller');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

router.use(requireOperationalFlags('ENABLE_OUTREACH', 'ENABLE_COMMUNICATION_PROVIDERS'));

router.post('/dispatch', dispatchCampaign);
router.get('/status', getQueueStatus);
router.post('/pause', pauseQueue);
router.post('/resume', resumeQueue);
router.post('/stop', stopQueue);
router.get('/active', getActiveJobs);

module.exports = router;
