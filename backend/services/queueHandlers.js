const {
  registerDefaultJobHandlers,
  runJobHandler,
  getRegisteredJobNames,
} = require('../modules/queue/job.handlers');

function registerQueueHandlers() {
  registerDefaultJobHandlers();
}

async function runRegisteredQueueJob(jobName, payload = {}) {
  registerQueueHandlers();
  return runJobHandler(jobName, payload);
}

function getRegisteredQueueJobNames() {
  registerQueueHandlers();
  return getRegisteredJobNames();
}

module.exports = {
  registerQueueHandlers,
  runRegisteredQueueJob,
  getRegisteredQueueJobNames,
};
