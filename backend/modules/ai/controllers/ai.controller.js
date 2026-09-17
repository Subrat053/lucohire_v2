const asyncHandler = require('../../../utils/asyncHandler');
const {
  buildProviderProfileFromFreeText,
  improveProviderDescription,
  suggestSkillsAndTags,
  suggestPricingRange,
  generateStructuredProfileData,
  extractTextFromImage,
  extractDocumentTextFromImage,
  detectLabelsFromImage,
  createEmbedding,
  searchByVector,
  searchByText,
  createConversation,
  listConversations,
  getConversationHistory,
  sendChatMessage,
  regenerateAssistantReply,
  markMessageStatus,
  getDiagnostics,
} = require('../services/aiOrchestrator.service');

function getRole(req) {
  return req.user?.activeRole || req.user?.role || 'recruiter';
}

const profileBuild = asyncHandler(async (req, res) => {
  const role = getRole(req);
  const userId = req.user?._id || null;
  const { input, existingSkills = [], category = '', city = '' } = req.body;

  const data = await generateStructuredProfileData({
    input,
    category,
    city,
    existingSkills,
    userMeta: { userId, role },
  });

  res.status(200).json({
    success: true,
    message: 'Profile structured data generated successfully',
    data,
  });
});

const profileImprove = asyncHandler(async (req, res) => {
  const role = getRole(req);
  const userId = req.user?._id || null;
  const { input, existingSkills = [] } = req.body;

  const [improved, skills] = await Promise.all([
    improveProviderDescription({ input, existingSkills, userMeta: { userId, role } }),
    suggestSkillsAndTags({ input, existingSkills, userMeta: { userId, role } }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Profile description improved successfully',
    data: {
      ...improved,
      skills,
    },
  });
});

const ocrText = asyncHandler(async (req, res) => {
  const data = await extractTextFromImage(req.file?.buffer);
  res.status(200).json({ success: true, message: 'OCR text extraction completed', data });
});

const ocrDocument = asyncHandler(async (req, res) => {
  const data = await extractDocumentTextFromImage(req.file?.buffer);
  res.status(200).json({ success: true, message: 'OCR document extraction completed', data });
});

const ocrLabels = asyncHandler(async (req, res) => {
  const data = await detectLabelsFromImage(req.file?.buffer);
  res.status(200).json({ success: true, message: 'OCR label detection completed', data });
});

const createChatConversation = asyncHandler(async (req, res) => {
  const role = getRole(req);
  const userId = req.user._id;
  const { title, metadata = {} } = req.body;

  const data = await createConversation({ userId, role, title, metadata });

  res.status(201).json({
    success: true,
    message: 'Conversation created successfully',
    data,
  });
});

const getChatConversations = asyncHandler(async (req, res) => {
  const role = getRole(req);
  const userId = req.user._id;
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);

  const data = await listConversations({ userId, role, page, limit });

  res.status(200).json({
    success: true,
    message: 'Conversations fetched successfully',
    data,
  });
});

const getChatConversationHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const conversationId = req.params.id;
  const limit = Number(req.query.limit || 30);
  const beforeMessageId = req.query.before || null;

  const data = await getConversationHistory({
    conversationId,
    userId,
    limit,
    beforeMessageId,
  });

  res.status(200).json({
    success: true,
    message: 'Conversation history fetched successfully',
    data,
  });
});

const getChatHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const conversationId = req.query.conversationId;
  const limit = Number(req.query.limit || 30);
  const beforeMessageId = req.query.before || null;

  const data = await getConversationHistory({
    conversationId,
    userId,
    limit,
    beforeMessageId,
  });

  res.status(200).json({
    success: true,
    message: 'Chat history fetched successfully',
    data,
  });
});

const sendChat = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = getRole(req);
  const { conversationId, message, clientMessageId, context = {} } = req.body;

  // ── Build dynamic user context for AI ─────────────────────────────────
  const dynamicContext = {
    visitorType: 'authenticated',
    activeRole: role,
    country: req.user.country || 'IN',
    currentPage: context.currentPage || '',
  };

  try {
    if (role === 'provider') {
      const ProviderProfile = require('../../../models/ProviderProfile');
      const ProviderUsage = require('../../../models/ProviderUsage');

      const profile = await ProviderProfile.findOne({ userId })
        .select('currentPlan profileCompletion skills serviceLocations allowedSkillsCount allowedPincodesCount allowedCitiesCount visibilityLevel isVerified isActiveSubscription rating totalReviews')
        .lean();

      if (profile) {
        dynamicContext.currentPlan = profile.currentPlan || 'free';
        dynamicContext.profileCompletion = profile.profileCompletion || 0;
        dynamicContext.skillsUsed = Array.isArray(profile.skills) ? profile.skills.length : 0;
        dynamicContext.skillLimit = profile.allowedSkillsCount || 1;
        dynamicContext.locationsUsed = Array.isArray(profile.serviceLocations) ? profile.serviceLocations.length : 0;
        dynamicContext.locationLimit = (profile.allowedPincodesCount || 1) + (profile.allowedCitiesCount || 0);
        dynamicContext.visibilityLevel = profile.visibilityLevel || 'basic';
        dynamicContext.isVerified = profile.isVerified || false;
        dynamicContext.isActiveSubscription = profile.isActiveSubscription || false;
        dynamicContext.rating = profile.rating || 0;
        dynamicContext.totalReviews = profile.totalReviews || 0;
      }

      // Get current job application usage
      const usage = await ProviderUsage.findOne({
        providerId: userId,
        periodEnd: { $gte: new Date() },
      }).select('jobApplicationsUsed jobApplicationsLimit').lean();

      if (usage) {
        dynamicContext.jobApplyUsed = usage.jobApplicationsUsed || 0;
        dynamicContext.jobApplyLimit = usage.jobApplicationsLimit || 0;
      }
    }
  } catch (contextError) {
    // Non-critical — continue with whatever context we have
    console.log('[CHAT] Failed to enrich dynamic context:', contextError.message);
  }

  const enrichedContext = { ...context, dynamicContext };

  const data = await sendChatMessage({
    userId,
    role,
    conversationId,
    message,
    clientMessageId,
    context: enrichedContext,
  });

  res.status(200).json({
    success: true,
    message: 'Chat message processed successfully',
    data,
  });
});

const regenerateChat = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = getRole(req);
  const { conversationId, messageId } = req.body;

  const data = await regenerateAssistantReply({
    userId,
    role,
    conversationId,
    messageId,
  });

  res.status(200).json({
    success: true,
    message: 'Assistant reply regenerated successfully',
    data,
  });
});

const updateMessageStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { conversationId, messageId, status } = req.body;

  const data = await markMessageStatus({
    conversationId,
    messageId,
    userId,
    status,
  });

  res.status(200).json({
    success: true,
    message: 'Message status updated successfully',
    data,
  });
});

const embeddingsCreate = asyncHandler(async (req, res) => {
  const role = getRole(req);
  const userId = req.user?._id || null;
  const { text, providerId = null, metadata = {}, model } = req.body;

  const data = await createEmbedding({
    text,
    providerId,
    metadata,
    model,
    userId,
    role,
  });

  res.status(200).json({ success: true, message: 'Embedding generated successfully', data });
});

const vectorSearch = asyncHandler(async (req, res) => {
  const role = getRole(req);
  const userId = req.user?._id || null;
  const { text, vector, limit = 20, filter = {} } = req.body;

  let data;
  if (Array.isArray(vector) && vector.length > 0) {
    const results = await searchByVector({ vector, limit, filter });
    data = { embedding: null, results };
  } else {
    data = await searchByText({ text, userId, role, limit, filter });
  }

  res.status(200).json({ success: true, message: 'Vector search completed successfully', data });
});

const profileBuildFromFreeText = asyncHandler(async (req, res) => {
  const role = getRole(req);
  const userId = req.user?._id || null;
  const { input, existingSkills = [] } = req.body;

  const data = await buildProviderProfileFromFreeText({
    input,
    existingSkills,
    userMeta: { userId, role },
  });

  res.status(200).json({ success: true, message: 'Profile build completed', data });
});

const pricingSuggestion = asyncHandler(async (req, res) => {
  const role = getRole(req);
  const userId = req.user?._id || null;
  const { input, category, city } = req.body;

  const data = await suggestPricingRange({
    input,
    category,
    city,
    userMeta: { userId, role },
  });

  res.status(200).json({ success: true, message: 'Pricing suggestion completed', data });
});

const aiHealth = asyncHandler(async (req, res) => {
  const data = await getDiagnostics();
  res.status(200).json(data);
});

module.exports = {
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
};
