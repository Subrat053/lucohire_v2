const { Queue } = require("bullmq");
const { getRedisClient } = require("../modules/queue/redis.client");

const { queueSupported } = require("../modules/queue/queue.factory");

const QUEUE_NAME = "candidate-digest-queue";

const redisConnection = queueSupported() ? getRedisClient() : null;

const candidateDigestQueue = redisConnection
  ? new Queue(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  : null;

module.exports = {
  candidateDigestQueue,
  QUEUE_NAME,
};
