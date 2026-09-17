const { getRedisClient } = require('../../modules/queue/redis.client');
const logger = require('../../utils/logger');

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days in Redis

async function getCachedCareerHealth(fileHash) {
  try {
    const redis = getRedisClient();
    const redisKey = `careerHealth:fileHash:${fileHash}`;

    // 1. Check Redis
    if (redis) {
      const cachedString = await redis.get(redisKey);
      if (cachedString) {
        logger.info('[Career Health Cache] Cache hit in Redis', { fileHash });
        return JSON.parse(cachedString);
      }
    }

    logger.info('[Career Health Cache] Cache miss', { fileHash });
    return null;
  } catch (error) {
    logger.warn('[Career Health Cache] Error fetching cache', { error: error.message });
    return null;
  }
}

async function setCachedCareerHealth(fileHash, reportData) {
  try {
    const redis = getRedisClient();
    const redisKey = `careerHealth:fileHash:${fileHash}`;

    // Save to Redis
    if (redis) {
      await redis.set(redisKey, JSON.stringify(reportData), 'EX', CACHE_TTL_SECONDS);
    }

    logger.info('[Career Health Cache] Cached successfully', { fileHash });
  } catch (error) {
    logger.warn('[Career Health Cache] Error saving cache', { error: error.message });
  }
}

module.exports = {
  getCachedCareerHealth,
  setCachedCareerHealth,
};
