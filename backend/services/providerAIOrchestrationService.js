const ProviderProfile = require('../models/ProviderProfile');
const ProviderAIProfile = require('../models/ProviderAIProfile');
const ProviderEmbedding = require('../models/ProviderEmbedding');
const RecruiterHireEmbedding = require('../models/RecruiterHireEmbedding');
const { buildProviderProfile, generateDashboardInsights } = require('./ai/anthropicService');
const { embedProviderProfile, embedRecruiterHireHistory } = require('./ai/embeddingsService');
const { upsertProviderEmbedding } = require('./ai/vectorSearchService');
const { processProviderDocumentVerification } = require('./ai/visionOcrService');

async function buildAndPersistProviderAIProfile({ providerId, freeText, existingSkills = [] }) {
  const ai = await buildProviderProfile({
    freeText,
    existingSkills,
    userMeta: { userId: providerId, role: 'provider' },
  });

  const output = ai.output || {};

  await ProviderAIProfile.findOneAndUpdate(
    { providerId },
    {
      $set: {
        rawInput: String(freeText || ''),
        generatedProfile: {
          description: output.description || '',
          skills: Array.isArray(output.skills) ? output.skills : [],
          suggestedPricingRange: {
            min: Number(output.suggested_pricing_range?.min || 0),
            max: Number(output.suggested_pricing_range?.max || 0),
            avg: Number(output.suggested_pricing_range?.avg || 0),
            currency: output.suggested_pricing_range?.currency || 'INR',
          },
          category: output.category || '',
          serviceTags: Array.isArray(output.service_tags) ? output.service_tags : [],
        },
        model: ai.model,
        source: ai.status === 'success' ? 'claude' : 'fallback',
        status: ai.status,
        confidence: Number(output.confidence || 0.4),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return ai;
}

function buildProviderEmbeddingText(profile, aiProfile = null) {
  const parts = [
    profile?.user?.name || '',
    profile?.description || '',
    Array.isArray(profile?.skills) ? profile.skills.join(', ') : '',
    profile?.city || '',
    profile?.state || '',
    aiProfile?.generatedProfile?.description || '',
    Array.isArray(aiProfile?.generatedProfile?.serviceTags) ? aiProfile.generatedProfile.serviceTags.join(', ') : '',
  ].filter(Boolean);

  return parts.join(' | ');
}

async function refreshProviderEmbedding(providerId) {
  const [profile, aiProfile] = await Promise.all([
    ProviderProfile.findOne({ user: providerId }).populate('user', 'name').lean(),
    ProviderAIProfile.findOne({ providerId }).lean(),
  ]);

  if (!profile) {
    return { status: 'skipped', reason: 'provider_profile_not_found' };
  }

  const textSnapshot = buildProviderEmbeddingText(profile, aiProfile);
  const embedding = await embedProviderProfile(textSnapshot, {
    userId: providerId,
    role: 'provider',
  });

  if (!Array.isArray(embedding.vector) || embedding.vector.length === 0) {
    return { status: embedding.status || 'failed', reason: embedding.error || 'embedding_failed' };
  }

  const doc = await upsertProviderEmbedding({
    providerId,
    vector: embedding.vector,
    model: embedding.model,
    textSnapshot,
    metadata: {
      city: profile.city || '',
      skills: profile.skills || [],
      source: 'provider_profile',
    },
  });

  return {
    status: 'success',
    embeddingId: doc._id,
    dimensions: embedding.dimensions,
  };
}

async function captureRecruiterHireEmbedding({ recruiterId, payload }) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  const embedding = await embedRecruiterHireHistory(text, {
    userId: recruiterId,
    role: 'recruiter',
  });

  if (!Array.isArray(embedding.vector) || embedding.vector.length === 0) {
    return { status: embedding.status || 'failed' };
  }

  const doc = await RecruiterHireEmbedding.create({
    recruiterId,
    sourceType: 'hire_history',
    referenceId: payload?.referenceId || '',
    vector: embedding.vector,
    model: embedding.model,
    dimensions: embedding.dimensions,
    skill: payload?.skill || '',
    city: payload?.city || '',
    successSignals: {
      hireCompleted: payload?.hireCompleted === true,
      satisfactionRating: Number(payload?.satisfactionRating || 0),
    },
  });

  return { status: 'success', id: doc._id };
}

async function buildProviderDashboardInsights({ providerId, dashboardPayload }) {
  const result = await generateDashboardInsights({
    ...dashboardPayload,
    userMeta: { userId: providerId, role: 'provider' },
  });

  return {
    tips: Array.isArray(result.output?.tips) ? result.output.tips.slice(0, 3) : [],
    summary: result.output?.summary || '',
    confidence: Number(result.output?.confidence || 0.4),
    aiStatus: result.status,
    model: result.model,
  };
}

async function processDocumentVerification({ providerId, documentUrl }) {
  return processProviderDocumentVerification({ providerId, documentUrl });
}

async function getProviderEmbedding(providerId) {
  return ProviderEmbedding.findOne({ providerId }).lean();
}

async function refreshJobEmbedding(jobId) {
  const JobPost = require('../models/JobPost');
  const RecruiterHireEmbedding = require('../models/RecruiterHireEmbedding');
  const { embedJobIntent } = require('./ai/embeddingsService');
  const { generateJobEmbedding } = require('./providerIntelligenceService');

  const job = await JobPost.findById(jobId).lean();
  if (!job) {
    return { status: 'skipped', reason: 'job_not_found' };
  }

  const textPayload = job.embeddingText || generateJobEmbedding(job) || [
    job.title || '',
    job.skill || '',
    job.city || '',
    job.locality || '',
    job.description || '',
    Array.isArray(job.requirements) ? job.requirements.join(', ') : '',
  ].filter(Boolean).join(' | ');

  const embedding = await embedJobIntent(textPayload, {
    userId: job.recruiter,
    role: 'recruiter',
  });

  if (!Array.isArray(embedding.vector) || embedding.vector.length === 0) {
    return { status: embedding.status || 'failed', reason: embedding.error || 'embedding_failed' };
  }

  const doc = await RecruiterHireEmbedding.findOneAndUpdate(
    { recruiterId: job.recruiter, sourceType: 'job_intent', referenceId: String(job._id) },
    {
      $set: {
        vector: embedding.vector,
        model: embedding.model,
        dimensions: embedding.dimensions,
        skill: job.skill || '',
        city: job.city || '',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await JobPost.findByIdAndUpdate(job._id, {
    $set: {
      embeddingText: textPayload,
      embedding: embedding.vector,
      matchRadiusUsed: Number(job.matchRadiusUsed || 50),
    },
  });

  return {
    status: 'success',
    embeddingId: doc._id,
    dimensions: embedding.dimensions,
  };
}

module.exports = {
  buildAndPersistProviderAIProfile,
  refreshProviderEmbedding,
  captureRecruiterHireEmbedding,
  buildProviderDashboardInsights,
  processDocumentVerification,
  getProviderEmbedding,
  refreshJobEmbedding,
};
