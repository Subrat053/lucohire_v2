require('dotenv').config();

const prisma = require('../../../config/prisma');
let BullMqWorker = null;
try {
  // Optional dependency at runtime.
  // eslint-disable-next-line global-require
  BullMqWorker = require('bullmq').Worker;
} catch (_) {
  BullMqWorker = null;
}

const connectDB = require('../../../config/db');
const { getRedisClient, closeRedisClient } = require('../../queue/redis.client');
const { getQueueRuntimeInfo } = require('../../queue/queue.factory');
const { QUEUE_NAMES } = require('../../queue/queue.names');
const { registerDefaultJobHandlers, runJobHandler } = require('../../queue/job.handlers');

const WORKER_CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY || 5));

let workers = [];
let shuttingDown = false;

async function stopWorkers(signal = 'manual') {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[AI Worker] ${signal} received. Stopping workers...`);

  try {
    await Promise.allSettled(workers.map((worker) => worker.close()));
    workers = [];
  } catch (_) {
    // no-op
  }

  try {
    await closeRedisClient();
  } catch (_) {
    // no-op
  }

  try {
    await prisma.$disconnect();
  } catch (_) {
    // no-op
  }
}

async function startAIWorker() {
  const queueInfo = getQueueRuntimeInfo();
  if (!queueInfo.enabled) {
    throw new Error(`QUEUE_USE_BULLMQ mode is disabled (${queueInfo.reason || 'queue_unavailable'})`);
  }

  if (!BullMqWorker) {
    throw new Error('bullmq package is missing');
  }

  await connectDB();
  registerDefaultJobHandlers();

  const redisConnection = getRedisClient();
  if (!redisConnection) {
    throw new Error('Failed to initialize Redis connection');
  }

  const queueNames = Object.values(QUEUE_NAMES);
  workers = queueNames.map((queueName) => {
    const worker = new BullMqWorker(
      queueName,
      async (job) => runJobHandler(job.name, job.data || {}),
      {
        connection: redisConnection,
        concurrency: WORKER_CONCURRENCY,
        settings: {
          stalledInterval: 300000,
          drainDelay: 15000,
        },
        metrics: null,
      }
    );

    worker.on('ready', () => {
      console.log(`[AI Worker] Listening on queue '${queueName}'`);
    });

    worker.on('completed', (job) => {
      console.log(`[AI Worker] Completed ${job.name} (${job.id})`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[AI Worker] Failed ${job?.name || 'unknown'} (${job?.id || 'n/a'}): ${err.message}`);
    });

    worker.on('error', (error) => {
      console.error(`[AI Worker] Queue error on '${queueName}': ${error.message}`);
    });

    return worker;
  });

  console.log(`[AI Worker] Started ${workers.length} workers (concurrency=${WORKER_CONCURRENCY})`);
}

if (require.main === module) {
  startAIWorker().catch((error) => {
    console.error(`[AI Worker] Startup failed: ${error.message}`);
    process.exit(1);
  });

  process.on('SIGINT', async () => {
    await stopWorkers('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await stopWorkers('SIGTERM');
    process.exit(0);
  });
}

module.exports = {
  startAIWorker,
  stopWorkers,
};
