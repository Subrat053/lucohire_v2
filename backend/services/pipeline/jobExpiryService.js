const prisma = require('../../config/prisma');

/**
 * Service to handle job expiration logic.
 */

const expireOldJobs = async () => {
  // 1. Expire jobs whose persisted expiry date has passed.
  const now = new Date();

  const expiredByDate = await prisma.jobPost.updateMany({
    where: { status: 'active', expiresAt: { lt: now } },
    data: { status: 'expired', isActive: false },
  });

  // 2. TTL fallback (e.g. 45 days)
  const ttlDays = parseInt(process.env.PIPELINE_JOB_TTL_DAYS) || 45;
  const ttlDate = new Date();
  ttlDate.setDate(ttlDate.getDate() - ttlDays);

  const expiredByTtl = await prisma.jobPost.updateMany({
    where: { status: 'active', lastSeenAt: { lt: ttlDate } },
    data: { status: 'expired', isActive: false },
  });

  // 3. Expire jobs missing in consecutive successful scans
  // missingSuccessfulScanCount/expiryReason are not present in the Prisma schema,
  // so that legacy-only expiry branch remains deferred until the schema supports it.
  const expiredByMissing = { count: 0 };

  // Note: Creating audit logs for bulk updates is complex.
  // In a real production system, you'd iterate and log each, or log an aggregation.

  return {
    expiredByDate: expiredByDate.count,
    expiredByTtl: expiredByTtl.count,
    expiredByMissing: expiredByMissing.count,
  };
};

module.exports = {
  expireOldJobs
};
