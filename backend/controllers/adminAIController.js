const AdminSetting = require('../models/AdminSetting');
const AIPromptTemplate = require('../models/AIPromptTemplate');
const SkillSynonym = require('../models/SkillSynonym');
const FraudFlag = require('../models/FraudFlag');
const DocumentVerificationResult = require('../models/DocumentVerificationResult');
const AIUsageLog = require('../models/AIUsageLog');
const AiAnalysisResult = require('../models/AiAnalysisResult');
const DemandSnapshot = require('../models/DemandSnapshot');

const MATCH_KEYS = {
  skillMatch: 'match.weight.skill',
  locationDistance: 'match.weight.location',
  availability: 'match.weight.availability',
  trustRating: 'match.weight.trust',
  responseSpeed: 'match.weight.response_speed',
  subscriptionBoost: 'match.weight.subscription_boost',
  leadFreshness: 'match.weight.lead_freshness',
  profileCompleteness: 'match.weight.profile_completeness',
};

const TRUST_KEYS = {
  rating: 'trust.weight.rating',
  responseTime: 'trust.weight.response_time',
  profileCompleteness: 'trust.weight.profile_completeness',
  rejectionRate: 'trust.weight.rejection_rate',
  verificationStatus: 'trust.weight.verification_status',
  fraudPenalty: 'trust.weight.fraud_penalty',
};

const AI_FEATURE_KEYS = {
  aiEnabled: 'ai.feature.enabled',
  chatEnabled: 'ai.feature.chat',
  profileEnabled: 'ai.feature.profile',
  embeddingsEnabled: 'ai.feature.embeddings',
  ocrEnabled: 'ai.feature.ocr',
  fraudEnabled: 'ai.feature.fraud',
  padhaaoTutorEnabled: 'ai.feature.padhaao_tutor',
};


async function readSettingsByMap(category, map) {
  const keys = Object.values(map);
  const docs = await AdminSetting.find({ category, key: { $in: keys } }).lean();
  const byKey = new Map(docs.map((doc) => [doc.key, Number(doc.value)]));

  const payload = {};
  Object.entries(map).forEach(([name, key]) => {
    payload[name] = Number.isFinite(byKey.get(key)) ? byKey.get(key) : null;
  });
  return payload;
}

async function upsertSettingsFromMap(category, map, input) {
  const updates = [];
  for (const [field, key] of Object.entries(map)) {
    if (input[field] === undefined) continue;
    updates.push(
      AdminSetting.findOneAndUpdate(
        { key },
        {
          $set: {
            key,
            value: Number(input[field]),
            category,
            description: `${category} config for ${field}`,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    );
  }
  await Promise.all(updates);
}

const getMatchWeights = async (req, res) => {
  try {
    const weights = await readSettingsByMap('matching', MATCH_KEYS);
    return res.json({ weights });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch match weights', error: error.message });
  }
};

const updateMatchWeights = async (req, res) => {
  try {
    await upsertSettingsFromMap('matching', MATCH_KEYS, req.body || {});
    const weights = await readSettingsByMap('matching', MATCH_KEYS);
    return res.json({ message: 'Match weights updated', weights });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update match weights', error: error.message });
  }
};

const getTrustWeights = async (req, res) => {
  try {
    const weights = await readSettingsByMap('trust', TRUST_KEYS);
    return res.json({ weights });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch trust weights', error: error.message });
  }
};

const updateTrustWeights = async (req, res) => {
  try {
    await upsertSettingsFromMap('trust', TRUST_KEYS, req.body || {});
    const weights = await readSettingsByMap('trust', TRUST_KEYS);
    return res.json({ message: 'Trust weights updated', weights });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update trust weights', error: error.message });
  }
};

const getAIFeatureSettings = async (req, res) => {
  try {
    const settings = await readSettingsByMap('ai', AI_FEATURE_KEYS);
    return res.json({ settings });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch AI feature settings', error: error.message });
  }
};

const updateAIFeatureSettings = async (req, res) => {
  try {
    await upsertSettingsFromMap('ai', AI_FEATURE_KEYS, req.body || {});
    const settings = await readSettingsByMap('ai', AI_FEATURE_KEYS);
    return res.json({ message: 'AI feature settings updated', settings });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update AI feature settings', error: error.message });
  }
};


const listPromptTemplates = async (req, res) => {
  try {
    const dbItems = await AIPromptTemplate.find({}).lean();
    const defaultPrompts = require('../services/ai/defaultPrompts');
    
    // Map to hold merged items
    const mergedMap = new Map();
    
    // 1. Add all defaults first (creates mock IDs for frontend to list them)
    Object.keys(defaultPrompts).forEach((key, index) => {
      mergedMap.set(key, {
        _id: `default-${key}`,
        key: key,
        feature_name: key,
        prompt_template: defaultPrompts[key],
        is_active: true,
        model_name: 'gemini-1.5-flash',
        version: 1,
        is_default_only: true // UI helper
      });
    });
    
    // 2. Override with actual DB items if they exist
    dbItems.forEach(item => {
      mergedMap.set(item.feature_name || item.key, item);
    });

    // 3. Return sorted array
    const items = Array.from(mergedMap.values()).sort((a, b) => (a.key || '').localeCompare(b.key || ''));
    
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch prompt templates', error: error.message });
  }
};

const createPromptTemplate = async (req, res) => {
  try {
    const item = await AIPromptTemplate.create(req.body || {});
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ message: 'Failed to create prompt template', error: error.message });
  }
};

const updatePromptTemplate = async (req, res) => {
  try {
    let item;
    // If it's a default item that hasn't been saved yet, create it first
    if (req.params.id && req.params.id.startsWith('default-')) {
      const featureKey = req.params.id.replace('default-', '');
      item = new AIPromptTemplate({
        key: featureKey,
        feature_name: featureKey,
        prompt_template: req.body.prompt_template || req.body.template,
        is_active: req.body.is_active !== undefined ? req.body.is_active : true
      });
    } else {
      item = await AIPromptTemplate.findById(req.params.id);
      if (!item) return res.status(404).json({ message: 'Prompt template not found' });
    }

    // Check if prompt_template or template changed to bump version
    const oldPrompt = item.prompt_template || item.template;
    const newPrompt = req.body.prompt_template || req.body.template;
    if (newPrompt && newPrompt !== oldPrompt) {
      item.version = (item.version || 1) + 1;
    }

    // Record updated_by
    req.body.updated_by = req.user?._id || null;

    Object.assign(item, req.body || {});
    await item.save();
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update prompt template', error: error.message });
  }
};

const listSkillSynonyms = async (req, res) => {
  try {
    const { locale, status } = req.query;
    const filter = {};
    if (locale) filter.locale = locale;
    if (status) filter.status = status;

    const items = await SkillSynonym.find(filter).sort({ normalizedLabel: 1 }).lean();
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch skill synonyms', error: error.message });
  }
};

const createSkillSynonym = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      normalizedLabel: String(req.body.normalizedLabel || req.body.label || '').trim().toLowerCase(),
    };
    const item = await SkillSynonym.create(payload);
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ message: 'Failed to create skill synonym', error: error.message });
  }
};

const updateSkillSynonym = async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.normalizedLabel || update.label) {
      update.normalizedLabel = String(update.normalizedLabel || update.label).trim().toLowerCase();
    }
    const item = await SkillSynonym.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Skill synonym not found' });
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update skill synonym', error: error.message });
  }
};

const deleteSkillSynonym = async (req, res) => {
  try {
    const item = await SkillSynonym.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Skill synonym not found' });
    return res.json({ message: 'Deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete skill synonym', error: error.message });
  }
};

const getFraudQueue = async (req, res) => {
  try {
    const items = await FraudFlag.find({ status: { $in: ['open', 'reviewing'] } })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch fraud queue', error: error.message });
  }
};

const getOcrReviewQueue = async (req, res) => {
  try {
    const items = await DocumentVerificationResult.find({ status: { $in: ['needs_review', 'failed', 'pending', 'processing'] } })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch OCR review queue', error: error.message });
  }
};

const updateOcrDecision = async (req, res) => {
  try {
    const { status, reasons = [] } = req.body || {};
    if (!['verified', 'rejected', 'needs_review'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const item = await DocumentVerificationResult.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          reasons: Array.isArray(reasons) ? reasons : [String(reasons || '')],
          reviewedBy: req.user?._id || null,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!item) return res.status(404).json({ message: 'Verification record not found' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update OCR decision', error: error.message });
  }
};

const getAIUsageDashboard = async (req, res) => {
  try {
    const USD_TO_INR = 86.5;
    const { datePreset, startDate, endDate } = req.query;
    const now = new Date();
    let matchFilter = {};

    if (datePreset === 'today') {
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      matchFilter = { createdAt: { $gte: startToday } };
    } else if (datePreset === 'yesterday') {
      const startYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const endYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);
      matchFilter = { createdAt: { $gte: startYesterday, $lte: endYesterday } };
    } else if (datePreset === 'this_week') {
      const day = now.getDay();
      const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
      const startWeek = new Date(now.getFullYear(), now.getMonth(), diffToMon);
      startWeek.setHours(0, 0, 0, 0);
      matchFilter = { createdAt: { $gte: startWeek } };
    } else if (datePreset === 'this_month') {
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      matchFilter = { createdAt: { $gte: startMonth } };
    } else if (datePreset === 'custom' && (startDate || endDate)) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const currentPeriodStart  = new Date(now.getTime() - (7  * 24 * 60 * 60 * 1000));
    const previousPeriodStart = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

    // 1. Overall totals from real logs only
    const logMatchPipeline = Object.keys(matchFilter).length ? [{ $match: matchFilter }] : [];

    const [usageLogSummary] = await AIUsageLog.aggregate([
      ...logMatchPipeline,
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalCostUsd:  { $sum: { $ifNull: ['$estimatedCostUsd', '$costEstimate'] } },
          totalTokens:   { $sum: { $ifNull: ['$totalTokens', 0] } },
          avgLatencyMs:  { $avg: { $ifNull: ['$latencyMs', 0] } },
        },
      },
    ]);

    const [analysisResultSummary] = await AiAnalysisResult.aggregate([
      ...logMatchPipeline,
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalCostUsd:  { $sum: { $ifNull: ['$estimated_cost', 0] } },
          totalTokens:   { $sum: { $ifNull: ['$token_usage.total_tokens', 0] } },
        },
      },
    ]);

    const totalRequests = (usageLogSummary?.totalRequests || 0) + (analysisResultSummary?.totalRequests || 0);
    const totalCostUsd  = (usageLogSummary?.totalCostUsd  || 0) + (analysisResultSummary?.totalCostUsd  || 0);
    const totalCostInr  = Math.round(totalCostUsd * USD_TO_INR * 100) / 100;
    const totalTokens   = (usageLogSummary?.totalTokens   || 0) + (analysisResultSummary?.totalTokens   || 0);
    const avgLatencyMs  = usageLogSummary?.avgLatencyMs   || 0;

    // 2. Feature breakdown — real data only
    const byFeatureLog = await AIUsageLog.aggregate([
      ...logMatchPipeline,
      {
        $group: {
          _id:      { $ifNull: ['$featureKey', { $ifNull: ['$feature', 'general'] }] },
          requests: { $sum: 1 },
          costUsd:  { $sum: { $ifNull: ['$estimatedCostUsd', '$costEstimate'] } },
          tokens:   { $sum: { $ifNull: ['$totalTokens', 0] } },
        },
      },
    ]);

    const byFeatureAnalysis = await AiAnalysisResult.aggregate([
      ...logMatchPipeline,
      {
        $group: {
          _id:      { $ifNull: ['$feature_name', 'general'] },
          requests: { $sum: 1 },
          costUsd:  { $sum: { $ifNull: ['$estimated_cost', 0] } },
          tokens:   { $sum: { $ifNull: ['$token_usage.total_tokens', 0] } },
        },
      },
    ]);

    const featureMap = {};
    const addToFeatureMap = (items) => {
      for (const item of items) {
        const key = item._id || 'general';
        if (!featureMap[key]) featureMap[key] = { _id: key, requests: 0, costUsd: 0, costInr: 0, tokens: 0 };
        featureMap[key].requests += item.requests || 0;
        featureMap[key].costUsd  += item.costUsd  || 0;
        featureMap[key].tokens   += item.tokens   || 0;
        featureMap[key].costInr   = Math.round(featureMap[key].costUsd * USD_TO_INR * 100) / 100;
      }
    };
    addToFeatureMap(byFeatureLog);
    addToFeatureMap(byFeatureAnalysis);

    const byFeature = Object.values(featureMap).sort((a, b) => b.costUsd - a.costUsd);

    // 3. Period comparison
    const periodStats = await AIUsageLog.aggregate([
      { $match: { createdAt: { $gte: previousPeriodStart } } },
      {
        $project: {
          period: {
            $cond: [{ $gte: ['$createdAt', currentPeriodStart] }, 'current', 'previous'],
          },
          estimatedCostUsd: { $ifNull: ['$estimatedCostUsd', '$costEstimate'] },
          totalTokens: { $ifNull: ['$totalTokens', 0] },
        },
      },
      {
        $group: {
          _id:      '$period',
          requests: { $sum: 1 },
          costUsd:  { $sum: '$estimatedCostUsd' },
          tokens:   { $sum: '$totalTokens' },
        },
      },
    ]);

    const currentPeriod  = periodStats.find(i => i._id === 'current')  || { requests: 0, costUsd: 0, tokens: 0 };
    const previousPeriod = periodStats.find(i => i._id === 'previous') || { requests: 0, costUsd: 0, tokens: 0 };
    const currentCost    = Number(currentPeriod.costUsd   || 0);
    const previousCost   = Number(previousPeriod.costUsd  || 0);
    const currentReqs    = Number(currentPeriod.requests  || 0);
    const previousReqs   = Number(previousPeriod.requests || 0);

    // 4. Daily series
    const dailyCostRaw = await AIUsageLog.aggregate([
      { $match: { createdAt: { $gte: currentPeriodStart } } },
      {
        $group: {
          _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          costUsd: { $sum: { $ifNull: ['$estimatedCostUsd', '$costEstimate'] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyMap = new Map(dailyCostRaw.map(item => [item._id, Number(item.costUsd || 0)]));
    const dailyCostSeries = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const key  = date.toISOString().slice(0, 10);
      const val  = dailyMap.get(key) || 0;
      dailyCostSeries.push({
        date:    key,
        costUsd: Number(val.toFixed(6)),
        costInr: Math.round(val * USD_TO_INR * 100) / 100,
      });
    }

    return res.json({
      summary: { totalRequests, totalCostUsd, totalCostInr, totalTokens, avgLatencyMs },
      byFeature,
      trend: {
        periodCurrent:  { requests: currentReqs,  costUsd: Number(currentCost.toFixed(6)),  tokens: Number(currentPeriod.tokens  || 0) },
        periodPrevious: { requests: previousReqs, costUsd: Number(previousCost.toFixed(6)), tokens: Number(previousPeriod.tokens || 0) },
        weekOverWeek: {
          costDeltaUsd:      Number((currentCost - previousCost).toFixed(6)),
          costDeltaPct:      previousCost > 0 ? Number((((currentCost - previousCost) / previousCost) * 100).toFixed(2)) : null,
          requestsDelta:     currentReqs - previousReqs,
          requestsDeltaPct:  previousReqs > 0 ? Number((((currentReqs - previousReqs) / previousReqs) * 100).toFixed(2)) : null,
        },
        dailyCostSeries,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch AI usage dashboard', error: error.message });
  }
};

const getDemandSpikeDashboard = async (req, res) => {
  try {
    const items = await DemandSnapshot.find({}).sort({ snapshotDate: -1, unmetDemandScore: -1 }).limit(200).lean();
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch demand snapshots', error: error.message });
  }
};

const getAIUsageLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.feature) filter.feature = req.query.feature;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.role) filter.role = req.query.role;
    if (req.query.provider) filter.provider = req.query.provider;

    const items = await AIUsageLog.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AIUsageLog.countDocuments(filter);

    return res.json({
      success: true,
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch AI usage logs', error: error.message });
  }
};

const { processAI } = require('../services/ai/aiPipelineService');

const getAiAnalysisResults = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.feature_name) filter.feature_name = req.query.feature_name;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.user_id) filter.user_id = req.query.user_id;

    const items = await AiAnalysisResult.find(filter)
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AiAnalysisResult.countDocuments(filter);

    return res.json({
      success: true,
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch AI analysis results', error: error.message });
  }
};

const rerunAiAnalysis = async (req, res) => {
  try {
    const { analysisId } = req.body;
    if (!analysisId) {
      return res.status(400).json({ message: 'analysisId is required' });
    }

    const previousResult = await AiAnalysisResult.findById(analysisId).lean();
    if (!previousResult) {
      return res.status(404).json({ message: 'Previous AI analysis not found' });
    }

    let resolvedRole = 'provider';
    const feat = String(previousResult.feature_name);
    if (feat.includes('recruiter') || feat.includes('ats_score') || feat.includes('job_match')) {
      resolvedRole = 'recruiter';
    }

    console.log(`[AdminAI] Re-running analysis for feature=${previousResult.feature_name} user=${previousResult.user_id}`);
    const newResult = await processAI({
      userId: previousResult.user_id,
      role: resolvedRole,
      featureName: previousResult.feature_name,
      inputData: previousResult.input_snapshot,
      bypassCache: true, // Force new API call
    });

    return res.json({
      success: true,
      message: 'Analysis re-run successfully completed.',
      result: newResult,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to re-run AI analysis', error: error.message });
  }
};

module.exports = {
  getMatchWeights,
  updateMatchWeights,
  getTrustWeights,
  updateTrustWeights,
  listPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  listSkillSynonyms,
  createSkillSynonym,
  updateSkillSynonym,
  deleteSkillSynonym,
  getFraudQueue,
  getOcrReviewQueue,
  updateOcrDecision,
  getAIUsageDashboard,
  getAIUsageLogs,
  getDemandSpikeDashboard,
  getAIFeatureSettings,
  updateAIFeatureSettings,
  getAiAnalysisResults,
  rerunAiAnalysis,
};

