const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/pipeline.controller');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

router.use(requireOperationalFlags('ENABLE_PIPELINE_JOBS', 'ENABLE_CONNECTORS'));

// Important: these routes should be protected by your admin authentication middleware.
// Assuming it's added where the router is mounted in server.js or index.js

// Pipeline Config
router.get('/config/countries', pipelineController.getCountries);
router.put('/config/countries/:id', pipelineController.updateCountry);

// Queries
router.get('/queries', pipelineController.getQueries);
router.post('/queries', pipelineController.addQuery);

// Scans & Imports
router.post('/manual-scan', pipelineController.triggerManualScan);
router.get('/scans', pipelineController.getScans);
router.get('/raw-jobs', pipelineController.getRawImports);
router.get('/jobs', pipelineController.getPipelineJobs);
router.put('/jobs/:id/status', pipelineController.updateJobStatus);
router.post('/jobs/auto-verify', pipelineController.autoVerifyJobs);

// Review Queue
router.get('/review-queue', pipelineController.getReviewQueue);
router.post('/review-queue/:id/approve', pipelineController.approveReviewJob);

// Master Data
router.get('/categories', pipelineController.getCategories);
router.get('/categories/suggestions', pipelineController.getCategorySuggestions);
router.get('/companies', pipelineController.getCompanies);
router.get('/locations', pipelineController.getLocations);
router.get('/source-confidence', pipelineController.getSourceConfidence);

// Audit & Analytics
router.get('/audit-logs', pipelineController.getAuditLogs);
router.get('/analytics', pipelineController.getAnalytics);

module.exports = router;
