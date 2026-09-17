const express = require('express');
const { protect, authorize } = require('../../../middleware/auth');
const { validateRequest } = require('../../../middleware/validate');
const { aiRateLimiter } = require('../../../middleware/aiRateLimit');
const { requireFeatureFlag } = require('../../../middleware/featureFlag');
const { visionUpload } = require('../../../middleware/uploadVision');
const {
  profileBuildValidation,
  profileImproveValidation,
  pricingSuggestValidation,
  chatConversationCreateValidation,
  chatHistoryValidation,
  chatConversationIdValidation,
  chatSendValidation,
  chatRegenerateValidation,
  chatMessageStatusValidation,
  embeddingsCreateValidation,
  vectorSearchValidation,
} = require('../validators/ai.validators');
const {
  profileBuild,
  profileImprove,
  profileBuildFromFreeText,
  pricingSuggestion,
  ocrText,
  ocrDocument,
  ocrLabels,
  createChatConversation,
  getChatConversations,
  getChatConversationHistory,
  getChatHistory,
  sendChat,
  regenerateChat,
  updateMessageStatus,
  embeddingsCreate,
  vectorSearch,
  aiHealth,
} = require('../controllers/ai.controller');
const { providerBuilderSuggestion } = require('../../../controllers/providerController');
const { requireOperationalFlags } = require('../../../middleware/operationalFeatureGate');

const router = express.Router();
const profileAiGate = requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_PROFILE_ENABLED');
const chatAiGate = requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_CHAT_ENABLED');
const ocrAiGate = requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_OCR_ENABLED');
const embeddingsAiGate = requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_EMBEDDINGS_ENABLED');

router.use(requireOperationalFlags('AI_FEATURES_ENABLED'));
router.use(protect, authorize('provider', 'recruiter', 'admin'));

router.get('/health', aiHealth);

router.post(
  '/profile/build',
  profileAiGate,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: false }),
  aiRateLimiter,
  profileBuildValidation,
  validateRequest,
  profileBuild
);

router.post(
  '/profile/improve',
  profileAiGate,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: false }),
  aiRateLimiter,
  profileImproveValidation,
  validateRequest,
  profileImprove
);

router.post(
  '/profile/build-free-text',
  profileAiGate,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: false }),
  aiRateLimiter,
  profileBuildValidation,
  validateRequest,
  profileBuildFromFreeText
);

router.post(
  '/profile/pricing-suggest',
  profileAiGate,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: false }),
  aiRateLimiter,
  pricingSuggestValidation,
  validateRequest,
  pricingSuggestion
);

router.post(
  '/provider-builder-suggestion',
  profileAiGate,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: false }),
  aiRateLimiter,
  providerBuilderSuggestion
);


router.post('/ocr/text', ocrAiGate, requireFeatureFlag('ai.feature.ocr', { defaultEnabled: false }), aiRateLimiter, visionUpload.single('image'), ocrText);
router.post('/ocr/document', ocrAiGate, requireFeatureFlag('ai.feature.ocr', { defaultEnabled: false }), aiRateLimiter, visionUpload.single('image'), ocrDocument);
router.post('/ocr/labels', ocrAiGate, requireFeatureFlag('ai.feature.ocr', { defaultEnabled: false }), aiRateLimiter, visionUpload.single('image'), ocrLabels);

router.get('/chat/conversations', chatAiGate, aiRateLimiter, getChatConversations);
router.post(
  '/chat/conversations',
  chatAiGate,
  requireFeatureFlag('ai.feature.chat', { defaultEnabled: false }),
  aiRateLimiter,
  chatConversationCreateValidation,
  validateRequest,
  createChatConversation
);

router.get(
  '/chat/conversations/:id',
  chatAiGate,
  aiRateLimiter,
  chatConversationIdValidation,
  validateRequest,
  getChatConversationHistory
);

router.get('/chat/history', chatAiGate, aiRateLimiter, chatHistoryValidation, validateRequest, getChatHistory);

router.post('/chat/send', chatAiGate, requireFeatureFlag('ai.feature.chat', { defaultEnabled: false }), aiRateLimiter, chatSendValidation, validateRequest, sendChat);
router.post('/chat/regenerate', chatAiGate, requireFeatureFlag('ai.feature.chat', { defaultEnabled: false }), aiRateLimiter, chatRegenerateValidation, validateRequest, regenerateChat);
router.patch('/chat/message-status', chatAiGate, aiRateLimiter, chatMessageStatusValidation, validateRequest, updateMessageStatus);


router.post('/embeddings/create', embeddingsAiGate, requireFeatureFlag('ai.feature.embeddings', { defaultEnabled: false }), aiRateLimiter, embeddingsCreateValidation, validateRequest, embeddingsCreate);
router.post('/vector/search', embeddingsAiGate, requireFeatureFlag('ai.feature.embeddings', { defaultEnabled: false }), aiRateLimiter, vectorSearchValidation, validateRequest, vectorSearch);


module.exports = router;
