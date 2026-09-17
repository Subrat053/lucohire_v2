const { handleRoleAwareChat } = require('../../../services/chatAssistantService');

function normalizeRecentMessages(recentMessages = []) {
  return recentMessages
    .slice(-12)
    .map((item) => ({
      author: item.author,
      text: String(item.content || '').slice(0, 2000),
      createdAt: item.createdAt,
    }));
}

async function generateAssistantReply({ role, userId, message, context = {}, recentMessages = [] } = {}) {
  const safeRole = role || 'recruiter';
  const payload = {
    ...context,
    lastMessages: normalizeRecentMessages(recentMessages),
  };

  const response = await handleRoleAwareChat({
    role: safeRole,
    userId,
    message: String(message || '').trim(),
    context: payload,
  });

  return {
    text: response.reply || 'Main aapki help ke liye available hoon.',
    followUpQuestions: Array.isArray(response.followUpQuestions) ? response.followUpQuestions : [],
    confidence: Number(response.confidence || 0),
    aiStatus: response.aiStatus,
    model: response.model,
  };
}

module.exports = {
  generateAssistantReply,
};
