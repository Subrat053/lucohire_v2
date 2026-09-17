const { chatAssistant } = require('./ai/anthropicService');
const { getPromptTemplate } = require('./ai/promptTemplateService');
const { callOpenAI } = require('./ai/llmService');

function sanitizeContext(context = {}) {
  const safe = {};
  const allowedKeys = ['intent', 'providerSummary', 'recruiterSummary', 'lastMessages', 'jobContext', 'dynamicContext', 'currentPage'];
  for (const key of allowedKeys) {
    if (context[key] !== undefined) {
      safe[key] = context[key];
    }
  }
  return safe;
}

function buildDynamicContextBlock(dynamicContext = {}) {
  if (!dynamicContext || !dynamicContext.visitorType) return '';

  const lines = [
    '=== CURRENT USER CONTEXT ===',
    `Visitor Type: ${dynamicContext.visitorType}`,
    `Active Role: ${dynamicContext.activeRole || 'unknown'}`,
    `Country: ${dynamicContext.country || 'unknown'}`,
  ];

  if (dynamicContext.currentPage) {
    lines.push(`Current Page: ${dynamicContext.currentPage}`);
  }
  if (dynamicContext.currentPlan) {
    lines.push(`Subscription Plan: ${dynamicContext.currentPlan}`);
  }
  if (dynamicContext.profileCompletion !== undefined) {
    lines.push(`Profile Completion: ${dynamicContext.profileCompletion}%`);
  }
  if (dynamicContext.visibilityLevel) {
    lines.push(`Visibility Level: ${dynamicContext.visibilityLevel}`);
  }
  if (dynamicContext.isActiveSubscription !== undefined) {
    lines.push(`Active Subscription: ${dynamicContext.isActiveSubscription ? 'Yes' : 'No'}`);
  }
  if (dynamicContext.isVerified !== undefined) {
    lines.push(`Verified Profile: ${dynamicContext.isVerified ? 'Yes' : 'No'}`);
  }
  if (dynamicContext.skillsUsed !== undefined) {
    lines.push(`Skills Used: ${dynamicContext.skillsUsed} / ${dynamicContext.skillLimit || '?'}`);
  }
  if (dynamicContext.locationsUsed !== undefined) {
    lines.push(`Locations Used: ${dynamicContext.locationsUsed} / ${dynamicContext.locationLimit || '?'}`);
  }
  if (dynamicContext.jobApplyUsed !== undefined) {
    lines.push(`Job Applications Used: ${dynamicContext.jobApplyUsed} / ${dynamicContext.jobApplyLimit || '?'}`);
  }
  if (dynamicContext.rating !== undefined) {
    lines.push(`Rating: ${dynamicContext.rating} (${dynamicContext.totalReviews || 0} reviews)`);
  }

  return lines.join('\n');
}

async function handleRoleAwareChat({ role, userId, message, context = {} }) {
  const safeContext = sanitizeContext(context);
  const dynamicBlock = buildDynamicContextBlock(safeContext.dynamicContext);

  // Build the input payload with dynamic context prepended
  const contextEnrichedMessage = dynamicBlock
    ? `${dynamicBlock}\n\nUser Query:\n${String(message || '').trim()}`
    : String(message || '').trim();

  try {
    const promptTemplate = await getPromptTemplate('role_aware_chat_assistant');
    const systemInstruction = promptTemplate ? promptTemplate.template : 'You are an AI assistant. Return JSON with keys: reply, follow_up_questions, confidence.';
    const userInput = {
      role,
      message: contextEnrichedMessage,
      context: safeContext,
      userMeta: { role, userId }
    };
    
    const fullPrompt = `${systemInstruction}\n\nINPUT:\n${JSON.stringify(userInput)}`;
    const openaiResult = await callOpenAI(fullPrompt);

    if (openaiResult.used && openaiResult.output) {
      return {
        reply: openaiResult.output.reply || 'Main aapki madad kar sakta hoon.',
        followUpQuestions: Array.isArray(openaiResult.output.follow_up_questions) ? openaiResult.output.follow_up_questions : [],
        confidence: Number(openaiResult.output.confidence || 0.3),
        aiStatus: 'success',
        model: 'gpt-4o-mini',
      };
    }
  } catch (error) {
    console.error('[OpenAI ChatAssistant Error]:', error);
  }

  const payload = {
    role,
    message: contextEnrichedMessage,
    context: safeContext,
    userMeta: {
      role,
      userId,
    },
  };

  const result = await chatAssistant(payload);

  return {
    reply: result.output?.reply || 'Aap details share karein, main madad karta hoon.',
    followUpQuestions: Array.isArray(result.output?.follow_up_questions) ? result.output.follow_up_questions : [],
    confidence: Number(result.output?.confidence || 0.3),
    aiStatus: result.status,
    model: result.model,
  };
}

module.exports = {
  handleRoleAwareChat,
};
