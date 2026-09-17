const { enqueueOrRun, getQueueRuntimeInfo } = require('../../queue/queue.factory');
const { QUEUE_NAMES, QUEUE_JOB_NAMES } = require('../../queue/queue.names');

async function enqueueAIJob({ queueName, jobName, payload = {}, jobId } = {}) {
  return enqueueOrRun({ queueName, jobName, payload, jobId });
}

function getQueueHealth() {
  return getQueueRuntimeInfo();
}

module.exports = {
  QUEUE_NAMES,
  QUEUE_JOB_NAMES,
  enqueueAIJob,
  getQueueHealth,
};
