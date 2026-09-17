const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const Lead = require('../models/Lead');
const FraudFlag = require('../models/FraudFlag');
const { fraudReview } = require('./ai/anthropicService');

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function ensureFraudFlag({ userId, reason, severity = 'medium', source = 'rule_engine', meta = {} }) {
  const existing = await FraudFlag.findOne({ userId, reason, status: { $in: ['open', 'reviewing'] } });
  if (existing) return existing;

  return FraudFlag.create({
    userId,
    reason,
    severity,
    source,
    status: 'open',
    meta,
  });
}

async function evaluateProviderFraudSignals(userId) {
  const [user, providerProfile] = await Promise.all([
    User.findById(userId).lean(),
    ProviderProfile.findOne({ user: userId }).lean(),
  ]);

  if (!user) return { flagged: false, rules: [] };

  const rules = [];

  if (user.ipAddress) {
    const sameIpCount = await User.countDocuments({ ipAddress: user.ipAddress });
    if (sameIpCount >= Math.max(3, Number(process.env.FRAUD_IP_ACCOUNT_THRESHOLD || 3))) {
      rules.push({
        reason: 'same_ip_multiple_accounts',
        severity: 'high',
        meta: { ipAddress: user.ipAddress, sameIpCount },
      });
    }
  }

  if (providerProfile?.description) {
    const normalizedDesc = normalizeText(providerProfile.description);
    if (normalizedDesc.length > 30) {
      const dupCount = await ProviderProfile.countDocuments({ description: providerProfile.description });
      if (dupCount >= 2) {
        rules.push({
          reason: 'identical_profile_text_detected',
          severity: 'medium',
          meta: { duplicateProfiles: dupCount },
        });
      }
    }
  }

  const registrationAgeHours = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60);
  const leadCount = await Lead.countDocuments({ provider: userId });
  if (registrationAgeHours >= 72 && leadCount === 0) {
    rules.push({
      reason: 'no_activity_after_registration',
      severity: 'low',
      meta: { registrationAgeHours: Number(registrationAgeHours.toFixed(1)) },
    });
  }

  const rejectedLeads = await Lead.countDocuments({ provider: userId, status: 'rejected' });
  if (leadCount >= 10 && rejectedLeads / leadCount >= 0.8) {
    rules.push({
      reason: 'high_rejection_pattern',
      severity: 'medium',
      meta: { leadCount, rejectedLeads, rejectionRatio: Number((rejectedLeads / leadCount).toFixed(2)) },
    });
  }

  const flags = [];
  for (const rule of rules) {
    // eslint-disable-next-line no-await-in-loop
    const flag = await ensureFraudFlag({
      userId,
      reason: rule.reason,
      severity: rule.severity,
      source: 'rule_engine',
      meta: rule.meta,
    });
    flags.push(flag);
  }

  return {
    flagged: flags.length > 0,
    rules,
    flags,
  };
}

async function runPeriodicFraudReview({ limit = 50 } = {}) {
  const providers = await ProviderProfile.find({ isApproved: true }).select('user').limit(limit).lean();
  const results = [];

  for (const provider of providers) {
    // eslint-disable-next-line no-await-in-loop
    const review = await evaluateProviderFraudSignals(provider.user);
    results.push({ userId: provider.user, ...review });
  }

  return results;
}

async function runAiFraudClusterReview() {
  const AdminSetting = require('../models/AdminSetting');
  const isEnabled = await AdminSetting.isFeatureEnabled('ai.feature.fraud', true);
  if (!isEnabled) {
    return { reviewed: false, reason: 'ai_feature_fraud_disabled', clusters: [] };
  }

  const suspicious = await FraudFlag.find({ status: { $in: ['open', 'reviewing'] } })
    .sort({ createdAt: -1 })

    .limit(100)
    .lean();

  if (!suspicious.length) return { reviewed: false, clusters: [] };

  const clusters = suspicious.reduce((acc, item) => {
    const key = `${item.reason}:${item.severity}`;
    if (!acc[key]) {
      acc[key] = {
        reason: item.reason,
        severity: item.severity,
        count: 0,
        userIds: [],
      };
    }
    acc[key].count += 1;
    acc[key].userIds.push(String(item.userId));
    return acc;
  }, {});

  const clusterList = Object.values(clusters)
    .map((cluster) => ({ ...cluster, userIds: [...new Set(cluster.userIds)] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const ai = await fraudReview({
    userMeta: { role: 'system' },
    clusters: clusterList,
  });

  return {
    reviewed: true,
    clusters: clusterList,
    ai,
  };
}

module.exports = {
  evaluateProviderFraudSignals,
  runPeriodicFraudReview,
  runAiFraudClusterReview,
};
