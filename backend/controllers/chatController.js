const { sendChatMessage } = require('../modules/ai/services/aiOrchestrator.service');
const { logBusinessEvent } = require('../services/eventLogService');

const aiChat = async (req, res) => {
  try {
    const role = req.user?.activeRole || req.user?.role || req.body.role || 'recruiter';
    const { message, context = {} } = req.body;

    if (!message || String(message).trim().length < 2) {
      return res.status(400).json({ message: 'message must be at least 2 characters' });
    }

    const response = await sendChatMessage({
      role,
      userId: req.user?._id || null,
      conversationId: req.body.conversationId || null,
      message,
      clientMessageId: req.body.clientMessageId || null,
      context,
    });

    await logBusinessEvent({
      taskType: 'ai_chat',
      relatedEntityType: role,
      relatedEntityId: req.user?._id || '',
      payload: { messageLength: String(message).length },
      result: { aiStatus: response.ai?.status || 'success' },
      status: 'success',
    });

    return res.json({
      reply: response.assistantMessage?.content || 'Main aapki help ke liye available hoon.',
      conversationId: response.conversationId,
      aiStatus: response.ai?.status || 'success',
      model: response.ai?.model || 'unknown',
      confidence: Number(response.ai?.confidence || 0),
      followUpQuestions: response.ai?.followUpQuestions || [],
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to process AI chat request', error: error.message });
  }
};

module.exports = {
  aiChat,
};
