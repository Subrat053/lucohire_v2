const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/adminDataPipeline.controller');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

router.use(requireOperationalFlags('ENABLE_PIPELINE_JOBS', 'ENABLE_CONNECTORS'));
// const { protect, authorize } = require('../middlewares/auth');

// Using basic routes. In production, protect and authorize('admin') should be applied.
router.get('/configs', pipelineController.getConfigs);
router.post('/configs', pipelineController.createConfig);
router.put('/configs/:id', pipelineController.updateConfig);
router.delete('/configs/:id', pipelineController.deleteConfig);
router.post('/configs/sync-from-countries', pipelineController.syncConfigsFromCountries);

router.get('/settings', pipelineController.getSettings);
router.put('/settings', pipelineController.updateSettings);

router.post('/trigger', pipelineController.triggerIngestion);
router.post('/preview', pipelineController.previewIngestion);

// Automations
router.get('/automations', pipelineController.getAutomations);
router.post('/automations', pipelineController.createAutomation);
router.put('/automations/:id', pipelineController.updateAutomation);
router.delete('/automations/:id', pipelineController.deleteAutomation);
router.patch('/automations/:id/toggle', pipelineController.toggleAutomation);

module.exports = router;
