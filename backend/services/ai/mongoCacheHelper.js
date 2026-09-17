const { getRedisClient } = require('../../modules/queue/redis.client');
const logger = require('../../utils/logger');

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

async function getAiFeatureCache(featureName, targetHash, redisKey) {
  try {
    const redis = getRedisClient();
    if (redis && redisKey) {
      const cachedString = await redis.get(redisKey);
      if (cachedString) {
        return JSON.parse(cachedString);
      }
    }
  } catch (err) {
    logger.warn(`[RedisCacheHelper] Error fetching cache for ${featureName}`, { error: err.message });
  }
  return null;
}

async function setAiFeatureCache(featureName, targetHash, redisKey, reportData) {
  try {
    const redis = getRedisClient();
    if (redis && redisKey) {
      await redis.set(redisKey, JSON.stringify(reportData), 'EX', CACHE_TTL_SECONDS);
    }
  } catch (err) {
    logger.warn(`[RedisCacheHelper] Error saving cache for ${featureName}`, { error: err.message });
  }
}

module.exports = {
  getAiFeatureCache,
  setAiFeatureCache,
  // Export old names temporarily if missed anywhere
  getMongoCache: getAiFeatureCache,
  setMongoCache: setAiFeatureCache,
};
