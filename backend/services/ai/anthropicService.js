const axios = require('axios');
const AIUsageLog = require('../../models/AIUsageLog');
const AIInteractionLog = require('../../models/AIInteractionLog');
const { getPromptTemplate } = require('./promptTemplateService');
const {
  sanitizePromptInput,
  safeJsonParse,
  isPlainObject,
  estimateTokens,
  sleep,
} = require('./utils');
const { checkAiFeatureEnabled } = require('../../modules/ai/config/ai.config');


const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const ANTHROPIC_TIMEOUT_MS = Math.max(2000, Number(process.env.ANTHROPIC_TIMEOUT_MS || 15000));
const ANTHROPIC_MAX_RETRIES = Math.max(0, Number(process.env.ANTHROPIC_MAX_RETRIES || 2));

const SONNET_INPUT_USD_PER_MTOK = Number(process.env.ANTHROPIC_INPUT_USD_PER_MTOK || 3);
const SONNET_OUTPUT_USD_PER_MTOK = Number(process.env.ANTHROPIC_OUTPUT_USD_PER_MTOK || 15);

function estimateClaudeCostUsd(inputTokens, outputTokens) {
  const inCost = (Number(inputTokens || 0) / 1_000_000) * SONNET_INPUT_USD_PER_MTOK;
  const outCost = (Number(outputTokens || 0) / 1_000_000) * SONNET_OUTPUT_USD_PER_MTOK;
  return Number((inCost + outCost).toFixed(8));
}

function makeFallback(label, data = {}) {
  return {
    status: 'fallback',
    model: 'rule-fallback',
    output: {
      label,
      ...data,
    },
  };
}

function buildMessagePayload({ template, userInput, temperature, maxTokens }) {
  const serializedInput = sanitizePromptInput(
    typeof userInput === 'string' ? userInput : JSON.stringify(userInput || {})
  );

  return {
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: [
      {
        role: 'user',
        content: `${template}\n\nINPUT:\n${serializedInput}`,
      },
    ],
  };
}

async function logAiUsage({ userId, role, feature, model, status, latencyMs, inputTokens, outputTokens, errorMessage, metadata = {} }) {
  const totalTokens = Number(inputTokens || 0) + Number(outputTokens || 0);
  const estimatedCostUsd = estimateClaudeCostUsd(inputTokens, outputTokens);

  await AIUsageLog.create({
    userId: userId || null,
    role: role || 'system',
    feature,
    provider: 'anthropic',
    model,
    inputTokens: Number(inputTokens || 0),
    outputTokens: Number(outputTokens || 0),
    totalTokens,
    estimatedCostUsd,
    latencyMs: Number(latencyMs || 0),
    status,
    errorMessage: errorMessage || '',
    metadata,
  });

  return { totalTokens, estimatedCostUsd };
}

async function logInteraction({ userId, role, feature, input, output, model, status }) {
  await AIInteractionLog.create({
    userId: userId || null,
    role: role || 'system',
    feature,
    promptType: feature,
    input,
    output,
    model,
    status,
    createdAt: new Date(),
  });
}

async function runJsonTask({ templateKey, feature, userInput, fallbackOutput, userMeta = {}, schemaValidator }) {
  const isEnabled = await checkAiFeatureEnabled(feature);
  if (!isEnabled) {
    return makeFallback('feature_disabled_by_admin', fallbackOutput);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const fallback = makeFallback('anthropic_not_configured', fallbackOutput);
    await logInteraction({ userId: userMeta.userId, role: userMeta.role, feature, input: userInput, output: fallback.output, model: fallback.model, status: fallback.status });
    return fallback;
  }


  const promptTemplate = await getPromptTemplate(templateKey);
  const payload = buildMessagePayload({
    template: promptTemplate.template,
    userInput,
    temperature: promptTemplate.temperature,
    maxTokens: promptTemplate.maxTokens,
  });

  let lastError = null;

  for (let attempt = 0; attempt <= ANTHROPIC_MAX_RETRIES; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await axios.post(ANTHROPIC_URL, payload, {
        timeout: ANTHROPIC_TIMEOUT_MS,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      });

      const text = Array.isArray(response.data?.content)
        ? response.data.content.map((item) => item?.text || '').join('\n')
        : '';
      const parsed = safeJsonParse(text);

      if (!isPlainObject(parsed)) {
        throw new Error('Model did not return JSON object');
      }

      if (typeof schemaValidator === 'function' && !schemaValidator(parsed)) {
        throw new Error('Model response failed schema validation');
      }

      const inputTokens = response.data?.usage?.input_tokens || estimateTokens(JSON.stringify(payload));
      const outputTokens = response.data?.usage?.output_tokens || estimateTokens(text);
      const latencyMs = Date.now() - startedAt;

      await logAiUsage({
        userId: userMeta.userId,
        role: userMeta.role,
        feature,
        model: ANTHROPIC_MODEL,
        status: 'success',
        latencyMs,
        inputTokens,
        outputTokens,
        metadata: { templateKey, templateSource: promptTemplate.source },
      });

      await logInteraction({
        userId: userMeta.userId,
        role: userMeta.role,
        feature,
        input: userInput,
        output: parsed,
        model: ANTHROPIC_MODEL,
        status: 'success',
      });

      return {
        status: 'success',
        model: ANTHROPIC_MODEL,
        output: parsed,
      };
    } catch (error) {
      lastError = error;
      const latencyMs = Date.now() - startedAt;
      await logAiUsage({
        userId: userMeta.userId,
        role: userMeta.role,
        feature,
        model: ANTHROPIC_MODEL,
        status: 'failed',
        latencyMs,
        inputTokens: estimateTokens(JSON.stringify(payload)),
        outputTokens: 0,
        errorMessage: error.message,
        metadata: { attempt },
      });

      if (attempt < ANTHROPIC_MAX_RETRIES) {
        await sleep(250 * (attempt + 1));
      }
    }
  }

  const fallback = makeFallback('anthropic_error', {
    ...fallbackOutput,
    error: lastError?.message || 'unknown_error',
  });

  await logInteraction({
    userId: userMeta.userId,
    role: userMeta.role,
    feature,
    input: userInput,
    output: fallback.output,
    model: fallback.model,
    status: fallback.status,
  });

  return fallback;
}

function buildProviderProfile(input = {}) {
  const freeText = sanitizePromptInput(input.freeText || '');
  const fallbackOutput = {
    description: freeText || 'Reliable service provider available for quality work.',
    skills: Array.isArray(input.existingSkills) ? input.existingSkills : [],
    suggested_pricing_range: { min: 400, max: 1500, avg: 900 },
    category: input.category || '',
    service_tags: [],
    confidence: 0.3,
  };

  return runJsonTask({
    templateKey: 'provider_profile_builder',
    feature: 'provider_profile_builder',
    userInput: input,
    fallbackOutput,
    userMeta: input.userMeta,
    schemaValidator: (obj) => Array.isArray(obj.skills) && typeof obj.description === 'string',
  });
}

function generateJobDescription(input = {}) {
  const fallbackOutput = {
    title: input.prompt || 'Service requirement',
    description: 'Need a reliable provider for this requirement.',
    duties: ['Perform assigned work on time'],
    salary_range: { min: Number(input.budgetMin || 0), max: Number(input.budgetMax || 0), avg: Number(input.budgetMax || input.budgetMin || 0) },
    requirements: ['Experience preferred'],
    urgency_hints: ['normal'],
    confidence: 0.35,
  };

  return runJsonTask({
    templateKey: 'recruiter_job_description',
    feature: 'recruiter_job_description',
    userInput: input,
    fallbackOutput,
    userMeta: input.userMeta,
    schemaValidator: (obj) => typeof obj.title === 'string' && typeof obj.description === 'string',
  });
}

function suggestPricing(input = {}) {
  const min = Number(input.marketStats?.avgMin || 500);
  const max = Number(input.marketStats?.avgMax || 2500);
  const avg = Math.round((min + max) / 2);

  return runJsonTask({
    templateKey: 'provider_pricing_suggestion',
    feature: 'provider_pricing_suggestion',
    userInput: input,
    fallbackOutput: {
      min,
      max,
      avg,
      reasoning: 'Based on recent marketplace averages for selected skill and city.',
      confidence: 0.45,
    },
    userMeta: input.userMeta,
    schemaValidator: (obj) => Number.isFinite(Number(obj.min)) && Number.isFinite(Number(obj.max)),
  });
}

function generateDashboardInsights(input = {}) {
  return runJsonTask({
    templateKey: 'provider_dashboard_insights',
    feature: 'provider_dashboard_insights',
    userInput: input,
    fallbackOutput: {
      tips: [
        'Reply time thoda fast karo, leads jaldi convert honge.',
        'Profile me recent work photos add karo trust aur visibility improve hogi.',
      ],
      summary: 'Consistency + quick response can improve conversion.',
      confidence: 0.4,
    },
    userMeta: input.userMeta,
    schemaValidator: (obj) => Array.isArray(obj.tips),
  });
}

function chatAssistant(input = {}) {
  return runJsonTask({
    templateKey: 'role_aware_chat_assistant',
    feature: 'role_aware_chat_assistant',
    userInput: input,
    fallbackOutput: {
      reply: 'Main aapki madad kar sakta hoon. Skill, city, budget aur urgency share karein.',
      follow_up_questions: ['Aapko kaunsi service chahiye?', 'City aur budget kya hai?'],
      confidence: 0.25,
    },
    userMeta: input.userMeta,
    schemaValidator: (obj) => typeof obj.reply === 'string',
  });
}

function fraudReview(input = {}) {
  return runJsonTask({
    templateKey: 'fraud_cluster_review',
    feature: 'fraud_cluster_review',
    userInput: input,
    fallbackOutput: {
      risk_level: 'medium',
      reasons: ['Rule-engine signals need manual validation'],
      recommended_action: 'admin_review',
      confidence: 0.35,
    },
    userMeta: input.userMeta,
    schemaValidator: (obj) => typeof obj.risk_level === 'string' && typeof obj.recommended_action === 'string',
  });
}

function boostSuggestionText(input = {}) {
  return runJsonTask({
    templateKey: 'boost_suggestion_copy',
    feature: 'boost_suggestion_copy',
    userInput: input,
    fallbackOutput: {
      message: 'Aaj demand high hai. Apna profile boost karke zyada leads pao.',
      rationale: 'High demand spike detected in your city-skill cluster.',
      confidence: 0.35,
    },
    userMeta: input.userMeta,
    schemaValidator: (obj) => typeof obj.message === 'string',
  });
}

function runSearchIntentAI(input = {}) {
  const query = sanitizePromptInput(input.query || '');
  const fallbackOutput = {
    extractedSkill: '',
    extractedCity: '',
    extractedLocality: '',
    extractedUrgency: '',
    extractedBudgetMin: null,
    extractedBudgetMax: null,
    extractedShiftType: '',
    extractedTimeOfDay: '',
    confidence: 0.25,
  };

  return runJsonTask({
    templateKey: 'recruiter_search_intent',
    feature: 'ai.search_interpret',
    userInput: input,
    fallbackOutput,
    userMeta: input.userMeta,
    schemaValidator: (obj) => typeof obj === 'object',
  });
}

module.exports = {
  buildProviderProfile,
  generateJobDescription,
  suggestPricing,
  generateDashboardInsights,
  chatAssistant,
  fraudReview,
  boostSuggestionText,
  runSearchIntentAI,
};
