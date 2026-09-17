const { DEFAULT_WEIGHTS } = require('./matchWeightService');

const weightConfig = {
  skillMatch: 25,
  locationDistance: 20,
  availability: 10,
  trustRating: 15,
  responseSpeed: 10,
  subscriptionBoost: 10,
  leadFreshness: 5,
  profileCompleteness: 5,
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function scoreSkillMatch(provider, intent) {
  const intentSkill = normalize(intent?.extractedSkill);
  if (!intentSkill) return 60;
  const skills = Array.isArray(provider?.skills) ? provider.skills.map(normalize) : [];
  if (skills.includes(intentSkill)) return 100;
  if (skills.some((skill) => skill.includes(intentSkill) || intentSkill.includes(skill))) return 80;
  return 15;
}

function scoreLocationDistance(provider, intent, distanceKm = null) {
  const targetCity = normalize(intent?.extractedCity);
  const providerCity = normalize(provider?.city);

  let cityScore = 50;
  if (!targetCity) cityScore = 60;
  else if (providerCity && (providerCity.includes(targetCity) || targetCity.includes(providerCity))) cityScore = 90;

  if (distanceKm === null || distanceKm === undefined || !Number.isFinite(Number(distanceKm))) {
    return cityScore;
  }

  const d = Number(distanceKm);
  if (d <= 5) return 100;
  if (d <= 15) return 85;
  if (d <= 30) return 70;
  if (d <= 50) return 50;
  if (d <= 80) return 30;
  return 10;
}

function scoreAvailability(providerAvailability) {
  if (!providerAvailability) return 55;
  return providerAvailability.isAvailableNow ? 100 : 30;
}

function scoreTrustRating(provider, providerMetrics) {
  const trust = Number(providerMetrics?.trustScore ?? provider?.trustScore ?? 0);
  if (trust > 0) return clamp(trust);
  const rating = Number(provider?.rating || 0);
  const verifiedBonus = provider?.isVerified ? 5 : 0;
  return clamp(rating * 20 + verifiedBonus);
}

function scoreResponseSpeed(providerMetrics) {
  const seconds = Number(providerMetrics?.avgResponseSeconds || 0);
  if (!seconds) return 55;
  if (seconds <= 300) return 100;
  if (seconds <= 900) return 80;
  if (seconds <= 1800) return 60;
  if (seconds <= 3600) return 40;
  return 20;
}

function scoreSubscriptionBoost(provider, providerSubscription) {
  const boostWeight = Number(provider?.boostWeight || providerSubscription?.boostMeta?.boostWeight || 0);
  const normalizedBoost = clamp(boostWeight * 10, 0, 100);
  if (normalizedBoost > 0) return normalizedBoost;
  const active = provider?.isActiveSubscription || providerSubscription?.status === 'active';
  return active ? 60 : 30;
}

function scoreLeadFreshness(providerMetrics) {
  const lastAssignedAt = providerMetrics?.lastLeadAssignedAt ? new Date(providerMetrics.lastLeadAssignedAt) : null;
  if (!lastAssignedAt || Number.isNaN(lastAssignedAt.getTime())) return 70;

  const minsAgo = (Date.now() - lastAssignedAt.getTime()) / (1000 * 60);
  if (minsAgo >= 1440) return 100; // 24h+
  if (minsAgo >= 240) return 80;   // 4h+
  if (minsAgo >= 60) return 60;    // 1h+
  if (minsAgo >= 15) return 40;
  return 20;
}

function scoreProfileCompleteness(provider, providerMetrics) {
  const completion = Number(providerMetrics?.profileCompletionScore ?? provider?.profileCompletion ?? 0);
  return clamp(completion);
}

function computeWeightedScore(rawBreakdown, weights = weightConfig) {
  const weighted = {};
  let total = 0;

  Object.entries(rawBreakdown).forEach(([key, score]) => {
    const weight = weights[key] || 0;
    const normalizedScore = clamp(Number(score || 0));
    const contribution = (normalizedScore * weight) / 100;
    weighted[key] = {
      score: Number(normalizedScore.toFixed(2)),
      weight,
      weighted: Number(contribution.toFixed(2)),
    };
    total += contribution;
  });

  return {
    totalScore: Number(clamp(total).toFixed(2)),
    breakdown: weighted,
  };
}

function computeMatchScore({
  provider,
  intent,
  distanceKm = null,
  providerAvailability = null,
  providerMetrics = null,
  providerSubscription = null,
  weights = DEFAULT_WEIGHTS,
}) {
  const raw = {
    skillMatch: scoreSkillMatch(provider, intent),
    locationDistance: scoreLocationDistance(provider, intent, distanceKm),
    availability: scoreAvailability(providerAvailability),
    trustRating: scoreTrustRating(provider, providerMetrics),
    responseSpeed: scoreResponseSpeed(providerMetrics),
    subscriptionBoost: scoreSubscriptionBoost(provider, providerSubscription),
    leadFreshness: scoreLeadFreshness(providerMetrics),
    profileCompleteness: scoreProfileCompleteness(provider, providerMetrics),
  };

  const weighted = computeWeightedScore(raw, weights);

  return {
    matchScore: weighted.totalScore,
    scoreBreakdown: weighted.breakdown,
  };
}

module.exports = {
  weightConfig,
  computeMatchScore,
};
