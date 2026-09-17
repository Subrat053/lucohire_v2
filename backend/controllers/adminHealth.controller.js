const os = require('os');
const JobPost = require('../models/JobPost');
const ProviderProfile = require('../models/ProviderProfile');
const AiFeatureControl = require('../models/AiFeatureControl');
const AIUsageLog = require('../models/AIUsageLog');
const AiAnalysisResult = require('../models/AiAnalysisResult');
const logger = require('../utils/logger');
const { canUseBullMq } = require('../services/queueService');

const USD_TO_INR = 86.5;

// Master Feature Definitions
const DEFAULT_CANDIDATE_FEATURES = [
  { featureKey: 'candidate_career_health',   featureName: 'AI Career Health & Score Analysis',    audience: 'candidate', defaultModel: 'gpt-4o-mini',        provider: 'openai', unitCostInr: 0.25 },
  { featureKey: 'candidate_resume_ats',      featureName: 'AI ATS Optimizer & Resume Generator',  audience: 'candidate', defaultModel: 'gpt-4o-mini',        provider: 'openai', unitCostInr: 0.35 },
  { featureKey: 'candidate_grow_with_ai',    featureName: 'AI Interview Prep & Mock Simulator',   audience: 'candidate', defaultModel: 'gemini-1.5-flash',   provider: 'gemini', unitCostInr: 0.20 },
  { featureKey: 'candidate_ai_coach',        featureName: 'AI 24/7 Career Coach & Chat',          audience: 'candidate', defaultModel: 'gpt-4o-mini',        provider: 'openai', unitCostInr: 0.15 },
  { featureKey: 'candidate_ai_tips',         featureName: 'AI Daily Career Tips & Guidance',      audience: 'candidate', defaultModel: 'gemini-1.5-flash',   provider: 'gemini', unitCostInr: 0.10 },
  { featureKey: 'candidate_rejection_analysis', featureName: 'AI Application Rejection Analyzer', audience: 'candidate', defaultModel: 'gpt-4o-mini',       provider: 'openai', unitCostInr: 0.18 },
];

const DEFAULT_RECRUITER_FEATURES = [
  { featureKey: 'recruiter_candidate_matching',  featureName: 'AI Candidate Search & Matching',       audience: 'recruiter', defaultModel: 'gpt-4o-mini',       provider: 'openai', unitCostInr: 0.40 },
  { featureKey: 'recruiter_job_desc_generator',  featureName: 'AI Job Description Generator',          audience: 'recruiter', defaultModel: 'gpt-4o-mini',       provider: 'openai', unitCostInr: 0.25 },
  { featureKey: 'recruiter_candidate_scoring',   featureName: 'AI Candidate CV Analysis & Scoring',    audience: 'recruiter', defaultModel: 'gpt-4o-mini',       provider: 'openai', unitCostInr: 0.50 },
  { featureKey: 'recruiter_team_fit_predictor',  featureName: 'AI Team Fit & Culture Predictor',       audience: 'recruiter', defaultModel: 'gpt-4o-mini',       provider: 'openai', unitCostInr: 0.30 },
  { featureKey: 'recruiter_risk_assessment',     featureName: 'AI Attrition & Hiring Risk Analyzer',   audience: 'recruiter', defaultModel: 'gpt-4o-mini',       provider: 'openai', unitCostInr: 0.35 },
  { featureKey: 'recruiter_job_match_index',     featureName: 'AI Job Match Indexing Engine',           audience: 'recruiter', defaultModel: 'gemini-1.5-flash',  provider: 'gemini', unitCostInr: 0.20 },
];

const ALL_FEATURES = [...DEFAULT_CANDIDATE_FEATURES, ...DEFAULT_RECRUITER_FEATURES];

// Map feature_name strings used in AiAnalysisResult → our featureKey
const FEATURE_NAME_TO_KEY = {
  resume_parser:        'candidate_resume_ats',
  ats_score:            'candidate_resume_ats',
  career_gps:           'candidate_career_health',
  job_match:            'recruiter_candidate_matching',
  job_matching_engine:  'recruiter_job_match_index',
  premium_skill_gap:    'candidate_career_health',
};

const ensureFeatureControlsInDb = async () => {
  for (const feat of ALL_FEATURES) {
    await AiFeatureControl.updateOne(
      { featureKey: feat.featureKey },
      { $setOnInsert: feat },
      { upsert: true }
    ).catch(() => {});
  }
};

exports.getHealthMetrics = async (req, res) => {
  try {
    await ensureFeatureControlsInDb();

    // 1. Business Metrics
    const [totalJobs, activeJobs, totalProviders, activeProviders] = await Promise.all([
      JobPost.countDocuments(),
      JobPost.countDocuments({ status: 'open' }),
      ProviderProfile.countDocuments(),
      ProviderProfile.countDocuments({ isVisible: true }),
    ]);

    // 2. Date Range Resolution
    const { range, days, startDate: reqStart, endDate: reqEnd } = req.query;
    let startDate = new Date();
    let endDate = new Date();

    if (reqStart && reqEnd) {
      startDate = new Date(reqStart); startDate.setHours(0, 0, 0, 0);
      endDate   = new Date(reqEnd);   endDate.setHours(23, 59, 59, 999);
    } else {
      let daysCount = 7;
      if (range === 'today' || days === '1')   daysCount = 1;
      else if (range === '7d'  || days === '7')  daysCount = 7;
      else if (range === '30d' || days === '30') daysCount = 30;
      else if (range === '90d' || days === '90') daysCount = 90;
      else if (days && !isNaN(parseInt(days, 10))) daysCount = Math.max(1, parseInt(days, 10));
      startDate = new Date();
      startDate.setDate(startDate.getDate() - daysCount);
      startDate.setHours(0, 0, 0, 0);
    }
    const calculatedDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

    // 3. Feature controls from DB
    const featureControls = await AiFeatureControl.find({}).lean();
    const controlMap = Object.fromEntries(featureControls.map(fc => [fc.featureKey, fc]));

    // 4. Aggregate real usage — group by featureKey AND by provider
    //    We aggregate from two sources: AIUsageLog and AiAnalysisResult
    const dateFilter = { $gte: startDate, $lte: endDate };

    // AIUsageLog — aggregate grouped by featureKey + provider
    const usageByFeatureKey = await AIUsageLog.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: { featureKey: '$featureKey', feature: '$feature', provider: '$provider', model: '$model' },
          totalCalls: { $sum: 1 },
          totalCostUsd: { $sum: { $ifNull: ['$estimatedCostUsd', '$costEstimate'] } },
          totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
        }
      }
    ]).catch(() => []);

    // AiAnalysisResult — aggregate grouped by feature_name + model_name
    const analysisByFeature = await AiAnalysisResult.aggregate([
      {
        $match: {
          $or: [
            { createdAt: dateFilter },
            { created_at: dateFilter }
          ]
        }
      },
      {
        $group: {
          _id: { feature_name: '$feature_name', model_name: '$model_name' },
          totalCalls: { $sum: 1 },
          totalCostUsd: { $sum: { $ifNull: ['$estimated_cost', 0] } },
          totalTokens: { $sum: { $ifNull: ['$token_usage.total_tokens', 0] } },
        }
      }
    ]).catch(() => []);

    // Build feature usage map
    const usageMap = {}; // featureKey → { totalCalls, totalCostUsd, totalTokens }
    const providerTotals = { openai: { costUsd: 0, tokens: 0 }, gemini: { costUsd: 0, tokens: 0 } };

    // Process AIUsageLog results
    for (const row of usageByFeatureKey) {
      const fKey = row._id.featureKey || row._id.feature;
      const provider = (row._id.provider || '').toLowerCase();
      const costUsd = row.totalCostUsd || 0;
      const tokens  = row.totalTokens  || 0;
      const calls   = row.totalCalls   || 0;

      if (fKey) {
        if (!usageMap[fKey]) usageMap[fKey] = { totalCalls: 0, totalCostUsd: 0, totalTokens: 0 };
        usageMap[fKey].totalCalls   += calls;
        usageMap[fKey].totalCostUsd += costUsd;
        usageMap[fKey].totalTokens  += tokens;
      }

      // Attribute to provider totals
      if (provider === 'gemini' || provider === 'google') {
        providerTotals.gemini.costUsd += costUsd;
        providerTotals.gemini.tokens  += tokens;
      } else {
        providerTotals.openai.costUsd += costUsd;
        providerTotals.openai.tokens  += tokens;
      }
    }

    // Process AiAnalysisResult — map feature_name → featureKey
    for (const row of analysisByFeature) {
      const rawName  = (row._id.feature_name || '').toLowerCase().replace(/\s+/g, '_');
      const modelStr = (row._id.model_name || '').toLowerCase();
      const fKey     = FEATURE_NAME_TO_KEY[rawName];
      const isGemini = modelStr.includes('gemini') || modelStr.includes('google');
      const costUsd  = row.totalCostUsd || 0;
      const tokens   = row.totalTokens  || 0;
      const calls    = row.totalCalls   || 0;

      if (fKey) {
        if (!usageMap[fKey]) usageMap[fKey] = { totalCalls: 0, totalCostUsd: 0, totalTokens: 0 };
        usageMap[fKey].totalCalls   += calls;
        usageMap[fKey].totalCostUsd += costUsd;
        usageMap[fKey].totalTokens  += tokens;
      }

      if (isGemini) {
        providerTotals.gemini.costUsd += costUsd;
        providerTotals.gemini.tokens  += tokens;
      } else {
        providerTotals.openai.costUsd += costUsd;
        providerTotals.openai.tokens  += tokens;
      }
    }

    // 5. Build per-feature metrics
    const mapFeatureMetrics = (defaultsArray) => defaultsArray.map(def => {
      const ctrl   = controlMap[def.featureKey] || {};
      const usage  = usageMap[def.featureKey]   || {};
      const totalCalls   = usage.totalCalls   || 0;
      const totalCostUsd = usage.totalCostUsd || 0;
      const totalCostInr = Math.round(totalCostUsd * USD_TO_INR * 100) / 100;
      const totalTokens  = usage.totalTokens  || 0;

      return {
        featureKey:    def.featureKey,
        featureName:   ctrl.featureName   || def.featureName,
        audience:      def.audience,
        provider:      def.provider,
        model:         ctrl.defaultModel  || def.defaultModel,
        unitCostInr:   ctrl.unitCostInr   || def.unitCostInr,
        status:        ctrl.status        || 'active',
        totalCalls,
        totalCostInr,
        totalTokens,
      };
    });

    const candidateFeatures = mapFeatureMetrics(DEFAULT_CANDIDATE_FEATURES);
    const recruiterFeatures  = mapFeatureMetrics(DEFAULT_RECRUITER_FEATURES);

    // 6. Provider totals — sum directly from feature arrays (guarantees math equality)
    const allFeatures = [...candidateFeatures, ...recruiterFeatures];
    const openAiFeats  = allFeatures.filter(f => f.provider === 'openai');
    const geminiFeats  = allFeatures.filter(f => f.provider === 'gemini');

    const openAiTotalCostInr = Math.round(openAiFeats.reduce((s, f) => s + f.totalCostInr, 0) * 100) / 100;
    const openAiTotalTokens  = openAiFeats.reduce((s, f) => s + f.totalTokens, 0);
    const geminiTotalCostInr = Math.round(geminiFeats.reduce((s, f) => s + f.totalCostInr, 0) * 100) / 100;
    const geminiTotalTokens  = geminiFeats.reduce((s, f) => s + f.totalTokens, 0);

    const costsSummary = {
      OpenAI: { totalCostInInr: openAiTotalCostInr, totalTokens: openAiTotalTokens, category: 'AI Parsing & Matching',    status: 'Active' },
      Gemini: { totalCostInInr: geminiTotalCostInr, totalTokens: geminiTotalTokens, category: 'AI Analytics & Reports',   status: 'Active' },
    };

    const totalCandidateCostInr = Math.round(candidateFeatures.reduce((s, f) => s + f.totalCostInr, 0) * 100) / 100;
    const totalRecruiterCostInr = Math.round(recruiterFeatures.reduce((s, f)  => s + f.totalCostInr, 0) * 100) / 100;

    // 7. Daily cost history graph
    const historyMap = {};
    for (let i = calculatedDays - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const key  = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      historyMap[key] = { date: label, OpenAI: 0, Gemini: 0 };
    }

    const rawDailyCosts = await AIUsageLog.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: {
            date:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            provider: '$provider',
          },
          costUsd: { $sum: { $ifNull: ['$estimatedCostUsd', '$costEstimate'] } },
        }
      }
    ]).catch(() => []);

    for (const row of rawDailyCosts) {
      const dateKey  = row._id.date;
      const provider = (row._id.provider || '').toLowerCase();
      if (!historyMap[dateKey]) continue;
      const costInr = Math.round((row.costUsd || 0) * USD_TO_INR * 100) / 100;
      if (provider === 'gemini' || provider === 'google') {
        historyMap[dateKey].Gemini += costInr;
      } else {
        historyMap[dateKey].OpenAI += costInr;
      }
    }

    const costHistory = Object.values(historyMap);

    // 8. Infrastructure
    const freemem = os.freemem();
    const totalmem = os.totalmem();
    const memoryUsage = ((totalmem - freemem) / totalmem * 100).toFixed(2);

    return res.status(200).json({
      success: true,
      data: {
        filter: { appliedDays: calculatedDays, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        business: { totalJobs, activeJobs, totalProviders, activeProviders },
        costs: {
          summary: costsSummary,
          history: costHistory,
          totalCandidateCostInr,
          totalRecruiterCostInr,
          candidateFeatures,
          recruiterFeatures,
        },
        infrastructure: {
          memory: { free: freemem, total: totalmem, percentage: memoryUsage },
          cpu: { loadAverage: os.loadavg(), cores: os.cpus().length },
          queues: {
            status: 'active',
            mode: canUseBullMq() ? 'BullMQ (Redis)' : 'In-Memory Queue',
            queues: {
              candidateDigest:  { active: 0, waiting: 0, completed: 0 },
              homepageMetrics:  { active: 0, waiting: 0, completed: 0 },
              outreachQueue:    { active: 0, waiting: 0, completed: 0 },
              candidateRescan:  { active: 0, waiting: 0, completed: 0 },
              nightlyScraper:   { active: 0, waiting: 0, completed: 0 },
            }
          }
        }
      }
    });

  } catch (error) {
    logger.error('Error in Admin Health Metrics', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch health metrics', error: error.message });
  }
};

// Update status of an individual feature
exports.updateFeatureStatus = async (req, res) => {
  try {
    const { featureKey } = req.params;
    const { status } = req.body;

    if (!['active', 'paused', 'stopped'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    // Find the default def to provide required fields for upsert
    const def = ALL_FEATURES.find(f => f.featureKey === featureKey) || {};

    const updated = await AiFeatureControl.findOneAndUpdate(
      { featureKey },
      {
        $set: { status, lastUpdatedBy: req.user?.email || 'admin' },
        $setOnInsert: { ...def, featureKey }
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({ success: true, message: `Feature ${featureKey} set to ${status}`, feature: updated });
  } catch (error) {
    logger.error('Error updating feature status', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to update feature status' });
  }
};

// Restart a feature (set back to active)
exports.restartFeature = async (req, res) => {
  try {
    const { featureKey } = req.params;
    const def = ALL_FEATURES.find(f => f.featureKey === featureKey) || {};

    const updated = await AiFeatureControl.findOneAndUpdate(
      { featureKey },
      {
        $set: { status: 'active', lastUpdatedBy: req.user?.email || 'admin' },
        $setOnInsert: { ...def, featureKey }
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({ success: true, message: `Feature ${featureKey} restarted`, feature: updated });
  } catch (error) {
    logger.error('Error restarting feature', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to restart feature' });
  }
};

// Global toggle for all candidate / recruiter / all features
exports.updateGlobalFeatureStatus = async (req, res) => {
  try {
    const { audience, status } = req.body;

    if (!['active', 'paused', 'stopped'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    // Upsert all known features matching the audience filter
    const targets = audience && audience !== 'all'
      ? ALL_FEATURES.filter(f => f.audience === audience)
      : ALL_FEATURES;

    await Promise.all(targets.map(def =>
      AiFeatureControl.findOneAndUpdate(
        { featureKey: def.featureKey },
        {
          $set: { status, lastUpdatedBy: req.user?.email || 'admin' },
          $setOnInsert: { ...def }
        },
        { new: true, upsert: true }
      )
    ));

    return res.status(200).json({ success: true, message: `Global status for ${audience || 'all'} set to ${status}` });
  } catch (error) {
    logger.error('Error updating global feature status', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to update global status' });
  }
};

exports.getExternalServicesStatus = async (req, res) => {
  try {
    // 1. Fetch AI usage stats
    const aiUsage = await AIUsageLog.aggregate([
      {
        $group: {
          _id: '$provider',
          totalCalls: { $sum: 1 },
          totalCost: { $sum: '$costEstimate' },
        }
      }
    ]);
    const usageMap = Object.fromEntries(aiUsage.map(u => [u._id.toLowerCase(), { calls: u.totalCalls, cost: u.totalCost }]));

    const services = [];

    // AI Providers
    const openaiStats = usageMap['openai'] || { calls: 0, cost: 0 };
    services.push({
      id: 'openai', name: 'OpenAI', description: 'AI Models & Embeddings', url: 'https://platform.openai.com',
      status: process.env.OPENAI_API_KEY ? 'Active' : 'Configured', color: 'bg-purple-50 border-purple-100', statusColor: 'text-purple-700 bg-purple-100', iconName: 'Cpu',
      usage: `${openaiStats.calls} calls, ~$${openaiStats.cost.toFixed(4)} used`
    });

    const geminiStats = usageMap['gemini'] || { calls: 0, cost: 0 };
    services.push({
      id: 'gemini', name: 'Google Gemini AI', description: 'Resume Parsing & Generation', url: 'https://aistudio.google.com/',
      status: process.env.GEMINI_API_KEY ? 'Active' : 'Configured', color: 'bg-blue-50 border-blue-100', statusColor: 'text-blue-700 bg-blue-100', iconName: 'Cpu',
      usage: `${geminiStats.calls} calls, ~$${geminiStats.cost.toFixed(4)} used`
    });

    const anthropicStats = usageMap['anthropic'] || { calls: 0, cost: 0 };
    services.push({
      id: 'anthropic', name: 'Anthropic Claude', description: 'Advanced Analysis', url: 'https://console.anthropic.com/',
      status: process.env.ANTHROPIC_API_KEY ? 'Active' : 'Configured', color: 'bg-orange-50 border-orange-100', statusColor: 'text-orange-700 bg-orange-100', iconName: 'Cpu',
      usage: `${anthropicStats.calls} calls, ~$${anthropicStats.cost.toFixed(4)} used`
    });

    // Communication / Messaging
    services.push({
      id: 'resend', name: 'Resend', description: 'Transactional & Bulk Email Delivery', url: 'https://resend.com',
      status: process.env.RESEND_API_KEY ? 'Active' : 'Configured', color: 'bg-rose-50 border-rose-100', statusColor: 'text-rose-700 bg-rose-100', iconName: 'Mail',
      usage: 'Dynamic email stats not available'
    });

    services.push({
      id: 'firebase', name: 'Firebase', description: 'OTP Auth & App Config', url: 'https://console.firebase.google.com/',
      status: process.env.FIREBASE_PROJECT_ID ? 'Active' : 'Configured', color: 'bg-yellow-50 border-yellow-100', statusColor: 'text-yellow-700 bg-yellow-100', iconName: 'Cloud',
      usage: 'Active Configuration'
    });

    services.push({
      id: 'meta', name: 'Meta Cloud API', description: 'WhatsApp Business Messaging', url: 'https://developers.facebook.com/products/whatsapp',
      status: process.env.META_WHATSAPP_TOKEN ? 'Active' : 'Configured', color: 'bg-emerald-50 border-emerald-100', statusColor: 'text-emerald-700 bg-emerald-100', iconName: 'MessageSquare',
      usage: 'Dynamic WhatsApp stats not available'
    });

    // Infrastructure
    services.push({
      id: 'mongodb', name: 'MongoDB Atlas', description: 'Primary Database & Vector Search', url: 'https://cloud.mongodb.com',
      status: 'Active', color: 'bg-green-50 border-green-100', statusColor: 'text-green-700 bg-green-100', iconName: 'Database',
      usage: 'Active Connection'
    });

    services.push({
      id: 'redis', name: 'Upstash Redis', description: 'Queue & Caching (BullMQ)', url: 'https://upstash.com',
      status: 'Active', color: 'bg-red-50 border-red-100', statusColor: 'text-red-700 bg-red-100', iconName: 'Server',
      usage: 'Active Connection'
    });

    // SEO & Analytics Features
    services.push({
      id: 'gsc', name: 'Google Search Console', description: 'SEO Indexing & Monitoring', url: 'https://search.google.com/search-console',
      status: 'Active', color: 'bg-indigo-50 border-indigo-100', statusColor: 'text-indigo-700 bg-indigo-100', iconName: 'Activity',
      usage: 'SEO Analytics Active'
    });

    services.push({
      id: 'bing', name: 'Bing Webmaster Tools', description: 'Bing Search Indexing', url: 'https://www.bing.com/webmasters/',
      status: 'Active', color: 'bg-cyan-50 border-cyan-100', statusColor: 'text-cyan-700 bg-cyan-100', iconName: 'Activity',
      usage: 'Webmaster Tracking Active'
    });

    services.push({
      id: 'clarity', name: 'Microsoft Clarity', description: 'User Heatmaps & Session Recording', url: 'https://clarity.microsoft.com/',
      status: 'Active', color: 'bg-blue-50 border-blue-100', statusColor: 'text-blue-700 bg-blue-100', iconName: 'Activity',
      usage: 'User Telemetry Active'
    });

    services.push({
      id: 'gcp', name: 'Google Cloud Console', description: 'Cloud APIs (Vision, Places)', url: 'https://console.cloud.google.com/',
      status: 'Active', color: 'bg-gray-100 border-gray-200', statusColor: 'text-gray-700 bg-gray-200', iconName: 'Cloud',
      usage: 'Google APIs Active'
    });

    // Scrapers / ATS
    if (process.env.APIFY_API_TOKEN) {
      services.push({
        id: 'apify', name: 'Apify', description: 'Data Scraping Engine', url: 'https://apify.com/',
        status: 'Active', color: 'bg-gray-100 border-gray-200', statusColor: 'text-gray-700 bg-gray-200', iconName: 'Activity',
        usage: 'Active API'
      });
    }
    if (process.env.JSEARCH_API_KEY) {
      services.push({
        id: 'jsearch', name: 'JSearch (RapidAPI)', description: 'Job Search API', url: 'https://rapidapi.com/letscrape-6bRBa3QGz7/api/jsearch',
        status: 'Active', color: 'bg-indigo-50 border-indigo-100', statusColor: 'text-indigo-700 bg-indigo-100', iconName: 'Activity',
        usage: 'Active API'
      });
    }

    return res.status(200).json({ success: true, services });
  } catch (error) {
    logger.error('Error fetching external services status', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch services status' });
  }
};
