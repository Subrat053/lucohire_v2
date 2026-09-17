const prisma = require('../config/prisma');

const featureCache = new Map();
const CACHE_TTL_MS = Number(process.env.FEATURE_FLAG_CACHE_MS || 30_000);

const nowMs = () => Date.now();

async function getFeatureFlag(key) {
  const cached = featureCache.get(key);
  if (cached && cached.expiresAt > nowMs()) {
    return cached.value;
  }

  // 1. Check dedicated FeatureFlag model
  let flag = await prisma.featureFlag.findUnique({ where: { key } });
  
  // 2. Fallback to AdminSetting (specifically for AI features)
  if (!flag && key.startsWith('ai.')) {
    const setting = await prisma.adminSetting.findUnique({ where: { key }, select: { value: true } });
    const rawValue = setting?.value;
    const isEnabled = rawValue === true || Number(rawValue) === 1 || String(rawValue).toLowerCase() === 'true';
    flag = { key, enabled: isEnabled, config: {} };
  }

  const value = flag || null;
  featureCache.set(key, { value, expiresAt: nowMs() + CACHE_TTL_MS });
  return value;
}


const requireFeatureFlag = (key, options = {}) => {
  const { defaultEnabled = false, message = 'This feature is currently disabled.' } = options;

  return async (req, res, next) => {
    try {
      const flag = await getFeatureFlag(key);
      const enabled = flag ? flag.enabled === true : defaultEnabled;

      if (!enabled) {
        return res.status(403).json({
          message,
          featureFlag: key,
          enabled: false,
        });
      }

      req.featureFlags = req.featureFlags || {};
      req.featureFlags[key] = {
        enabled: true,
        config: flag?.config || {},
      };

      return next();
    } catch (error) {
      return res.status(500).json({ message: 'Failed to evaluate feature flag', error: error.message });
    }
  };
};

const clearFeatureFlagCache = (key = null) => {
  if (key) {
    featureCache.delete(key);
    return;
  }
  featureCache.clear();
};

module.exports = {
  getFeatureFlag,
  requireFeatureFlag,
  clearFeatureFlagCache,
};
