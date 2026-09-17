const AdminSetting = require('../models/AdminSetting');
const ProviderProfile = require('../models/ProviderProfile');
const ProviderMetrics = require('../models/ProviderMetrics');
const FraudFlag = require('../models/FraudFlag');
const TrustScore = require('../models/TrustScore');

const DEFAULT_WEIGHTS = {
  rating: 25,
  responseTime: 20,
  profileCompleteness: 15,
  rejectionRate: 15,
  verificationStatus: 15,
  fraudPenalty: 10,
};

const cache = {
  value: DEFAULT_WEIGHTS,
  expiresAt: 0,
};

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(v || 0)));
}

function safeRatio(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

async function getTrustWeights() {
  if (cache.expiresAt > Date.now()) return cache.value;

  const settings = await AdminSetting.find({ category: 'trust' }).lean();
  const byKey = new Map(settings.map((item) => [item.key, Number(item.value)]));

  const weights = {
    rating: Number.isFinite(byKey.get('trust.weight.rating')) ? byKey.get('trust.weight.rating') : DEFAULT_WEIGHTS.rating,
    responseTime: Number.isFinite(byKey.get('trust.weight.response_time')) ? byKey.get('trust.weight.response_time') : DEFAULT_WEIGHTS.responseTime,
    profileCompleteness: Number.isFinite(byKey.get('trust.weight.profile_completeness')) ? byKey.get('trust.weight.profile_completeness') : DEFAULT_WEIGHTS.profileCompleteness,
    rejectionRate: Number.isFinite(byKey.get('trust.weight.rejection_rate')) ? byKey.get('trust.weight.rejection_rate') : DEFAULT_WEIGHTS.rejectionRate,
    verificationStatus: Number.isFinite(byKey.get('trust.weight.verification_status')) ? byKey.get('trust.weight.verification_status') : DEFAULT_WEIGHTS.verificationStatus,
    fraudPenalty: Number.isFinite(byKey.get('trust.weight.fraud_penalty')) ? byKey.get('trust.weight.fraud_penalty') : DEFAULT_WEIGHTS.fraudPenalty,
  };

  cache.value = weights;
  cache.expiresAt = Date.now() + 30_000;
  return weights;
}

function calculateBaseScores({ profile, metrics, openFraudFlags }) {
  const ratingScore = clamp((Number(profile?.rating || 0) / 5) * 100);

  const responseSeconds = Number(metrics?.avgResponseSeconds || 0);
  let responseScore = 60;
  if (responseSeconds > 0 && responseSeconds <= 300) responseScore = 100;
  else if (responseSeconds <= 900) responseScore = 80;
  else if (responseSeconds <= 1800) responseScore = 65;
  else if (responseSeconds <= 3600) responseScore = 45;
  else if (responseSeconds > 3600) responseScore = 25;

  const completenessScore = clamp(Number(metrics?.profileCompletionScore ?? profile?.profileCompletion ?? 0));
  const rejectionScore = clamp((1 - safeRatio(metrics?.rejectionRate)) * 100);
  const verificationScore = profile?.isVerified ? 100 : 35;

  const fraudPenaltyScore = clamp(100 - Math.min(100, Number(openFraudFlags || 0) * 22));

  return {
    ratingScore,
    responseScore,
    completenessScore,
    rejectionScore,
    verificationScore,
    fraudPenaltyScore,
  };
}

function computeTrustScore(scores, weights) {
  const weighted = {
    ratingWeight: Number(((scores.ratingScore * weights.rating) / 100).toFixed(2)),
    responseWeight: Number(((scores.responseScore * weights.responseTime) / 100).toFixed(2)),
    completenessWeight: Number(((scores.completenessScore * weights.profileCompleteness) / 100).toFixed(2)),
    rejectionWeight: Number(((scores.rejectionScore * weights.rejectionRate) / 100).toFixed(2)),
    verificationWeight: Number(((scores.verificationScore * weights.verificationStatus) / 100).toFixed(2)),
    fraudPenaltyWeight: Number(((scores.fraudPenaltyScore * weights.fraudPenalty) / 100).toFixed(2)),
  };

  const total = Object.values(weighted).reduce((sum, item) => sum + Number(item || 0), 0);
  return {
    score: Number(clamp(total).toFixed(2)),
    breakdown: weighted,
  };
}

async function recalculateProviderTrustScore(providerId) {
  const [profile, metrics, openFraudFlags, weights] = await Promise.all([
    ProviderProfile.findOne({ user: providerId }).lean(),
    ProviderMetrics.findOne({ providerId }).lean(),
    FraudFlag.countDocuments({ userId: providerId, status: { $in: ['open', 'reviewing'] } }),
    getTrustWeights(),
  ]);

  if (!profile) {
    return { providerId, score: 0, breakdown: {}, reasons: ['Provider profile not found'] };
  }

  const baseScores = calculateBaseScores({ profile, metrics, openFraudFlags });
  const trust = computeTrustScore(baseScores, weights);
  const reasons = [];
  if (profile.isVerified) reasons.push('Verified profile');
  if (Number(profile.rating || 0) >= 4) reasons.push('Strong rating signal');
  if (safeRatio(metrics?.rejectionRate) <= 0.3) reasons.push('Low rejection behavior');
  if (openFraudFlags > 0) reasons.push('Open fraud flags impacted trust score');

  await TrustScore.findOneAndUpdate(
    { providerId },
    {
      $set: {
        score: trust.score,
        breakdown: trust.breakdown,
        reasons,
        configVersion: 1,
        computedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await ProviderProfile.findOneAndUpdate(
    { user: providerId },
    { $set: { trustScore: trust.score } }
  );

  await ProviderMetrics.findOneAndUpdate(
    { providerId },
    { $set: { trustScore: trust.score } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    providerId,
    score: trust.score,
    breakdown: trust.breakdown,
    reasons,
  };
}

module.exports = {
  getTrustWeights,
  recalculateProviderTrustScore,
};
