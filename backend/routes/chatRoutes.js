const express = require('express');
const { body } = require('express-validator');
const { protect, authorizeRoleFromActive } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { requireFeatureFlag } = require('../middleware/featureFlag');
const { aiRateLimiter } = require('../middleware/aiRateLimit');
const { aiChat } = require('../controllers/chatController');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

const router = express.Router();

router.post(
  '/ai',
  requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_CHAT_ENABLED'),
  protect,
  authorizeRoleFromActive('provider', 'recruiter', 'admin'),
  requireFeatureFlag('ai.feature.chat', { defaultEnabled: false }),
  aiRateLimiter,
  body('message').isString().trim().isLength({ min: 2, max: 1500 }),
  body('conversationId').optional().isString().trim().isLength({ min: 1 }),
  body('clientMessageId').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('context').optional().isObject(),
  validateRequest,
  aiChat
);

module.exports = router;
