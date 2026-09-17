const express = require('express');
const router = express.Router();
const {
  getCompanySources,
  createCompanySource,
  updateCompanySource,
  deleteCompanySource,
  importCompanySources,
  triggerDiscovery,
  liveTestCrawler
} = require('./companySource.controller');
const { protectAdmin, authorizeAdmin } = require('../../middleware/adminAuth');
const { requireOperationalFlags } = require('../../middleware/operationalFeatureGate');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(protectAdmin, authorizeAdmin());

router.get('/', getCompanySources);
router.post('/', createCompanySource);
router.put('/:id', updateCompanySource);
router.delete('/:id', deleteCompanySource);
router.post('/import', upload.single('file'), importCompanySources);
const requireCrawlerExecution = requireOperationalFlags('ENABLE_CRAWLERS', 'ENABLE_CONNECTORS');
router.post('/discover', requireCrawlerExecution, triggerDiscovery);
router.post('/live-test', requireCrawlerExecution, liveTestCrawler);

module.exports = router;
