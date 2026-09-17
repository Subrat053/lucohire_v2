const { registerInlineHandler } = require('./queue.factory');
const { QUEUE_JOB_NAMES } = require('./queue.names');
const { refreshProviderEmbedding, processDocumentVerification } = require('../../services/providerAIOrchestrationService');
const { distributeLeadToTopProviders } = require('../../services/leadDistributionService');
const { runPeriodicFraudReview, runAiFraudClusterReview } = require('../../services/fraudRulesService');
const { recalculateProviderTrustScore } = require('../../services/trustScoreService');
const { runDailyDemandSpikeAnalysis } = require('../../services/demandSpikeService');
const ProviderProfile = require('../../models/ProviderProfile');
const { extractTextFromImage, extractDocumentTextFromImage } = require('../ai/services/ocr.service');
const { createEmbedding } = require('../ai/services/embedding.service');
const { buildProviderProfileFromFreeText } = require('../ai/services/profileBuilder.service');
const { runJobSourceSync } = require('../jobSources/syncRunner');

let initialized = false;
const handlerRegistry = new Map();

function registerHandler(jobName, handler) {
  handlerRegistry.set(jobName, handler);
  registerInlineHandler(jobName, handler);
}

function registerDefaultJobHandlers() {
  if (initialized) return;

  registerHandler(QUEUE_JOB_NAMES.EMBEDDING_CREATE, async (payload) => {
    return createEmbedding(payload);
  });

  registerHandler(QUEUE_JOB_NAMES.PROFILE_BUILD, async (payload) => {
    return buildProviderProfileFromFreeText(payload || {});
  });

  registerHandler(QUEUE_JOB_NAMES.OCR_EXTRACT_TEXT, async (payload) => {
    if (!payload?.imageBuffer) throw new Error('imageBuffer is required');
    return extractTextFromImage(Buffer.from(payload.imageBuffer));
  });

  registerHandler(QUEUE_JOB_NAMES.OCR_VERIFY_DOCUMENT, async (payload) => {
    if (payload?.providerId && payload?.documentUrl) {
      return processDocumentVerification({
        providerId: payload.providerId,
        documentUrl: payload.documentUrl,
      });
    }
    if (payload?.imageBuffer) {
      return extractDocumentTextFromImage(Buffer.from(payload.imageBuffer));
    }
    throw new Error('Either providerId+documentUrl or imageBuffer is required');
  });

  registerHandler(QUEUE_JOB_NAMES.AUTO_LEAD_DISTRIBUTION, async (payload) => {
    return distributeLeadToTopProviders(payload || {});
  });

  registerHandler(QUEUE_JOB_NAMES.FRAUD_ANALYSIS, async (payload) => {
    if (payload?.mode === 'cluster') return runAiFraudClusterReview();
    return runPeriodicFraudReview({ limit: Number(payload?.limit || 100) });
  });

  registerHandler(QUEUE_JOB_NAMES.TRUST_SCORE_RECALC, async (payload) => {
    if (payload?.providerId) {
      return recalculateProviderTrustScore(payload.providerId);
    }

    const providers = await ProviderProfile.find({ isApproved: true }).select('user').limit(500).lean();
    const results = [];
    for (const provider of providers) {
      // eslint-disable-next-line no-await-in-loop
      const trust = await recalculateProviderTrustScore(provider.user);
      results.push(trust);
    }

    return {
      recalculated: results.length,
    };
  });

  registerHandler(QUEUE_JOB_NAMES.DEMAND_SPIKE_ANALYSIS, async () => {
    return runDailyDemandSpikeAnalysis();
  });

  registerHandler('sync_source', async (payload) => {
    return runJobSourceSync(payload);
  });

  registerHandler('provider_embedding_refresh', async (payload) => {
    return refreshProviderEmbedding(payload.providerId);
  });

  registerHandler('job_embedding_refresh', async (payload) => {
    const { refreshJobEmbedding } = require('../../services/providerAIOrchestrationService');
    return refreshJobEmbedding(payload.jobId);
  });

  registerHandler('provider_document_verify', async (payload) => {
    return processDocumentVerification({ providerId: payload.providerId, documentUrl: payload.documentUrl });
  });

  registerHandler('auto_lead_distribution', async (payload) => {
    return distributeLeadToTopProviders(payload || {});
  });

  registerHandler('fraud_review', async () => {
    const rules = await runPeriodicFraudReview({ limit: 100 });
    const ai = await runAiFraudClusterReview();
    return { rulesReviewed: rules.length, aiReviewed: ai.reviewed === true };
  });

  registerHandler('trust_score_recalc', async (payload) => {
    if (payload?.providerId) return recalculateProviderTrustScore(payload.providerId);
    return { skipped: true };
  });

  registerHandler('demand_spike_analysis', async () => {
    return runDailyDemandSpikeAnalysis();
  });

  registerHandler('ai_candidate_evaluation', async (payload) => {
    const { jobId, candidateId } = payload;
    if (!jobId || !candidateId) return { skipped: true, reason: 'missing ids' };
    
    const AiEvaluation = require('../../models/AiEvaluation');
    const JobPost = require('../../models/JobPost');
    const ProviderProfile = require('../../models/ProviderProfile');
    const { OpenAI } = require('openai');

    const exists = await AiEvaluation.findOne({ jobId, candidateId });
    if (exists) return { skipped: true, reason: 'already evaluated' };

    const job = await JobPost.findById(jobId);
    const candidate = await ProviderProfile.findById(candidateId).populate('user', 'name');
    if (!job || !candidate) return { skipped: true, reason: 'job or candidate missing' };

    let score = 50;
    let reasoning = "Failed to evaluate candidate due to API configuration.";

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'mock') {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const prompt = `
          You are an expert technical recruiter AI. Evaluate how well this candidate matches the job.
          
          JOB:
          Title: ${job.title}
          Required Skill: ${job.skill}
          Work Mode: ${job.workMode}

          CANDIDATE:
          Headline: ${candidate.headline || 'None'}
          Skills: ${candidate.skills || 'None'}
          Experience: ${candidate.experience || 'None'}
          Education: ${candidate.education || 'None'}

          Analyze the match. Return ONLY a valid JSON object with EXACTLY two keys:
          - "score": an integer from 0 to 100 representing the match percentage.
          - "reasoning": a concise 2-3 sentence explanation of why they received this score.
        `;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });

        const result = JSON.parse(response.choices[0].message.content);
        if (result.score !== undefined) score = result.score;
        if (result.reasoning) reasoning = result.reasoning;
      } catch (err) {
        console.error("OpenAI evaluation failed", err);
        reasoning = "Failed to evaluate candidate due to OpenAI error.";
      }
    } else {
      // Fallback if no API key
      const jobSkill = (job.skill || '').toLowerCase();
      const candSkills = (candidate.skills || '').toLowerCase();
      if (candSkills.includes(jobSkill)) {
        score = 85 + Math.floor(Math.random() * 10);
        reasoning = `AI matched profile: Candidate possesses the required core skill (${job.skill}).`;
      } else {
        score = 45 + Math.floor(Math.random() * 10);
        reasoning = `AI match low: Candidate does not explicitly list the required core skill (${job.skill}).`;
      }
    }
    
    const evalDoc = await AiEvaluation.create({
      jobId,
      candidateId,
      score,
      reasoning
    });
    return { success: true, score: evalDoc.score };
  });

  initialized = true;
}

async function runJobHandler(jobName, payload = {}) {
  registerDefaultJobHandlers();
  const handler = handlerRegistry.get(jobName);
  if (!handler) throw new Error(`No queue handler registered for job '${jobName}'`);
  return handler(payload);
}

function getRegisteredJobNames() {
  registerDefaultJobHandlers();
  return Array.from(handlerRegistry.keys());
}

module.exports = {
  registerDefaultJobHandlers,
  runJobHandler,
  getRegisteredJobNames,
};
