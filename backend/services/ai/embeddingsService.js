const axios = require('axios');
const AIUsageLog = require('../../models/AIUsageLog');
const { estimateTokens } = require('./utils');

const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const OPENAI_TIMEOUT_MS = Math.max(2000, Number(process.env.OPENAI_TIMEOUT_MS || 12000));
const EMBEDDING_USD_PER_MTOK = Number(process.env.OPENAI_EMBEDDING_USD_PER_MTOK || 0.02);

function costFromTokens(tokens) {
  return Number(((Number(tokens || 0) / 1_000_000) * EMBEDDING_USD_PER_MTOK).toFixed(8));
}

async function logEmbeddingUsage({ feature, userId, role, model, tokens, status, errorMessage, latencyMs }) {
  await AIUsageLog.create({
    userId: userId || null,
    role: role || 'system',
    feature,
    provider: 'openai',
    model,
    inputTokens: Number(tokens || 0),
    outputTokens: 0,
    totalTokens: Number(tokens || 0),
    estimatedCostUsd: costFromTokens(tokens),
    latencyMs: Number(latencyMs || 0),
    status,
    errorMessage: errorMessage || '',
    metadata: {},
  });
}

async function embedText(text, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = options.model || OPENAI_EMBEDDING_MODEL;
  const feature = options.feature || 'embedding_generic';
  const startedAt = Date.now();

  if (!apiKey) {
    const fallbackVector = [];
    await logEmbeddingUsage({
      feature,
      userId: options.userId,
      role: options.role,
      model,
      tokens: estimateTokens(text),
      status: 'fallback',
      errorMessage: 'OPENAI_API_KEY missing',
      latencyMs: Date.now() - startedAt,
    });
    return { vector: fallbackVector, model, dimensions: 0, status: 'fallback' };
  }

  try {
    const response = await axios.post(
      OPENAI_EMBEDDING_URL,
      {
        model,
        input: String(text || ''),
      },
      {
        timeout: OPENAI_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const vector = response.data?.data?.[0]?.embedding || [];
    const tokenUsage = response.data?.usage?.total_tokens || estimateTokens(text);

    await logEmbeddingUsage({
      feature,
      userId: options.userId,
      role: options.role,
      model,
      tokens: tokenUsage,
      status: 'success',
      latencyMs: Date.now() - startedAt,
    });

    return {
      vector,
      model,
      dimensions: Array.isArray(vector) ? vector.length : 0,
      status: 'success',
    };
  } catch (error) {
    await logEmbeddingUsage({
      feature,
      userId: options.userId,
      role: options.role,
      model,
      tokens: estimateTokens(text),
      status: 'failed',
      errorMessage: error.message,
      latencyMs: Date.now() - startedAt,
    });

    return { vector: [], model, dimensions: 0, status: 'failed', error: error.message };
  }
}

function stringifyPayload(payload) {
  if (typeof payload === 'string') return payload;
  return JSON.stringify(payload || {});
}

function embedProviderProfile(profilePayload, meta = {}) {
  return embedText(stringifyPayload(profilePayload), {
    ...meta,
    feature: 'provider_profile_embedding',
  });
}

function embedRecruiterHireHistory(historyPayload, meta = {}) {
  return embedText(stringifyPayload(historyPayload), {
    ...meta,
    feature: 'recruiter_hire_history_embedding',
  });
}

function embedSearchQuery(query, meta = {}) {
  return embedText(String(query || ''), {
    ...meta,
    feature: 'search_query_embedding',
  });
}

function embedJobIntent(intentPayload, meta = {}) {
  return embedText(stringifyPayload(intentPayload), {
    ...meta,
    feature: 'job_intent_embedding',
  });
}

module.exports = {
  embedText,
  embedProviderProfile,
  embedRecruiterHireHistory,
  embedSearchQuery,
  embedJobIntent,
};
