const { Queue } = require("bullmq");
const { getRedisClient } = require("../modules/queue/redis.client");
const { queueSupported } = require("../modules/queue/queue.factory");

const QUEUE_NAME = "homepage-metrics-queue";

const redisConnection = queueSupported() ? getRedisClient() : null;

const homepageMetricsQueue = redisConnection
  ? new Queue(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    })
  : null;

module.exports = {
  homepageMetricsQueue,
  QUEUE_NAME,
};
