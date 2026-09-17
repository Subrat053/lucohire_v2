const prisma = require('../config/prisma');
const { enabled } = require('../middleware/operationalFeatureGate');
const { prepareJobData } = require('../services/jobPersistenceService');
const { validateJob } = require('../services/pipeline/jobValidationService');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');

const selfHealingEnabled = () => enabled('ENABLE_SELF_HEALING') && enabled('ENABLE_PIPELINE_JOBS');
const disabledResponse = (res) => res.status(503).json({
  success: false,
  code: 'OPERATION_DISABLED',
  message: 'Self-healing pipeline operations are disabled.',
});
const jsonSnapshot = (value) => JSON.parse(JSON.stringify(value));

exports.getFlaggedJobs = async (_req, res) => {
  if (!selfHealingEnabled()) return disabledResponse(res);
  try {
    const recentJobs = withLegacyIds(await prisma.jobPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    }));
    const flagged = [];
    for (const job of recentJobs) {
      const validation = validateJob(job);
      if (!validation.isValid || validation.validationStatus === 'needs_review' || validation.validationErrors.length > 0) {
        flagged.push({
          jobId: job._id,
          title: job.title,
          companyName: job.companyName,
          status: job.status,
          errors: validation.validationErrors,
          originalState: job,
        });
      }
    }
    res.json({ success: true, count: flagged.length, data: flagged });
  } catch (error) {
    console.error('Error fetching flagged jobs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch flagged jobs' });
  }
};

exports.applyFix = async (req, res) => {
  if (!selfHealingEnabled()) return disabledResponse(res);
  try {
    const { jobId, action } = req.body;
    const rawAdminId = req.user?.id || req.user?._id;
    const adminId = rawAdminId ? String(rawAdminId) : null;
    const current = await prisma.jobPost.findUnique({ where: { id: String(jobId) } });
    if (!current) return res.status(404).json({ success: false, message: 'Job not found' });
    const beforeState = jsonSnapshot(withLegacyId(current));
    let data;
    if (action === 'apply_default_salary') {
      data = prepareJobData({
        budgetType: 'fixed', minBudget: 0, maxBudget: 0, pricingType: 'fixed',
        budget: {
          ...(current.budget && !Array.isArray(current.budget) && typeof current.budget === 'object'
            ? current.budget
            : {}),
          currency: 'INR',
        },
      });
    } else if (action === 'set_draft') {
      data = { status: 'draft', isActive: false };
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    const job = withLegacyId(await prisma.jobPost.update({ where: { id: String(jobId) }, data }));
    await prisma.pipelineAuditLog.create({
      data: {
        actionType: 'self_heal_fix',
        entityType: 'job',
        entityId: job.id,
        beforeState,
        afterState: jsonSnapshot(job),
        triggerSource: 'admin_manual',
        adminUserId: adminId,
        reason: `Applied fix: ${action}`,
      },
    });
    res.json({ success: true, message: 'Fix applied successfully', data: job });
  } catch (error) {
    console.error('Error applying fix:', error);
    res.status(500).json({ success: false, message: 'Failed to apply fix' });
  }
};

exports.undoFix = async (req, res) => {
  if (!selfHealingEnabled()) return disabledResponse(res);
  try {
    const { jobId } = req.body;
    const lastLog = await prisma.pipelineAuditLog.findFirst({
      where: { entityId: String(jobId), actionType: 'self_heal_fix' },
      orderBy: { createdAt: 'desc' },
    });
    if (!lastLog || !lastLog.beforeState) {
      return res.status(404).json({ success: false, message: 'No undo history found for this job' });
    }
    const existing = await prisma.jobPost.findUnique({ where: { id: String(jobId) }, select: { id: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Job not found' });
    const job = withLegacyId(await prisma.jobPost.update({
      where: { id: String(jobId) },
      data: prepareJobData(lastLog.beforeState),
    }));
    await prisma.pipelineAuditLog.delete({ where: { id: lastLog.id } });
    res.json({ success: true, message: 'Undo successful', data: job });
  } catch (error) {
    console.error('Error undoing fix:', error);
    res.status(500).json({ success: false, message: 'Failed to undo fix' });
  }
};
