const { Queue } = require("bullmq");
const { getRedisClient } = require("../modules/queue/redis.client");
const { canUseBullMq } = require("../services/queueService");

const NIGHTLY_SCRAPER_QUEUE = "nightly-scraper-queue";

let queue = null;
if (canUseBullMq()) {
  const redisConnection = getRedisClient();
  queue = new Queue(NIGHTLY_SCRAPER_QUEUE, { connection: redisConnection });
}

module.exports = {
  queue,
  NIGHTLY_SCRAPER_QUEUE
};
