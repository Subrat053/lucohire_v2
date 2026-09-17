const express = require('express');
const { protectAdmin, authorizeAdmin } = require('../middleware/adminAuth');
const {
  getMatchWeights,
  updateMatchWeights,
  getTrustWeights,
  updateTrustWeights,
  listPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  listSkillSynonyms,
  createSkillSynonym,
  updateSkillSynonym,
  deleteSkillSynonym,
  getFraudQueue,
  getOcrReviewQueue,
  updateOcrDecision,
  getAIUsageDashboard,
  getAIUsageLogs,
  getDemandSpikeDashboard,
  getAIFeatureSettings,
  updateAIFeatureSettings,
  getAiAnalysisResults,
  rerunAiAnalysis,
} = require('../controllers/adminAIController');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');


const router = express.Router();

router.use(protectAdmin, authorizeAdmin());
router.use(requireOperationalFlags('AI_FEATURES_ENABLED'));

router.get('/match-weights', getMatchWeights);
router.put('/match-weights', updateMatchWeights);

router.get('/trust-weights', getTrustWeights);
router.put('/trust-weights', updateTrustWeights);

router.get('/prompt-templates', listPromptTemplates);
router.post('/prompt-templates', createPromptTemplate);
router.put('/prompt-templates/:id', updatePromptTemplate);

router.get('/skill-synonyms', listSkillSynonyms);
router.post('/skill-synonyms', createSkillSynonym);
router.put('/skill-synonyms/:id', updateSkillSynonym);
router.delete('/skill-synonyms/:id', deleteSkillSynonym);

router.get('/fraud-queue', requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_FRAUD_ENABLED'), getFraudQueue);
router.get('/ocr-review-queue', requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_OCR_ENABLED'), getOcrReviewQueue);
router.put('/ocr-review-queue/:id', requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_OCR_ENABLED'), updateOcrDecision);

router.get('/usage-dashboard', getAIUsageDashboard);
router.get('/usage-logs', getAIUsageLogs);
router.get('/demand-snapshots', getDemandSpikeDashboard);

router.get('/feature-settings', getAIFeatureSettings);
router.put('/feature-settings', updateAIFeatureSettings);

router.get('/analysis-results', getAiAnalysisResults);
router.post('/analysis-results/rerun', requireOperationalFlags('AI_FEATURES_ENABLED'), rerunAiAnalysis);


module.exports = router;
