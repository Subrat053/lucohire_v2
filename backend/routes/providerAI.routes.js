const express = require('express');
const { body } = require('express-validator');
const { protect, authorizeRoleFromActive } = require('../middleware/auth');
const { ensureProviderApproved } = require('../middleware/providerApproval');
const { requireFeatureFlag } = require('../middleware/featureFlag');
const { aiRateLimiter } = require('../middleware/aiRateLimit');
const { validateRequest } = require('../middleware/validate');
const {
  chatWithAssistant,
  buildProfileSuggestion,
  healthCheck,
  testParser,
  buildProfileFromResume,
  getAiUsage,
} = require('../controllers/providerAI.controller');
const { getCareerHealth } = require('../controllers/careerHealth.controller');
const { getCareerGPS, getHiringBarriers, getSkillGap, getAtsOptimizer, getJobMatchingEngine, getAICareerReport, getIncomeOpportunities, optimizeFullResume, getInterviewQuestions, refreshInterviewQuestions } = require('../controllers/growWithAI.controller');
const { getDashboardData, handleChat, updateGoal, refreshTasks, toggleTask, tipFeedback } = require('../controllers/aiCoachController');
const upload = require('../middleware/upload');
const { checkAiLimit } = require('../middleware/aiUsage');
const { getResumeToolkit } = require('../controllers/resumeToolkit.controller');
const { requireResumeAiEnabled } = require('../controllers/resumeParserController');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

const router = express.Router();
const providerChatGate = requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_CHAT_ENABLED');
const providerProfileGate = requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_PROFILE_ENABLED');

router.use(requireOperationalFlags('AI_FEATURES_ENABLED'));
router.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/usage') return next();
  if (req.path === '/test' || req.path === '/chat' || req.path.startsWith('/ai-coach/')) {
    return providerChatGate(req, res, next);
  }
  return providerProfileGate(req, res, next);
});

router.get(
  '/resume-toolkit',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireResumeAiEnabled,
  checkAiLimit('resumeScoreRefresh'),
  getResumeToolkit
);

router.get(
  '/health',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.chat', { defaultEnabled: true }),
  healthCheck
);

router.get(
  '/usage',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  getAiUsage
);

router.post(
  '/test',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.chat', { defaultEnabled: true }),
  aiRateLimiter,
  body('message').isString().trim().isLength({ min: 1, max: 1500 }),
  body('profileContext').optional().isObject(),
  validateRequest,
  testParser
);

router.post(
  '/chat',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.chat', { defaultEnabled: true }),
  aiRateLimiter,
  checkAiLimit('chatMessagesLimit'),
  body('message').isString().trim().isLength({ min: 2, max: 1500 }),
  body('providerId').optional().isString(),
  body('profileContext').optional().isObject(),
  body('recentMessages').optional().isArray({ max: 20 }),
  body('conversationId').optional().isString(),
  validateRequest,
  chatWithAssistant
);

router.post(
  '/build-profile',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  body('freeText').isString().trim().isLength({ min: 5, max: 1200 }),
  body('existingSkills').optional().isArray({ max: 20 }),
  body('existingLanguages').optional().isArray({ max: 20 }),
  body('profileContext').optional().isObject(),
  validateRequest,
  buildProfileSuggestion
);

router.post(
  '/build-from-resume',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  upload.single('resume'),
  buildProfileFromResume
);

router.post(
  '/career-health',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  validateRequest,
  getCareerHealth
);

router.post(
  '/career-report',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  validateRequest,
  getAICareerReport
);

router.post(
  '/improve-career-health',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  checkAiLimit('careerHealthRefresh'),
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  body('improve').optional().isBoolean(),
  validateRequest,
  getCareerHealth
);

router.post(
  '/improve-career-report',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  checkAiLimit('careerReport'),
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  body('improve').optional().isBoolean(),
  validateRequest,
  getAICareerReport
);

router.post(
  '/career-gps',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  validateRequest,
  getCareerGPS
);

router.post(
  '/improve-career-gps',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  checkAiLimit('careerGpsRefresh'),
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  body('improve').optional().isBoolean(),
  validateRequest,
  getCareerGPS
);

router.post(
  '/hiring-barriers',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  validateRequest,
  getHiringBarriers
);

router.post(
  '/improve-hiring-barriers',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  checkAiLimit('whyNotHiredRefresh'),
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  body('improve').optional().isBoolean(),
  validateRequest,
  getHiringBarriers
);

router.post(
  '/skill-gap',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  body('jobDescription').isString().trim().isLength({ min: 10 }),
  validateRequest,
  getSkillGap
);

router.post(
  '/improve-skill-gap',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  checkAiLimit('skillGapRefresh'),
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  body('improve').optional().isBoolean(),
  body('jobDescription').isString().trim().isLength({ min: 10 }),
  validateRequest,
  getSkillGap
);

router.post(
  '/ats-optimizer',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  checkAiLimit('atsOptimizerRefresh'),
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  body('jobDescription').isString().trim().isLength({ min: 10 }),
  validateRequest,
  getAtsOptimizer
);

router.post(
  '/job-matching-engine',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  checkAiLimit('interviewCallProb'),
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  body('jobs').isArray({ min: 1, max: 100 }),
  validateRequest,
  getJobMatchingEngine
);

router.post(
  '/income-opportunities',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  validateRequest,
  getIncomeOpportunities
);

// AI Career Coach Routes
router.get(
  '/ai-coach/dashboard',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  aiRateLimiter,
  getDashboardData
);

router.post(
  '/ai-coach/chat',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  aiRateLimiter,
  checkAiLimit('chatMessagesLimit'),
  body('message').isString().trim().isLength({ min: 1, max: 1500 }),
  validateRequest,
  handleChat
);

router.post(
  '/ai-coach/goal',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  aiRateLimiter,
  checkAiLimit('careerPlanRefresh'),
  body('role').isString().trim().isLength({ min: 1, max: 200 }),
  body('timeline').isString().trim().isLength({ min: 1, max: 50 }),
  validateRequest,
  updateGoal
);

router.post(
  '/ai-coach/tasks/refresh',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  aiRateLimiter,
  checkAiLimit('dailyTasksRefresh'),
  refreshTasks
);

router.post(
  '/ai-coach/tasks/toggle',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  aiRateLimiter,
  body('taskIndex').isInt({ min: 0 }),
  validateRequest,
  toggleTask
);

router.post(
  '/ai-coach/tip/feedback',
  protect,
  authorizeRoleFromActive('provider'),
  body('helpful').isBoolean(),
  validateRequest,
  tipFeedback
);

router.post(
  '/optimize-full-resume',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  aiRateLimiter,
  checkAiLimit('resumeOptimization'),
  optimizeFullResume
);


router.post(
  '/interview-questions',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  body('fileHash').optional({ nullable: true }).isString(),
  body('parsedData').optional({ nullable: true }).isObject(),
  body('category').optional({ nullable: true }).isString(),
  body('existingQuestions').optional().isArray(),
  validateRequest,
  getInterviewQuestions
);

router.post(
  '/interview-questions-refresh',
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  aiRateLimiter,
  checkAiLimit('interviewQuestionsRefresh'),
  refreshInterviewQuestions
);

module.exports = router;
