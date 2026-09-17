const ProviderEmbedding = require('../../models/ProviderEmbedding');
const RecruiterHireEmbedding = require('../../models/RecruiterHireEmbedding');

function cosineSimilarity(a = [], b = []) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  const length = Math.min(a.length, b.length);

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    const va = Number(a[i] || 0);
    const vb = Number(b[i] || 0);
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function upsertProviderEmbedding({ providerId, vector, model, textSnapshot, metadata = {} }) {
  if (!providerId) throw new Error('providerId is required for embedding upsert');

  const doc = await ProviderEmbedding.findOneAndUpdate(
    { providerId },
    {
      $set: {
        vector: Array.isArray(vector) ? vector : [],
        model: model || 'text-embedding-3-small',
        dimensions: Array.isArray(vector) ? vector.length : 0,
        textSnapshot: textSnapshot || '',
        metadata,
        updatedAtSource: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return doc;
}

async function inMemoryVectorSearch(queryVector, limit, filter = {}) {
  const docs = await ProviderEmbedding.find(filter).select('providerId model metadata vector').lean();
  return docs
    .map((doc) => ({
      providerId: doc.providerId,
      model: doc.model,
      metadata: doc.metadata || {},
      score: cosineSimilarity(queryVector, doc.vector || []),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function searchProvidersBySemanticIntent({ vector, limit = 20, filter = {} }) {
  if (!Array.isArray(vector) || vector.length === 0) return [];

  const results = await inMemoryVectorSearch(vector, limit, filter);
  return results.map((item) => ({
    providerId: String(item.providerId),
    score: Number(item.score || 0),
    metadata: item.metadata || {},
  }));
}

async function searchSimilarProviders({ providerId, limit = 10 }) {
  const source = await ProviderEmbedding.findOne({ providerId }).lean();
  if (!source || !Array.isArray(source.vector) || source.vector.length === 0) return [];

  const results = await searchProvidersBySemanticIntent({
    vector: source.vector,
    limit: limit + 1,
  });

  return results.filter((item) => String(item.providerId) !== String(providerId)).slice(0, limit);
}

async function searchByRecruiterHistory({ recruiterId, limit = 10 }) {
  const recent = await RecruiterHireEmbedding.findOne({ recruiterId }).sort({ createdAt: -1 }).lean();
  if (!recent || !Array.isArray(recent.vector) || recent.vector.length === 0) return [];

  return searchProvidersBySemanticIntent({
    vector: recent.vector,
    limit,
  });
}

module.exports = {
  upsertProviderEmbedding,
  searchProvidersBySemanticIntent,
  searchSimilarProviders,
  searchByRecruiterHistory,
  cosineSimilarity,
};
