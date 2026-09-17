const prisma = require('../config/prisma');

const getRecruiterAiUsage = async (req, res) => {
  try {
    const userId = String(req.user.id || req.user._id);
    const now = new Date();

    const subscription = await prisma.userSubscription.findFirst({
      where: {
        userId,
        role: 'recruiter',
        status: 'active',
        endDate: { gt: now },
      },
      include: { planIdRecord: true },
      orderBy: [{ endDate: 'desc' }, { id: 'desc' }],
    });

    if (!subscription || !subscription.planIdRecord) {
      return res.json({ success: true, limits: {}, usage: {} });
    }

    const planObj = subscription.planIdRecord;
    const limits = planObj.aiLimits || {};

    const aiUsageDoc = await prisma.recruiterAiUsage.findFirst({
      where: {
        recruiterId: userId,
        subscriptionId: subscription.id,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
      orderBy: [{ periodStart: 'desc' }, { id: 'desc' }],
    });

    const usageObj = aiUsageDoc?.usage && typeof aiUsageDoc.usage === 'object'
      ? aiUsageDoc.usage
      : {};

    res.json({
      success: true,
      limits,
      usage: usageObj,
      planName: planObj.name,
      planSlug: planObj.slug,
    });
  } catch (error) {
    console.error('getRecruiterAiUsage error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getRecruiterAiUsage
};
