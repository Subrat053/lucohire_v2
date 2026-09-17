const prisma = require('../config/prisma');

async function incrementJsonCounter(modelName, id, featureName, maxAttempts = 5) {
  const delegate = prisma[modelName];
  if (!delegate || !id || !featureName) {
    throw new Error('Invalid AI usage counter target');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = await delegate.findUnique({
      where: { id: String(id) },
      select: { id: true, usage: true, updatedAt: true },
    });
    if (!current) return false;

    const usage = current.usage && typeof current.usage === 'object' && !Array.isArray(current.usage)
      ? current.usage
      : {};
    const result = await delegate.updateMany({
      where: { id: current.id, updatedAt: current.updatedAt },
      data: {
        usage: {
          ...usage,
          [featureName]: Number(usage[featureName] || 0) + 1,
        },
      },
    });

    if (result.count === 1) return true;
  }

  throw new Error(`AI usage counter update conflicted after ${maxAttempts} attempts`);
}

module.exports = { incrementJsonCounter };

