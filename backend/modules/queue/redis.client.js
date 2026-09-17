let IORedis = null;
try {
  // Optional dependency at runtime.
  // eslint-disable-next-line global-require
  IORedis = require('ioredis');
} catch (_) {
  IORedis = null;
}

let redisClient = null;

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function getRedisUrl() {
  return String(process.env.REDIS_URL || '').trim();
}

function isRedisConfigured() {
  return !!getRedisUrl();
}

function getRedisOptions() {
  const redisUrl = getRedisUrl();
  const isTls = redisUrl.startsWith('rediss://') || parseBool(process.env.REDIS_TLS, false);

  const options = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      // Exponential backoff capped at 30s to prevent spamming connections when Redis host is down/unreachable
      const delay = Math.min(times * 1000, 30000);
      return delay;
    },
  };

  if (isTls) {
    options.tls = {};

    const rejectUnauthorized = parseBool(process.env.REDIS_TLS_REJECT_UNAUTHORIZED, true);
    options.tls.rejectUnauthorized = rejectUnauthorized;
  }

  return options;
}

function getRedisClient() {
  if (!IORedis || !isRedisConfigured()) return null;
  if (redisClient) return redisClient;

  redisClient = new IORedis(getRedisUrl(), getRedisOptions());
  redisClient.on('error', () => {
    // Suppress noisy connection logs and let health checks report state.
  });
  return redisClient;
}

async function pingRedis() {
  const client = getRedisClient();
  if (!client) {
    return {
      ok: false,
      status: 'unavailable',
      reason: !IORedis ? 'ioredis_not_installed' : 'redis_url_missing',
    };
  }

  try {
    if (client.status === 'wait') {
      await client.connect();
    }
    const reply = await client.ping();
    return {
      ok: String(reply).toUpperCase() === 'PONG',
      status: client.status,
      reason: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: client.status || 'error',
      reason: error.message,
    };
  }
}

async function closeRedisClient() {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch (_) {
    try {
      redisClient.disconnect();
    } catch (__) {
      // no-op
    }
  } finally {
    redisClient = null;
  }
}

module.exports = {
  parseBool,
  getRedisUrl,
  isRedisConfigured,
  getRedisClient,
  pingRedis,
  closeRedisClient,
};
