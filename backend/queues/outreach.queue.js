const { Queue } = require('bullmq');
const { getRedisClient } = require("../modules/queue/redis.client");

const redisConnection = getRedisClient();

const queueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false
  }
};

const outreachQueue = redisConnection ? new Queue('outreachQueue', queueOptions) : null;

module.exports = {
  outreachQueue
};
