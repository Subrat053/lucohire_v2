const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');

async function createQueuedTask({
  taskType,
  relatedEntityType = '',
  relatedEntityId = '',
  payload = {},
  idempotencyKey = '',
}) {
  return withLegacyId(await prisma.automationTaskLog.create({
    data: {
      taskType,
      relatedEntityType,
      relatedEntityId: relatedEntityId ? String(relatedEntityId) : '',
      status: 'queued',
      attemptCount: 0,
      payload,
      idempotencyKey,
    },
  }));
}

async function runTask(taskDoc, handler) {
  const taskId = String(taskDoc.id || taskDoc._id);
  await prisma.automationTaskLog.update({
    where: { id: taskId },
    data: {
      status: 'running',
      attemptCount: { increment: 1 },
    },
  });

  try {
    const result = await handler();
    await prisma.automationTaskLog.update({
      where: { id: taskId },
      data: { status: 'success', result, executedAt: new Date() },
    });
    return { ok: true, result };
  } catch (error) {
    await prisma.automationTaskLog.update({
      where: { id: taskId },
      data: { status: 'failed', error: error.message, executedAt: new Date() },
    });
    return { ok: false, error };
  }
}

async function enqueueAndRun({
  taskType,
  relatedEntityType,
  relatedEntityId,
  payload,
  idempotencyKey,
  handler,
}) {
  const queued = await createQueuedTask({
    taskType,
    relatedEntityType,
    relatedEntityId,
    payload,
    idempotencyKey,
  });

  return runTask(queued, handler);
}

module.exports = {
  createQueuedTask,
  runTask,
  enqueueAndRun,
};
