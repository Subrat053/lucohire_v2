const prisma = require('../config/prisma');
const { createRecruiterSearchLog } = require('../services/auditPersistenceService');
const { parseSearchIntent } = require('../services/searchIntentService');
const { rankProvidersForIntent, fetchProviders } = require('../services/providerRankingService');
const { logBusinessEvent } = require('../services/eventLogService');
const { embedSearchQuery } = require('../services/ai/embeddingsService');
const { getCoordinatesFromText } = require('../services/locationService');
const { classifyJobMobility } = require('../services/providerIntelligenceService');
const {
  searchProvidersBySemanticIntent,
  searchByRecruiterHistory,
} = require('../services/ai/vectorSearchService');

function pickStructuredIntent(input = {}) {
  return {
    skill: input.skill || '',
    city: input.city || '',
    locality: input.locality || '',
    urgency: input.urgency || '',
    budgetMin: input.budgetMin ?? null,
    budgetMax: input.budgetMax ?? null,
    shiftType: input.shiftType || '',
    timeOfDay: input.timeOfDay || '',
  };
}

function topReasonsFromBreakdown(scoreBreakdown = {}) {
  const entries = Object.entries(scoreBreakdown)
    .map(([key, value]) => ({ key, weighted: Number(value?.weighted || 0), score: Number(value?.score || 0) }))
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 3);

  const labels = {
    skillMatch: 'Strong skill match',
    locationDistance: 'Location proximity relevance',
    availability: 'Currently available',
    trustRating: 'High trust and rating',
    responseSpeed: 'Fast response history',
    subscriptionBoost: 'Plan visibility boost',
    leadFreshness: 'Balanced lead freshness',
    profileCompleteness: 'Complete provider profile',
  };

  return entries.map((item) => labels[item.key] || item.key);
}

async function suggestBudgetRange({ skill, city }) {
  const where = {};
  if (skill) where.skill = { contains: String(skill).trim(), mode: 'insensitive' };
  if (city) where.city = { startsWith: String(city).trim(), mode: 'insensitive' };

  const agg = await prisma.jobPost.aggregate({
    where,
    _count: { _all: true },
    _avg: { budgetMin: true, budgetMax: true },
  });

  if (Number(agg?._count?._all || 0) >= 3) {
    return {
      min: Math.max(0, Math.round(Number(agg._avg.budgetMin || 0))),
      max: Math.max(0, Math.round(Number(agg._avg.budgetMax || 0))),
      basis: 'marketplace_data',
      confidence: 0.75,
    };
  }

  const settings = await prisma.adminSetting.findMany({ where: { category: 'pricing' } });
  const map = new Map(settings.map((item) => [item.key, Number(item.value)]));
  return {
    min: Number.isFinite(map.get('default_budget_min')) ? map.get('default_budget_min') : 500,
    max: Number.isFinite(map.get('default_budget_max')) ? map.get('default_budget_max') : 3000,
    basis: 'admin_fallback',
    confidence: 0.4,
  };
}

const interpretSearch = async (req, res) => {
  try {
    const { query, locationContext } = req.body;
    const parsed = await parseSearchIntent({
      query,
      sourceUserId: req.user?._id || null,
      sourceUserRole: req.user?.activeRole || req.user?.role || 'recruiter',
      allowAIFallback: true,
      locationContext,
    });

    await logBusinessEvent({
      taskType: 'search_interpret',
      relatedEntityType: 'search_intent',
      relatedEntityId: parsed.intentId,
      payload: { query },
      result: { confidence: parsed.confidence },
      status: 'success',
    });

    return res.json({
      detected: {
        skill: parsed.extractedSkill,
        city: parsed.extractedCity,
        locality: parsed.extractedLocality,
        urgency: parsed.extractedUrgency,
        budgetMin: parsed.extractedBudgetMin,
        budgetMax: parsed.extractedBudgetMax,
        shiftType: parsed.extractedShiftType,
        timeOfDay: parsed.extractedTimeOfDay,
      },
      confidence: parsed.confidence,
      suggestedFilters: parsed.suggestedFilters,
      intentId: parsed.intentId,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to interpret search query', error: error.message });
  }
};

const searchProviders = async (req, res) => {
  try {
    const {
      query,
      skill,
      city,
      location,
      locality,
      lat,
      lng,
      radius,
      availability,
      sortBy = 'match',
      page = 1,
      limit = 20,
      // Skill-level / category tier
      tier = '',
      // Minimum rating (1-5)
      rating = '',
      // Minimum experience years
      experience = '',
      // Verified providers only
      verified = '',
    } = req.query;

    const searchLocation = String(city || location || locality || '').trim();
    const structured = pickStructuredIntent({ skill, city: searchLocation, locality });

    let resolvedLat = lat;
    let resolvedLng = lng;
    if ((!resolvedLat || !resolvedLng) && searchLocation) {
      try {
        const resolved = await getCoordinatesFromText(searchLocation);
        if (resolved?.lat !== undefined && resolved?.lon !== undefined) {
          resolvedLat = resolved.lat;
          resolvedLng = resolved.lon;
        }
      } catch (_) {}
    }

    const locationContext = (lat && lng) ? {
      latitude: Number(lat),
      longitude: Number(lng),
      radiusMeters: Number(radius) || 30000,
      city: city || location || locality || '',
    } : null;

    const parsed = await parseSearchIntent({
      query: query || [skill, searchLocation, locality].filter(Boolean).join(' '),
      structured,
      sourceUserId: req.user?._id || null,
      sourceUserRole: req.user?.activeRole || req.user?.role || 'recruiter',
      allowAIFallback: true,
      locationContext,
    });

    // Inject filter params into parsed intent so fetchProviders can apply them
    if (tier) parsed.tier = String(tier).trim().toLowerCase();
    if (rating) parsed.minRating = Number(rating);
    if (experience) parsed.minExperience = Number(experience);
    if (verified === 'true') parsed.verifiedOnly = true;
    
    // Always restrict to WhatsApp Plan active providers for general search
    parsed.whatsappOnly = true;

    let semanticMap = new Map();
    if (query) {
      const embedding = await embedSearchQuery(String(query), {
        userId: req.user?._id || null,
        role: req.user?.activeRole || 'recruiter',
      });

      if (Array.isArray(embedding.vector) && embedding.vector.length) {
        const hardFilteredProviders = await fetchProviders(parsed);
        const hardFilteredIds = hardFilteredProviders.map(p => String(p.user?._id || p.user || p._id)).filter(Boolean);

        const semanticCandidates = await searchProvidersBySemanticIntent({
          vector: embedding.vector,
          limit: Math.max(100, hardFilteredIds.length),
          filter: { providerId: { $in: hardFilteredIds } }
        });
        semanticMap = new Map(semanticCandidates.map((item) => [String(item.providerId), Number(item.score || 0)]));
      }
    }

    const ranked = await rankProvidersForIntent({
      intent: parsed,
      options: {
        recruiterId: req.user?._id || null,
          lat: resolvedLat,
          lng: resolvedLng,
        radius,
        availability,
        sortBy,
        page,
        limit,
      },
    });

    const providers = ranked.providers.map((provider) => {
      const providerId = String(provider.user?._id || provider.user || provider._id || '');
      const semanticScore = Number(semanticMap.get(providerId) || 0);
      const mobilityType = classifyJobMobility(parsed.extractedSkill || skill || '', parsed.skillLevel || parsed.requiredSkillLevel || '');
      const semanticCap = mobilityType === 'remote/global' ? 8 : mobilityType === 'regional' ? 5 : 2;
      const semanticBoost = semanticScore > 0 ? Math.min(semanticCap, semanticScore * 10) : 0;
      const finalScore = Number(Math.min(100, Number(provider.matchScore || 0) + semanticBoost).toFixed(2));

      return {
      ...provider,
      semanticScore: Number(semanticScore.toFixed(4)),
      matchScore: finalScore,
      reasons: topReasonsFromBreakdown(provider.scoreBreakdown),
    };
    }).sort((a, b) => {
      const ap = Number(a.visibilityPriority || 0);
      const bp = Number(b.visibilityPriority || 0);
      if (ap !== bp) return bp - ap;
      return Number(b.matchScore || 0) - Number(a.matchScore || 0);
    });

    if (req.user?._id) {
      await createRecruiterSearchLog({
        recruiterId: req.user._id,
        query: String(query || '').trim() || [skill, city, locality].filter(Boolean).join(' ') || 'All Providers',
        parsedIntent: {
          skill: parsed.extractedSkill,
          city: parsed.extractedCity,
          locality: parsed.extractedLocality,
          urgency: parsed.extractedUrgency,
        },
        resultCount: providers.length,
      });
    }

    return res.json({
      intent: {
        skill: parsed.extractedSkill,
        city: parsed.extractedCity || searchLocation,
        locality: parsed.extractedLocality,
        confidence: parsed.confidence,
      },
      providers,
      summary: ranked.summary,
      searchMeta: ranked.meta || {
        locationQuery: searchLocation,
        locationLevel: 'national',
        locationMessage: '',
      },
      pagination: {
        page: ranked.page,
        limit: ranked.limit,
        total: ranked.total,
        pages: ranked.pages,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to search providers', error: error.message });
  }
};

const autoMatch = async (req, res) => {
  try {
    const {
      query,
      skill,
      city,
      locality,
      lat,
      lng,
      radius,
      instantHire = false,
    } = req.body;

    const structured = pickStructuredIntent({ skill, city, locality });
    const parsed = await parseSearchIntent({
      query: query || [skill, city, locality].filter(Boolean).join(' '),
      structured,
      sourceUserId: req.user?._id || null,
      sourceUserRole: req.user?.activeRole || req.user?.role || 'recruiter',
      allowAIFallback: true,
    });

    const ranked = await rankProvidersForIntent({
      intent: parsed,
      options: {
        recruiterId: req.user?._id || null,
        lat,
        lng,
        radius,
        sortBy: 'match',
        page: 1,
        limit: 5,
        instantHire,
      },
    });

    const budget = await suggestBudgetRange({
      skill: parsed.extractedSkill,
      city: parsed.extractedCity,
    });

    const topProviders = ranked.providers.slice(0, 5).map((provider) => ({
      ...provider,
      reasons: topReasonsFromBreakdown(provider.scoreBreakdown),
    }));

    await logBusinessEvent({
      taskType: 'auto_match',
      relatedEntityType: 'search_intent',
      relatedEntityId: parsed.intentId,
      payload: { query, skill, city, locality, instantHire },
      result: { matched: topProviders.length },
      status: 'success',
    });

    return res.json({
      topProviders,
      reasonForRecommendation: topProviders.map((provider) => ({
        providerId: provider._id,
        reasons: provider.reasons,
      })),
      suggestedBudgetRange: budget,
      intent: parsed,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to auto match providers', error: error.message });
  }
};

const parseSearchIntentAI = async (req, res) => {
  try {
    const { query, structured = {}, locationContext } = req.body;
    
    const { extractSearchFilters } = require('../services/openaiSearchService');
    const aiOutput = await extractSearchFilters(query);

    const parsedResult = {
      extractedSkill: aiOutput.skill || null,
      extractedCity: aiOutput.location || null,
      confidence: aiOutput.skill || aiOutput.location ? 0.85 : 0.2,
      rawQuery: query,
    };

    if (parsedResult.extractedSkill) {
      const { canonicalizeSpeciality } = require('../services/providerIntelligenceService');
      const canonical = canonicalizeSpeciality(parsedResult.extractedSkill);
      if (canonical && canonical.skillLevel) {
        parsedResult.extractedTier = canonical.skillLevel;
      }
    }

    return res.json({
      success: true,
      parsed: parsedResult,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to parse search intent', error: error.message });
  }
};

const getProviderTrustScore = async (req, res) => {
  try {
    const providerId = req.params.providerId;
    const trust = await prisma.trustScore.findUnique({ where: { providerId: String(providerId) } });
    if (!trust) {
      return res.status(404).json({ message: 'Trust score not found for provider' });
    }

    return res.json({
      providerId,
      score: trust.score,
      breakdown: trust.breakdown,
      reasons: trust.reasons || [],
      computedAt: trust.computedAt,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch trust score', error: error.message });
  }
};

const getRepeatRecommendations = async (req, res) => {
  try {
    const recruiterId = req.user?._id;
    const { limit = 8 } = req.query;
    const limitNum = Math.max(1, Math.min(25, Number(limit || 8)));

    const [historyBoost, recentInsights] = await Promise.all([
      searchByRecruiterHistory({ recruiterId, limit: limitNum }),
      prisma.repeatHireInsight.findMany({
        where: { recruiterId: String(recruiterId) },
        orderBy: [{ updatedAt: 'desc' }, { hireCount: 'desc' }],
        take: limitNum,
      }),
    ]);

    const merged = new Map();

    historyBoost.forEach((item) => {
      merged.set(String(item.providerId), {
        providerId: String(item.providerId),
        semanticScore: Number(item.score || 0),
        hireCount: 0,
        repeatScore: Number((item.score || 0) * 100).toFixed(2),
      });
    });

    recentInsights.forEach((item) => {
      const key = String(item.providerId);
      const current = merged.get(key) || { providerId: key, semanticScore: 0, hireCount: 0, repeatScore: 0 };
      current.hireCount = Number(item.hireCount || 0);
      current.repeatScore = Number((Number(current.repeatScore || 0) + Math.min(35, current.hireCount * 8)).toFixed(2));
      merged.set(key, current);
    });

    const recommendations = Array.from(merged.values())
      .sort((a, b) => Number(b.repeatScore || 0) - Number(a.repeatScore || 0))
      .slice(0, limitNum);

    return res.json({
      recommendations,
      total: recommendations.length,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch repeat recommendations', error: error.message });
  }
};

const autoMatchPreview = async (req, res) => {
  req.body = req.body || {};
  req.body.instantHire = req.body.instantHire === true || req.body.instantHire === 'true';
  return autoMatch(req, res);
};

module.exports = {
  interpretSearch,
  searchProviders,
  autoMatch,
  parseSearchIntentAI,
  getProviderTrustScore,
  getRepeatRecommendations,
  autoMatchPreview,
};
