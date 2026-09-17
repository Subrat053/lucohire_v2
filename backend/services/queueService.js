const { enqueueAndRun } = require('./automationQueueService');
const {
  registerInlineHandler: registerInlineHandlerInFactory,
  enqueueOrRun,
  getQueueRuntimeInfo,
} = require('../modules/queue/queue.factory');

function canUseBullMq() {
  return getQueueRuntimeInfo().enabled;
}

function registerInlineHandler(jobName, handler) {
  if (typeof handler !== 'function') {
    throw new Error('inline queue handler must be a function');
  }
  registerInlineHandlerInFactory(jobName, handler);
}

async function enqueueJob({
  queueName,
  jobName,
  payload = {},
  idempotencyKey = '',
  relatedEntityType = '',
  relatedEntityId = '',
}) {
  if (!queueName || !jobName) {
    throw new Error('queueName and jobName are required');
  }

  if (canUseBullMq()) {
    const queued = await enqueueOrRun({
      queueName,
      jobName,
      payload,
      jobId: idempotencyKey || undefined,
    });

    return {
      mode: queued.mode,
      queueName,
      jobName,
      jobId: queued.jobId,
    };
  }

  try {
    const result = await enqueueOrRun({
      queueName,
      jobName,
      payload,
      jobId: idempotencyKey || undefined,
    });

    return {
      mode: result.mode,
      queueName,
      jobName,
      status: result.status,
      result: result.result || null,
    };
  } catch (error) {
    const fallback = await enqueueAndRun({
      taskType: jobName,
      relatedEntityType,
      relatedEntityId,
      payload,
      idempotencyKey,
      handler: async () => {
        throw error;
      },
    });

    return {
      mode: 'automation-fallback',
      queueName,
      jobName,
      status: fallback.ok ? 'success' : 'failed',
    };
  }
}

module.exports = {
  enqueueJob,
  registerInlineHandler,
  canUseBullMq,
};
