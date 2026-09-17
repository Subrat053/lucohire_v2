const {
  buildProviderProfileFromFreeText,
  improveProviderDescription,
  suggestSkillsAndTags,
  suggestPricingRange,
  generateStructuredProfileData,
} = require('./profileBuilder.service');
const {
  extractTextFromImage,
  extractDocumentTextFromImage,
  detectLabelsFromImage,
} = require('./ocr.service');
const {
  createEmbedding,
  searchByVector,
  searchByText,
} = require('./embedding.service');
const {
  createConversation,
  listConversations,
  getConversationHistory,
  getRecentMessages,
  appendMessage,
  markMessageStatus,
} = require('./chatHistory.service');
const { generateAssistantReply } = require('./chat.service');
const { analyzeFraudSignals, reviewFraudClusters } = require('./fraud.service');
const { getQueueHealth } = require('./queue.service');
const { pingRedis } = require('../../queue/redis.client');

function getHealthStatus() {
  const openAiOk = !!String(process.env.OPENAI_API_KEY || '').trim();
  const visionOk = !!String(process.env.GOOGLE_VISION_API_KEY || '').trim();
  const vectorIndexOk = !!String(process.env.MONGO_VECTOR_INDEX_NAME || '').trim();
  const queueInfo = getQueueHealth();

  return {
    success: true,
    services: {
      openai: openAiOk ? 'ok' : 'missing',
      vision: visionOk ? 'ok' : 'missing',
      mongodb: vectorIndexOk ? 'ok' : 'missing_vector_index',
      queue: queueInfo.enabled ? 'enabled' : 'inline',
      workerMode: queueInfo.mode,
      queueReason: queueInfo.reason,
    },
  };
}

async function getDiagnostics() {
  const base = getHealthStatus();
  const redis = await pingRedis();

  return {
    ...base,
    services: {
      ...base.services,
      redis: redis.ok ? 'ok' : 'unavailable',
      redisStatus: redis.status,
      redisReason: redis.reason,
    },
  };
}

async function sendChatMessage({
  userId,
  role,
  conversationId,
  message,
  clientMessageId,
  context = {},
}) {
  let activeConversationId = conversationId;
  if (!activeConversationId) {
    const conversation = await createConversation({ userId, role, title: String(message || '').slice(0, 80) });
    activeConversationId = conversation.id;
  }

  const userMessage = await appendMessage({
    conversationId: activeConversationId,
    userId,
    role,
    author: 'user',
    content: message,
    status: 'sent',
    clientMessageId,
    metadata: {
      source: 'chat_send',
    },
  });

  const recentMessages = await getRecentMessages({
    conversationId: activeConversationId,
    userId,
    limit: 12,
  });

  const assistantReply = await generateAssistantReply({
    role,
    userId,
    message,
    context,
    recentMessages,
  });

  const assistantMessage = await appendMessage({
    conversationId: activeConversationId,
    userId,
    role,
    author: 'assistant',
    content: assistantReply.text,
    status: 'sent',
    parentMessageId: userMessage.id,
    metadata: {
      aiStatus: assistantReply.aiStatus,
      model: assistantReply.model,
      confidence: assistantReply.confidence,
      followUpQuestions: assistantReply.followUpQuestions,
    },
  });

  return {
    conversationId: activeConversationId,
    userMessage,
    assistantMessage,
    ai: {
      status: assistantReply.aiStatus,
      model: assistantReply.model,
      confidence: assistantReply.confidence,
      followUpQuestions: assistantReply.followUpQuestions,
    },
  };
}

async function regenerateAssistantReply({ userId, role, conversationId, messageId }) {
  const history = await getConversationHistory({
    conversationId,
    userId,
    limit: 100,
  });

  const target = history.items.find((item) => item.id === String(messageId) && item.author === 'user');
  if (!target) throw new Error('User message not found for regeneration');

  const recentMessages = history.items.filter((item) => item.id !== target.id).slice(-12);

  const assistantReply = await generateAssistantReply({
    role,
    userId,
    message: target.content,
    context: {},
    recentMessages,
  });

  const regenerated = await appendMessage({
    conversationId,
    userId,
    role,
    author: 'assistant',
    content: assistantReply.text,
    status: 'regenerated',
    parentMessageId: target.id,
    metadata: {
      regenerated: true,
      aiStatus: assistantReply.aiStatus,
      model: assistantReply.model,
      confidence: assistantReply.confidence,
    },
  });

  return {
    conversationId,
    message: regenerated,
  };
}

module.exports = {
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
  analyzeFraudSignals,
  reviewFraudClusters,
  getHealthStatus,
  getDiagnostics,
};
