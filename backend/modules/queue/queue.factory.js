let BullMqQueue = null;
try {
  // Optional dependency at runtime.
  // eslint-disable-next-line global-require
  BullMqQueue = require('bullmq').Queue;
} catch (_) {
  BullMqQueue = null;
}

const { getRedisClient, getRedisUrl, parseBool } = require('./redis.client');

const queueMap = new Map();
const inlineHandlers = new Map();

function queueEnabledByEnv() {
  return parseBool(process.env.QUEUE_USE_BULLMQ, false);
}

function queueSupported() {
  return queueEnabledByEnv() && !!BullMqQueue && !!getRedisUrl();
}

function getQueueDefaults() {
  return {
    attempts: Math.max(1, Number(process.env.QUEUE_DEFAULT_ATTEMPTS || 3)),
    backoff: {
      type: 'exponential',
      delay: Math.max(500, Number(process.env.QUEUE_DEFAULT_BACKOFF_MS || 1500)),
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  };
}

function getOrCreateQueue(queueName) {
  if (!queueSupported()) return null;
  if (queueMap.has(queueName)) return queueMap.get(queueName);

  const queue = new BullMqQueue(queueName, {
    connection: getRedisClient(),
    defaultJobOptions: getQueueDefaults(),
  });

  queueMap.set(queueName, queue);
  return queue;
}

function registerInlineHandler(jobName, handler) {
  if (typeof handler !== 'function') {
    throw new Error('inline handler must be a function');
  }
  inlineHandlers.set(jobName, handler);
}

async function runInline(jobName, payload = {}) {
  const handler = inlineHandlers.get(jobName);
  if (!handler) {
    return {
      mode: 'inline',
      status: 'skipped',
      result: { queuedWithoutHandler: true },
    };
  }

  const result = await handler(payload);
  return {
    mode: 'inline',
    status: 'success',
    result,
  };
}

async function enqueueOrRun({ queueName, jobName, payload = {}, jobId } = {}) {
  if (!queueName || !jobName) {
    throw new Error('queueName and jobName are required');
  }

  const sanitizedJobId = jobId && typeof jobId === 'string' ? jobId.replace(/:/g, '-') : jobId;

  if (queueSupported()) {
    const queue = getOrCreateQueue(queueName);
    const job = await queue.add(jobName, payload, {
      jobId: sanitizedJobId || undefined,
    });

    return {
      mode: 'bullmq',
      status: 'queued',
      queueName,
      jobName,
      jobId: String(job.id),
    };
  }

  return runInline(jobName, payload);
}

function getQueueRuntimeInfo() {
  if (!queueEnabledByEnv()) {
    return {
      enabled: false,
      mode: 'inline',
      reason: 'QUEUE_USE_BULLMQ=false',
    };
  }

  if (!BullMqQueue) {
    return {
      enabled: false,
      mode: 'inline',
      reason: 'bullmq_not_installed',
    };
  }

  if (!getRedisUrl()) {
    return {
      enabled: false,
      mode: 'inline',
      reason: 'redis_url_missing',
    };
  }

  return {
    enabled: true,
    mode: 'bullmq',
    reason: null,
  };
}

async function closeQueues() {
  const closePromises = [];
  for (const queue of queueMap.values()) {
    closePromises.push(queue.close());
  }
  await Promise.allSettled(closePromises);
  queueMap.clear();
}

module.exports = {
  registerInlineHandler,
  enqueueOrRun,
  getQueueRuntimeInfo,
  queueSupported,
  getQueueDefaults,
  closeQueues,
};
