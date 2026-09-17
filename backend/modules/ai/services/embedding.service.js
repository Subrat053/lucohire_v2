const { embedText } = require('../../../services/ai/embeddingsService');
const {
  upsertProviderEmbedding,
  searchProvidersBySemanticIntent,
} = require('../../../services/ai/vectorSearchService');

async function createEmbedding({
  text,
  userId = null,
  role = 'system',
  model,
  providerId = null,
  metadata = {},
} = {}) {
  const input = String(text || '').trim();
  if (!input) {
    throw new Error('text is required to create embedding');
  }

  const embedded = await embedText(input, {
    userId,
    role,
    model,
    feature: 'ai_embedding_create',
  });

  const payload = {
    text: input,
    model: embedded.model,
    dimensions: embedded.dimensions,
    status: embedded.status,
    vector: embedded.vector || [],
    metadata,
  };

  if (providerId && Array.isArray(embedded.vector) && embedded.vector.length > 0) {
    const doc = await upsertProviderEmbedding({
      providerId,
      vector: embedded.vector,
      model: embedded.model,
      textSnapshot: input,
      metadata,
    });
    payload.providerEmbeddingId = String(doc._id);
  }

  return payload;
}

async function searchByVector({ vector, limit = 20, filter = {} } = {}) {
  if (!Array.isArray(vector) || vector.length === 0) {
    return [];
  }

  return searchProvidersBySemanticIntent({
    vector,
    limit: Math.max(1, Math.min(100, Number(limit || 20))),
    filter,
  });
}

async function searchByText({ text, userId = null, role = 'system', limit = 20, filter = {} } = {}) {
  const embedding = await createEmbedding({ text, userId, role });
  if (!Array.isArray(embedding.vector) || embedding.vector.length === 0) {
    return {
      embedding,
      results: [],
    };
  }

  const results = await searchByVector({ vector: embedding.vector, limit, filter });
  return {
    embedding,
    results,
  };
}

module.exports = {
  createEmbedding,
  searchByVector,
  searchByText,
};
