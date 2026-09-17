const ProviderProfile = require('../models/ProviderProfile');
const ProviderAvailability = require('../models/ProviderAvailability');
const ProviderMetrics = require('../models/ProviderMetrics');
const UserSubscription = require('../models/UserSubscription');
const ProviderSubscription = require('../models/ProviderSubscription');
const RepeatHireInsight = require('../models/RepeatHireInsight');
const SkillCategory = require('../models/SkillCategory');
const { computeMatchScore } = require('./matchScoringService');
const { getMatchScoreWeights } = require('./matchWeightService');
const { haversineDistanceKm } = require('../utils/distance');
const { getRotatedProviders } = require('../utils/rotation');
const { createLocationContext, scoreLocationRelevance, buildLocationMessage, LOCATION_GROUPS, findLocationGroup } = require('./locationRelevanceService');
const {
  classifyJobMobility,
  getMatchingStrategy,
  getRadiusExpansionPlan,
  validateSpecialitySkillMatch,
} = require('./providerIntelligenceService');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getProviderUserId = (provider) => {
  const user = provider?.user;
  if (!user) return null;
  if (typeof user === 'string') return user;
  return user._id ? String(user._id) : null;
};

const resolveProviderCoordinates = (provider) => {
  if (Array.isArray(provider?.geoPoint?.coordinates) && provider.geoPoint.coordinates.length === 2) {
    const [lng, lat] = provider.geoPoint.coordinates;
    const latNum = asNumber(lat);
    const lngNum = asNumber(lng);
    if (latNum !== null && lngNum !== null) return { lat: latNum, lng: lngNum };
  }

  const lat = asNumber(provider?.latitude);
  const lng = asNumber(provider?.longitude);
  if (lat !== null && lng !== null) return { lat, lng };

  return null;
};

function computeDistanceKm(provider, lat, lng) {
  const latNum = asNumber(lat);
  const lngNum = asNumber(lng);
  if (latNum === null || lngNum === null) return null;

  const coords = resolveProviderCoordinates(provider);
  if (!coords) return null;

  return haversineDistanceKm(latNum, lngNum, coords.lat, coords.lng);
}

function classifyTrustBadge(score) {
  if (score >= 80) return 'high_trust';
  if (score >= 60) return 'trusted';
  return 'standard';
}

async function fetchProviders(intent) {
  const andFilters = [];
  const inferredSkillLevel = String(intent?.skillLevel || intent?.requiredSkillLevel || intent?.tier || '').trim().toLowerCase();
  const mobilityType = classifyJobMobility(intent?.extractedSkill || intent?.skill || intent?.speciality || '', inferredSkillLevel);

  let skillNamesForTier = null;
  const tierFilter = String(intent?.tier || '').trim().toLowerCase();
  if (tierFilter && ['unskilled', 'semi-skilled', 'skilled'].includes(tierFilter)) {
    const categories = await SkillCategory.find({
      isActive: { $ne: false },
      $or: [
        { tier: tierFilter },
        { type: tierFilter },
        { type: tierFilter.replace('-', '_') },
        { tier: tierFilter.replace('_', '-') }
      ]
    }).lean();

    skillNamesForTier = [];
    for (const cat of categories) {
      const catSkills = Array.isArray(cat.skills) ? cat.skills : [];
      for (const sk of catSkills) {
        if (sk.isActive !== false && sk.name) {
          skillNamesForTier.push(sk.name.trim());
        }
      }
    }
  }

  // ── Skill filter ─────────────────────────────────────────────────────────
  // ponytail: static alias map covers composite stacks; upgrade path = SkillCategory.relatedSkills[]
  const SKILL_ALIASES = {
    'mern': ['mern', 'react', 'node', 'express', 'mongodb', 'javascript', 'full stack', 'frontend', 'backend'],
    'mean': ['mean', 'angular', 'node', 'express', 'mongodb', 'javascript', 'full stack', 'frontend', 'backend'],
    'full stack': ['full stack', 'react', 'angular', 'vue', 'node', 'express', 'django', 'laravel', 'frontend', 'backend'],
    'frontend': ['frontend', 'react', 'angular', 'vue', 'html', 'css', 'javascript', 'typescript'],
    'backend': ['backend', 'node', 'express', 'django', 'laravel', 'spring', 'rails', 'flask'],
    'react': ['react', 'frontend', 'javascript', 'typescript', 'full stack', 'mern', 'mean'],
    'node': ['node', 'nodejs', 'express', 'backend', 'javascript', 'mern', 'mean', 'full stack'],
    'angular': ['angular', 'frontend', 'javascript', 'typescript', 'mean'],
    'python': ['python', 'django', 'flask', 'fastapi', 'data science', 'machine learning'],
    'java': ['java', 'spring', 'springboot', 'j2ee', 'backend'],
  };

  const expandSkillTerms = (skillStr) => {
    const lower = String(skillStr).toLowerCase().trim();
    for (const [key, aliases] of Object.entries(SKILL_ALIASES)) {
      if (lower.includes(key) || aliases.some(a => lower.includes(a))) return aliases;
    }
    return [skillStr]; // exact skill, no alias expansion
  };

  // Collect all skill terms from skillsTags (multi-skill) or single extractedSkill
  const jobSkills = Array.isArray(intent?.skillsTags) && intent.skillsTags.length > 0
    ? intent.skillsTags
    : (intent?.extractedSkill ? [intent.extractedSkill] : []);

  if (jobSkills.length > 0) {
    const allTerms = [...new Set(jobSkills.flatMap(expandSkillTerms))];
    andFilters.push({
      $or: allTerms.flatMap(term => [
        { skills: { $regex: escapeRegex(term), $options: 'i' } },
        { 'specialities.name': { $regex: escapeRegex(term), $options: 'i' } },
        { 'specialities.slug': { $regex: escapeRegex(term), $options: 'i' } },
      ]),
    });
  }


  // ── Tier / skill-level filter ─────────────────────────────────────────────
  if (skillNamesForTier !== null) {
    if (skillNamesForTier.length > 0) {
      const skillRegexes = skillNamesForTier.map(name => ({
        skills: { $regex: '^' + escapeRegex(name) + '$', $options: 'i' }
      }));
      andFilters.push({ $or: skillRegexes });
    } else {
      andFilters.push({ _id: null });
    }
  }

  // ── Minimum rating filter ─────────────────────────────────────────────────
  const minRating = Number(intent?.minRating);
  if (Number.isFinite(minRating) && minRating > 0) {
    andFilters.push({ rating: { $gte: minRating } });
  }

  // ── Minimum experience filter ─────────────────────────────────────────────
  // experience is stored as a string like "3 years" — parse the number
  const minExperience = Number(intent?.minExperience);
  if (Number.isFinite(minExperience) && minExperience > 0) {
    // Match "3 years", "5+ years", "10 years", etc.
    // We store experience as string; filter in-memory after fetch since mongo can't compare text years easily.
    // We'll set a flag and do post-filter below.
  }

  // ── Verified-only filter ──────────────────────────────────────────────────
  if (intent?.verifiedOnly === true) {
    andFilters.push({ isVerified: true });
  }

  // ── WhatsApp Plan only filter ─────────────────────────────────────────────
  if (intent?.whatsappOnly === true) {
    andFilters.push({ whatsappFreelancePlanActive: true });
  }

  const lat = intent?.locationData?.latitude;
  const lng = intent?.locationData?.longitude;
  const isStateSearch = !!(intent?.locationData?.types?.includes('administrative_area_level_1') || 
    (intent?.locationData?.state && !intent?.locationData?.city && !intent?.locationData?.locality));

  let providers = [];
  let geoSuccess = false;

  if (lat && lng && !isStateSearch) {
    try {
      // Build geo filter that ALSO applies all andFilters (skill, tier, etc.)
      const geoQuery = andFilters.length > 1
        ? { $and: [...andFilters, {
            geoPoint: {
              $nearSphere: {
                $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
                $maxDistance: 50000, // 50km
              }
            }
          }] }
        : {
            geoPoint: {
              $nearSphere: {
                $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
                $maxDistance: 50000,
              }
            }
          };

      providers = await ProviderProfile.find(geoQuery)
        .populate('user', 'name email phone avatar whatsappNumber isWhatsappSameAsMobile whatsappAlerts')
        .lean();

      if (providers && providers.length > 0) {
        geoSuccess = true;
      }
    } catch (err) {
      console.warn("Geospatial nearSphere query for providers failed, falling back:", err.message);
    }
  }

  if (!geoSuccess) {
    if (isStateSearch && intent?.locationData?.state) {
      const stateName = intent.locationData.state;
      const stateRegex = new RegExp('^' + escapeRegex(stateName) + '$', 'i');
      const stateWordRegex = new RegExp('(?:^|\\b)' + escapeRegex(stateName) + '(?:\\b|$)', 'i');
      
      const matchingCities = Object.values(LOCATION_GROUPS)
        .filter(g => String(g.state).toLowerCase() === stateName.toLowerCase())
        .flatMap(g => [g.label, ...(g.aliases || [])])
        .filter(Boolean);
      
      const cityQueries = matchingCities.map(city => ({
        city: new RegExp('^' + escapeRegex(city) + '$', 'i')
      }));
      
      andFilters.push({
        $or: [
          { state: stateRegex },
          { 'location.state': stateRegex },
          { 'locationData.state': stateRegex },
          { 'serviceLocationData.state': stateRegex },
          { city: stateWordRegex },
          { nearestLocation: stateWordRegex },
          { 'location.city': stateWordRegex },
          { 'locationData.city': stateWordRegex },
          ...cityQueries
        ],
      });
    } else if (intent?.extractedCity) {
      andFilters.push({
        $or: [
          { city: { $regex: escapeRegex(intent.extractedCity), $options: 'i' } },
          { nearestLocation: { $regex: escapeRegex(intent.extractedCity), $options: 'i' } },
          { 'location.city': { $regex: escapeRegex(intent.extractedCity), $options: 'i' } },
          { 'locationData.city': { $regex: escapeRegex(intent.extractedCity), $options: 'i' } }
        ],
      });
    }

    const finalFilter = andFilters.length > 0 ? { $and: andFilters } : {};
    providers = await ProviderProfile.find(finalFilter)
      .populate('user', 'name email phone avatar whatsappNumber isWhatsappSameAsMobile whatsappAlerts')
      .sort({ boostWeight: -1, rating: -1, createdAt: -1 })
      .lean();
  }

  // ── Post-fetch: tier-level skill validation ───────────────────────────────
  if (intent?.extractedSkill && inferredSkillLevel) {
    providers = providers.filter((provider) => {
      const specialities = Array.isArray(provider.specialities) ? provider.specialities : [];
      if (specialities.length === 0) return true;
      return specialities.some((item) => validateSpecialitySkillMatch(inferredSkillLevel, item) && String(item.name || '').toLowerCase().includes(String(intent.extractedSkill).toLowerCase().trim()));
    });
  }

  // ── Post-fetch: minimum experience filter (string-parsed) ─────────────────
  if (Number.isFinite(minExperience) && minExperience > 0) {
    providers = providers.filter((provider) => {
      const expStr = String(provider.experience || '');
      const match = expStr.match(/(\d+)/);
      if (!match) return false;
      return Number(match[1]) >= minExperience;
    });
  }

  // ── Post-fetch: city/state match for local-mobility providers ─────────────
  const cityQuery = String(intent?.extractedCity || intent?.city || intent?.location || '').trim();
  if (cityQuery) {
    providers = providers.filter(provider => {
      const mobility = classifyJobMobility(intent?.extractedSkill || intent?.skill || '', provider.tier);
      if (mobility === 'local') {
        if (isStateSearch && intent?.locationData?.state) {
          let providerState = provider.state || provider.location?.state || provider.locationData?.state || '';
          if (!providerState && provider.city) {
            const group = findLocationGroup(provider.city);
            if (group) {
              providerState = group.state;
            }
          }
          return isTextMatch(intent.locationData.state, providerState) || 
                 isTextMatch(intent.locationData.state, provider.city) ||
                 isTextMatch(intent.locationData.state, provider.nearestLocation);
        }
        const matchesCity = isTextMatch(cityQuery, provider.city) ||
                            isTextMatch(cityQuery, provider.nearestLocation) ||
                            (Array.isArray(provider.locations) && provider.locations.some(loc => isTextMatch(cityQuery, loc)));
        return matchesCity;
      }
      return true;
    });
  }

  if (providers.length === 0 && intent?.extractedSkill) {
    const fallbackBase = [{ skills: { $regex: escapeRegex(intent.extractedSkill), $options: 'i' } }];
    if (skillNamesForTier !== null) {
      if (skillNamesForTier.length > 0) {
        const skillRegexes = skillNamesForTier.map(name => ({
          skills: { $regex: '^' + escapeRegex(name) + '$', $options: 'i' }
        }));
        fallbackBase.push({ $or: skillRegexes });
      } else {
        fallbackBase.push({ _id: null });
      }
    }
    if (intent?.verifiedOnly) fallbackBase.push({ isVerified: true });

    const fallbackProviders = await ProviderProfile.find({ $and: fallbackBase })
      .populate('user', 'name email phone avatar whatsappNumber isWhatsappSameAsMobile whatsappAlerts')
      .sort({ boostWeight: -1, rating: -1, createdAt: -1 })
      .lean();

    // Filter out local providers on global fallback since they shouldn't match across cities
    providers = fallbackProviders.filter(provider => {
      const mobility = classifyJobMobility(intent.extractedSkill || intent.skill || '', provider.tier);
      return mobility !== 'local';
    });
  }

  return providers;
}

async function buildProviderContext(providerIds, recruiterId = null) {
  const providerObjectIds = providerIds;

  const [availabilities, metrics, subscriptions, visibilitySubscriptions, repeatInsights] = await Promise.all([
    ProviderAvailability.find({ providerId: { $in: providerObjectIds } }).lean(),
    ProviderMetrics.find({ providerId: { $in: providerObjectIds } }).lean(),
    UserSubscription.find({
      userId: { $in: providerObjectIds },
      role: 'provider',
      status: 'active',
      endDate: { $gt: new Date() },
    }).lean(),
    ProviderSubscription.find({
      providerId: { $in: providerObjectIds },
      subscriptionStatus: 'active',
      paymentStatus: 'paid',
      endDate: { $gt: new Date() },
    }).lean(),
    recruiterId
      ? RepeatHireInsight.find({ recruiterId, providerId: { $in: providerObjectIds } }).lean()
      : Promise.resolve([]),
  ]);

  const availabilityMap = new Map(availabilities.map((item) => [String(item.providerId), item]));
  const metricsMap = new Map(metrics.map((item) => [String(item.providerId), item]));
  const subscriptionMap = new Map(subscriptions.map((item) => [String(item.userId), item]));
  const visibilityMap = new Map(visibilitySubscriptions.map((item) => [String(item.providerId), item]));
  const repeatMap = new Map(repeatInsights.map((item) => [String(item.providerId), item]));

  return { availabilityMap, metricsMap, subscriptionMap, visibilityMap, repeatMap };
}

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const isTextMatch = (source, target) => {
  if (!source || !target) return false;
  const a = normalizeText(source);
  const b = normalizeText(target);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
};

function buildVisibilityMeta({ provider, subscription, intent }) {
  const now = new Date();
  const planName = subscription?.planSnapshot?.name || subscription?.planSnapshot?.slug || provider?.planName || '';
  const isCustomPlan = planName === 'customise-plan' || provider?.currentPlan === 'customise-plan';
  const boostedUntil = subscription?.endDate || provider?.boostedUntil || null;
  const isBoosted = boostedUntil ? new Date(boostedUntil).getTime() > now.getTime() : false;
  const visibilityLevel = String(subscription?.visibilityLevel || provider?.visibilityLevel || '').toLowerCase() || 'basic';

  const cityQuery = intent?.extractedCity || intent?.city || intent?.location || '';
  const selectedCities = Array.isArray(subscription?.selectedCities) ? subscription.selectedCities : [];
  const cityMatch = isTextMatch(cityQuery, provider?.city) || 
                    isTextMatch(cityQuery, provider?.nearestLocation) ||
                    selectedCities.some((c) => isTextMatch(c, cityQuery));
  
  const localityQuery = intent?.extractedLocality || intent?.locality || intent?.location || '';
  const selectedPincodes = Array.isArray(subscription?.selectedPincodes) ? subscription.selectedPincodes : [];
  const pincodeMatch = selectedPincodes.some((code) => isTextMatch(code, localityQuery));

  const countryQuery = intent?.extractedCountry || intent?.country || intent?.location || '';
  const countryMatch = !countryQuery || isTextMatch(countryQuery, provider?.country);

  let planBadge = '';
  if (isCustomPlan && isBoosted) {
    planBadge = 'Custom Boost';
  } else if (visibilityLevel === 'country_top') {
    planBadge = 'Top in Country';
  } else if (visibilityLevel === 'city_top') {
    planBadge = 'Top in City';
  } else if (visibilityLevel === 'pincode_top') {
    planBadge = 'Top in Pincode';
  } else if (isBoosted) {
    planBadge = 'Featured';
  }

  let visibilityPriority = 0;

  if (isBoosted) {
    const baseWeight = Number(subscription?.priorityWeight || provider?.priorityWeight || 0);

    if (isCustomPlan) {
      // Evaluate custom plan dynamic matching priorities
      const customConfig = subscription?.customConfig || provider?.customConfig || {};
      const searchedSkill = intent?.extractedSkill || '';
      let bestCustomPriority = 30; // fallback to multiple skill basic priority level

      // 1. Check custom country visibility
      if (Array.isArray(customConfig.countries) && customConfig.countries.length > 0) {
        const countryMatch = customConfig.countries.some(item => 
          isTextMatch(item.skill, searchedSkill) && 
          (isTextMatch(item.country, cityQuery) || isTextMatch(item.country, provider?.country))
        );
        if (countryMatch) {
          bestCustomPriority = Math.max(bestCustomPriority, 120);
        }
      }

      // 2. Check custom city visibility
      if (Array.isArray(customConfig.cities) && customConfig.cities.length > 0) {
        const customCityMatch = customConfig.cities.some(item => 
          isTextMatch(item.skill, searchedSkill) && 
          isTextMatch(item.city, cityQuery)
        );
        if (customCityMatch) {
          bestCustomPriority = Math.max(bestCustomPriority, 90);
        }
      }

      // 3. Check custom locality visibility
      if (Array.isArray(customConfig.localities) && customConfig.localities.length > 0) {
        const customLocalityMatch = customConfig.localities.some(item => 
          isTextMatch(item.skill, searchedSkill) && 
          isTextMatch(item.locality, localityQuery)
        );
        if (customLocalityMatch) {
          bestCustomPriority = Math.max(bestCustomPriority, 60);
        }
      }

      visibilityPriority = bestCustomPriority;
    } else {
      // Fixed plan priorities
      const isCountry = visibilityLevel === 'country_top' || isTextMatch(planName, 'show-top-in-country');
      const isCity = isCountry || visibilityLevel === 'city_top' || isTextMatch(planName, 'top-in-city');
      const isPincode = isCity || visibilityLevel === 'pincode_top' || isTextMatch(planName, 'one-pincode-top');
      const isBasic = visibilityLevel === 'basic' || isTextMatch(planName, 'add-multiple-skills') || visibilityLevel === 'custom';

      if (isCountry && countryMatch) {
        visibilityPriority = baseWeight || 100;
      } else if (isCity && cityMatch) {
        visibilityPriority = baseWeight || 80;
      } else if (isPincode && pincodeMatch) {
        visibilityPriority = baseWeight || 50;
      } else if (isBasic) {
        visibilityPriority = baseWeight || 30; // multiple skill paid plan level
      } else {
        visibilityPriority = 5;
      }
    }
  } else if (provider?.isVerified) {
    visibilityPriority = 10;
  }

  return {
    planName,
    visibilityLevel,
    isBoosted,
    boostedUntil: boostedUntil || null,
    planBadge,
    visibilityPriority,
  };
}


function applyPremiumRotation(scoredProviders) {
  const featured = scoredProviders.filter((item) => {
    return item.isBoosted === true || item.visibilityPriority >= 20;
  });


  if (featured.length <= 1) {
    return scoredProviders;
  }

  const featuredIds = new Set(featured.map((item) => String(item._id)));
  const rotated = getRotatedProviders(featured, Number(process.env.ROTATION_INTERVAL_SEC || 60));
  const featuredLimit = Math.max(1, Number(process.env.FEATURED_LIMIT || 5));

  const rotationBonusMap = new Map(
    rotated.slice(0, featuredLimit).map((item, index) => [String(item._id), Math.max(0, 3 - index * 0.5)])
  );

  return scoredProviders.map((item) => {
    if (!featuredIds.has(String(item._id))) return item;
    const bonus = rotationBonusMap.get(String(item._id)) || 0;
    return {
      ...item,
      matchScore: Number(clamp(item.matchScore + bonus).toFixed(2)),
      rotationBonus: bonus,
    };
  });
}

function sortProviders(scoredProviders, sortBy) {
  const sorted = [...scoredProviders];

  switch (sortBy) {
    case 'distance':
      sorted.sort((a, b) => {
        const da = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.POSITIVE_INFINITY;
        const db = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return b.matchScore - a.matchScore;
      });
      return sorted;
    case 'rating':
      sorted.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
      return sorted;
    case 'trust':
      sorted.sort((a, b) => Number(b.trustScore || 0) - Number(a.trustScore || 0));
      return sorted;
    case 'response':
      sorted.sort((a, b) => Number(a.avgResponseSeconds || Number.MAX_SAFE_INTEGER) - Number(b.avgResponseSeconds || Number.MAX_SAFE_INTEGER));
      return sorted;
    case 'match':
    default:
      sorted.sort((a, b) => {
        const ap = Number(a.visibilityPriority || 0);
        const bp = Number(b.visibilityPriority || 0);
        if (ap !== bp) return bp - ap;
        return b.matchScore - a.matchScore;
      });
      return sorted;
  }
}

async function rankProvidersForIntent({ intent, options = {} }) {
  const {
    recruiterId = null,
    lat = null,
    lng = null,
    radius = Number(process.env.SEARCH_RADIUS_KM || 50),
    availability = null,
    sortBy = 'match',
    limit = 20,
    page = 1,
    instantHire = false,
  } = options;

  const providers = await fetchProviders(intent || {});
  const scoreWeights = await getMatchScoreWeights();
  const providerIds = providers.map((provider) => getProviderUserId(provider)).filter(Boolean);
  const context = await buildProviderContext(providerIds, recruiterId);
  const locationText = String(intent?.extractedCity || intent?.extractedLocality || intent?.location || '').trim();
  const locationContext = await createLocationContext(locationText, intent?.locationData);
  const strategy = getMatchingStrategy({
    workMode: intent?.workMode || intent?.extractedWorkMode || '',
    speciality: intent?.extractedSkill || intent?.skill || '',
    requiredSkillLevel: intent?.skillLevel || intent?.requiredSkillLevel || '',
  });
  const mobilityType = classifyJobMobility(intent?.extractedSkill || intent?.skill || '', intent?.skillLevel || intent?.requiredSkillLevel || '');
  const radiusPlan = getRadiusExpansionPlan(mobilityType);

  const latNum = asNumber(lat ?? locationContext?.coordinates?.lat);
  const lngNum = asNumber(lng ?? locationContext?.coordinates?.lon);
  const radiusNum = Math.max(1, Number(radius || 50));

  let scored = providers.map((provider) => {
    const providerId = getProviderUserId(provider);
    const providerAvailability = providerId ? context.availabilityMap.get(providerId) : null;
    const providerMetrics = providerId ? context.metricsMap.get(providerId) : null;
    const providerSubscription = providerId ? context.subscriptionMap.get(providerId) : null;
    const visibilitySubscription = providerId ? context.visibilityMap.get(providerId) : null;
    const repeatInsight = providerId ? context.repeatMap.get(providerId) : null;
    const distanceKm = latNum !== null && lngNum !== null ? computeDistanceKm(provider, latNum, lngNum) : null;

    const { matchScore, scoreBreakdown } = computeMatchScore({
      provider,
      intent,
      distanceKm,
      providerAvailability,
      providerMetrics,
      providerSubscription,
      weights: scoreWeights,
    });

    let adjustedScore = matchScore;
    if (repeatInsight && Number(repeatInsight.hireCount || 0) > 0) {
      adjustedScore = clamp(adjustedScore + Math.min(8, Number(repeatInsight.hireCount || 0) * 2));
    }

    const locationScore = scoreLocationRelevance(provider, locationContext, distanceKm);
    adjustedScore = clamp(adjustedScore + Math.min(15, locationScore.score * 0.15));

    const trustScoreSource = providerMetrics?.trustScore ?? provider?.trustScore ?? scoreBreakdown.trustRating?.score;
    const trustScore = Number(trustScoreSource ?? 0);

    const visibilityMeta = buildVisibilityMeta({ provider, subscription: visibilitySubscription, intent });

    return {
      ...provider,
      distanceKm,
      matchScore: Number(adjustedScore.toFixed(2)),
      scoreBreakdown,
      avgResponseSeconds: providerMetrics?.avgResponseSeconds || null,
      trustScore: Number(clamp(trustScore).toFixed(2)),
      trustBadge: classifyTrustBadge(trustScore),
      aiRecommended: adjustedScore >= 75,
      repeatHireBoost: repeatInsight ? Number(repeatInsight.hireCount || 0) : 0,
      availability: providerAvailability || null,
      locationRelevance: locationScore.level,
      locationScore: Number(locationScore.score.toFixed(2)),
      locationLabel: locationScore.label,
      planName: visibilityMeta.planName,
      visibilityLevel: visibilityMeta.visibilityLevel,
      isBoosted: visibilityMeta.isBoosted,
      boostedUntil: visibilityMeta.boostedUntil,
      planBadge: visibilityMeta.planBadge,
      visibilityPriority: visibilityMeta.visibilityPriority,
    };
  });

  if (availability === true || availability === 'true') {
    scored = scored.filter((item) => item.availability?.isAvailableNow !== false);
  }

  const isStateSearch = !!(intent?.locationData?.types?.includes('administrative_area_level_1') || 
    (intent?.locationData?.state && !intent?.locationData?.city && !intent?.locationData?.locality));

  if (latNum !== null && lngNum !== null && !isStateSearch) {
    if (strategy === 'opportunity_first') {
      scored = scored;
    } else {
      let shortlisted = [];
      const radii = radiusPlan
        .filter((step) => Number.isFinite(Number(step)))
        .map((step) => Math.max(Number(step), radiusNum));

      for (const step of radii) {
        shortlisted = scored.filter((item) => item.distanceKm !== null && item.distanceKm <= step);
        if (shortlisted.length > 0 || instantHire) break;
      }

      if (shortlisted.length === 0 && locationContext?.group?.state) {
        shortlisted = scored.filter((item) => {
          const providerState = normalizeText(item.state || item.location?.state || item.locationData?.state || '');
          return providerState && providerState === normalizeText(locationContext.group.state);
        });
      }

      if (shortlisted.length === 0 && Array.isArray(locationContext?.group?.nearby) && locationContext.group.nearby.length > 0) {
        shortlisted = scored.filter((item) => {
          const providerLocation = normalizeText(item.city || item.nearestLocation || item.location?.city || '');
          return locationContext.group.nearby.some((nearby) => providerLocation.includes(normalizeText(nearby)));
        });
      }

      scored = shortlisted.length > 0 ? shortlisted : scored;
    }
  }

  scored = applyPremiumRotation(scored);
  scored = sortProviders(scored, sortBy);

  const topLocationLevel = scored.find((item) => item.locationRelevance && item.locationRelevance !== 'none')?.locationRelevance || 'national';

  const pageNum = Math.max(1, Number(page || 1));
  const limitNum = Math.max(1, Number(limit || 20));
  const skip = (pageNum - 1) * limitNum;

  const paged = scored.slice(skip, skip + limitNum);

  return {
    providers: paged,
    total: scored.length,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(scored.length / limitNum),
    summary: {
      topScore: paged[0]?.matchScore || 0,
      avgScore: paged.length
        ? Number((paged.reduce((sum, item) => sum + Number(item.matchScore || 0), 0) / paged.length).toFixed(2))
        : 0,
      recommendedCount: paged.filter((item) => item.aiRecommended).length,
    },
    meta: {
      locationQuery: locationContext.raw || '',
      locationLevel: topLocationLevel,
      locationMessage: buildLocationMessage(locationContext, topLocationLevel),
      resolvedCoordinates: locationContext.coordinates || null,
    },
  };
}

module.exports = {
  rankProvidersForIntent,
  fetchProviders,
};
