const prisma = require('../config/prisma');

const requireIdempotencyKey = (taskType) => async (req, res, next) => {
  try {
    const idempotencyKey = String(req.headers['x-idempotency-key'] || '').trim();
    if (!idempotencyKey) {
      return res.status(400).json({ message: 'x-idempotency-key header is required' });
    }

    const existing = await prisma.automationTaskLog.findFirst({
      where: { taskType, idempotencyKey }, orderBy: { createdAt: 'desc' },
    });
    if (existing && (existing.status === 'success' || existing.status === 'running')) {
      return res.status(200).json({
        message: 'Request already processed',
        idempotencyKey,
        taskType,
        previousStatus: existing.status,
        result: existing.result || {},
      });
    }

    req.idempotency = {
      key: idempotencyKey,
      taskType,
    };
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to validate idempotency key', error: error.message });
  }
};

module.exports = {
  requireIdempotencyKey,
};
