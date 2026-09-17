const AdminSetting = require('../models/AdminSetting');

const DEFAULT_WEIGHTS = {
  skillMatch: 25,
  locationDistance: 20,
  availability: 10,
  trustRating: 15,
  responseSpeed: 10,
  subscriptionBoost: 10,
  leadFreshness: 5,
  profileCompleteness: 5,
};

const cache = { expiresAt: 0, value: DEFAULT_WEIGHTS };

async function getMatchScoreWeights() {
  if (cache.expiresAt > Date.now()) return cache.value;

  const settings = await AdminSetting.find({ category: 'matching' }).lean();
  const byKey = new Map(settings.map((item) => [item.key, Number(item.value)]));

  const weights = {
    skillMatch: Number.isFinite(byKey.get('match.weight.skill')) ? byKey.get('match.weight.skill') : DEFAULT_WEIGHTS.skillMatch,
    locationDistance: Number.isFinite(byKey.get('match.weight.location')) ? byKey.get('match.weight.location') : DEFAULT_WEIGHTS.locationDistance,
    availability: Number.isFinite(byKey.get('match.weight.availability')) ? byKey.get('match.weight.availability') : DEFAULT_WEIGHTS.availability,
    trustRating: Number.isFinite(byKey.get('match.weight.trust')) ? byKey.get('match.weight.trust') : DEFAULT_WEIGHTS.trustRating,
    responseSpeed: Number.isFinite(byKey.get('match.weight.response_speed')) ? byKey.get('match.weight.response_speed') : DEFAULT_WEIGHTS.responseSpeed,
    subscriptionBoost: Number.isFinite(byKey.get('match.weight.subscription_boost')) ? byKey.get('match.weight.subscription_boost') : DEFAULT_WEIGHTS.subscriptionBoost,
    leadFreshness: Number.isFinite(byKey.get('match.weight.lead_freshness')) ? byKey.get('match.weight.lead_freshness') : DEFAULT_WEIGHTS.leadFreshness,
    profileCompleteness: Number.isFinite(byKey.get('match.weight.profile_completeness')) ? byKey.get('match.weight.profile_completeness') : DEFAULT_WEIGHTS.profileCompleteness,
  };

  cache.value = weights;
  cache.expiresAt = Date.now() + 30_000;
  return weights;
}

module.exports = {
  DEFAULT_WEIGHTS,
  getMatchScoreWeights,
};
