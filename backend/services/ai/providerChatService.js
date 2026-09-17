const {
  createConversation,
  appendMessage,
  getRecentMessages,
} = require('../../modules/ai/services/chatHistory.service');
const { parseProviderMessage } = require('./providerParser');
const { detectProviderIntent } = require('./providerIntentService');
const { buildFallbackReply, buildSuggestions } = require('./providerFallbackService');
const { generateStructuredProviderReply } = require('./llmService');

function sanitizeReply(value, fallback) {
  const reply = String(value || '').trim();
  return reply || fallback;
}

async function saveConversationMessages({ userId, role, message, reply, conversationId, debug }) {
  let activeConversationId = conversationId;

  if (!activeConversationId) {
    const created = await createConversation({
      userId,
      role,
      title: String(message || '').slice(0, 80) || 'Provider AI Assistant',
      metadata: { source: 'provider_ai_chat' },
    });
    activeConversationId = created.id;
  }

  const userMessage = await appendMessage({
    conversationId: activeConversationId,
    userId,
    role,
    author: 'user',
    content: message,
    status: 'sent',
    metadata: { source: 'provider_ai_chat' },
  });

  const assistantMessage = await appendMessage({
    conversationId: activeConversationId,
    userId,
    role,
    author: 'assistant',
    content: reply,
    status: 'sent',
    parentMessageId: userMessage.id,
    metadata: { source: 'provider_ai_chat', debug },
  });

  return { conversationId: activeConversationId, userMessage, assistantMessage };
}

async function handleProviderChat({ message, providerId, profileContext = {}, recentMessages = [], conversationId }) {
  const AIChatCache = require('../../models/AIChatCache');
  const cleanMsg = String(message || '').trim().toLowerCase();

  // Try fetching from cache first to optimize cost and performance
  try {
    const cached = await AIChatCache.findOne({ message: cleanMsg }).lean();
    if (cached) {
      const historyForModel = Array.isArray(recentMessages) && recentMessages.length > 0
        ? recentMessages
        : await getRecentMessages({
          conversationId,
          userId: providerId,
          limit: 8,
        });

      const persisted = await saveConversationMessages({
        userId: providerId,
        role: 'provider',
        message,
        reply: cached.reply,
        conversationId,
        debug: {
          usedLLM: false,
          cached: true,
          fallbackReason: '',
          parserMatched: ['cache'],
          recentMessageCount: historyForModel.length,
        },
      });

      return {
        conversationId: persisted.conversationId,
        detectedIntent: cached.detectedIntent,
        extracted: cached.extracted,
        reply: cached.reply,
        suggestions: cached.suggestions || [],
        debug: {
          usedLLM: false,
          cached: true,
          fallbackReason: '',
          parserMatched: ['cache'],
        },
      };
    }
  } catch (err) {
    console.warn('[AIChatCache Read Error]', err.message);
  }

  const parsed = parseProviderMessage({ message, profileContext });
  const intent = detectProviderIntent({ message, extracted: parsed.extracted });

  const fallback = buildFallbackReply({
    intent,
    extracted: parsed.extracted,
  });

  const llmAttempt = await generateStructuredProviderReply({
    message,
    intent,
    extracted: parsed.extracted,
    profileContext,
    recentMessages,
  });

  const usedLLM = Boolean(llmAttempt.used && llmAttempt.output);
  const reply = sanitizeReply(
    llmAttempt.output?.reply,
    fallback.reply
  );

  const suggestions = Array.isArray(llmAttempt.output?.suggestions) && llmAttempt.output.suggestions.length > 0
    ? llmAttempt.output.suggestions.slice(0, 3)
    : fallback.suggestions;

  const finalSuggestions = suggestions.length ? suggestions : buildSuggestions(intent);

  // Write to cache if LLM response is successful
  if (usedLLM && llmAttempt.output?.reply) {
    try {
      await AIChatCache.create({
        message: cleanMsg,
        reply,
        detectedIntent: intent,
        extracted: parsed.extracted,
        suggestions: finalSuggestions,
        model: llmAttempt.provider || 'openai',
      });
    } catch (err) {
      console.warn('[AIChatCache Write Error]', err.message);
    }
  }

  const historyForModel = Array.isArray(recentMessages) && recentMessages.length > 0
    ? recentMessages
    : await getRecentMessages({
      conversationId,
      userId: providerId,
      limit: 8,
    });

  const persisted = await saveConversationMessages({
    userId: providerId,
    role: 'provider',
    message,
    reply,
    conversationId,
    debug: {
      usedLLM,
      fallbackReason: usedLLM ? '' : (llmAttempt.reason || 'Fallback parser used'),
      parserMatched: parsed.parserMatched,
      recentMessageCount: historyForModel.length,
    },
  });

  return {
    conversationId: persisted.conversationId,
    detectedIntent: intent,
    extracted: parsed.extracted,
    reply,
    suggestions: finalSuggestions,
    debug: {
      usedLLM,
      fallbackReason: usedLLM ? '' : (llmAttempt.reason || 'Fallback parser used'),
      parserMatched: parsed.parserMatched,
    },
  };
}

module.exports = {
  handleProviderChat,
};
