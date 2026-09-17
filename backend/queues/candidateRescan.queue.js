const { Queue } = require("bullmq");
const { getRedisClient } = require("../modules/queue/redis.client");
const { canUseBullMq } = require("../services/queueService");

const queueName = "candidateRescanQueue";

let queue;
if (canUseBullMq()) {
  const redisConnection = getRedisClient();
  queue = new Queue(queueName, { connection: redisConnection });
}

async function addCandidateRescanJob(data, opts = {}) {
  if (canUseBullMq() && queue) {
    return queue.add("candidateRescan", data, opts);
  } else {
    // BullMQ disabled, run fallback directly
    const { processCandidateRescanInline } = require("../workers/candidateRescan.worker");
    return processCandidateRescanInline(data);
  }
}

module.exports = {
  queue,
  addCandidateRescanJob,
};
