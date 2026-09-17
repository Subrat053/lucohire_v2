const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { incrementJsonCounter } = require('../services/aiUsageCounterService');

const checkRecruiterAiLimit = (featureName) => {
  return async (req, res, next) => {
    try {
      const userId = String(req.user.id || req.user._id);
      
      // Special exemption for specific user
      const userDoc = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (userDoc && userDoc.email === 'dfnokh@gmail.com') {
         req.aiUsageData = { subscription: null, recruiterAiUsage: null, featureName };
         return next();
      }

      // 1. Find active recruiter subscription
      const now = new Date();
      const subscriptionRecord = await prisma.userSubscription.findFirst({
        where: {
          userId,
          role: 'recruiter',
          status: 'active',
          endDate: { gt: now },
        },
        include: { planIdRecord: true },
        orderBy: [{ endDate: 'desc' }, { id: 'desc' }],
      });
      const subscription = withLegacyId(subscriptionRecord);

      let plan = withLegacyId(subscriptionRecord?.planIdRecord);
      if (subscription && !plan && subscription.planCode) {
        const baseCode = subscription.planCode.replace('-quarterly', '').replace('-yearly', '');
        plan = withLegacyId(await prisma.plan.findFirst({
          where: { slug: baseCode, type: 'recruiter' },
          orderBy: [{ status: 'asc' }, { id: 'desc' }],
        }));
      }

      if (!subscription || !plan) {
        return res.status(403).json({ success: false, message: 'No active AI plan found. Please upgrade your plan.' });
      }

      const planObj = plan;
      
      // Check if feature limit exists in plan
      let limit = planObj.aiLimits && planObj.aiLimits[featureName] !== undefined ? planObj.aiLimits[featureName] : 0;
      
      if (limit === 0) {
        return res.status(403).json({ success: false, message: `Your current plan does not support ${featureName}. Please upgrade.` });
      }

      if (limit === -1) {
        // Unlimited
        req.aiUsageData = { subscription, recruiterAiUsage: null, featureName };
        return next();
      }
      
      // 2. Find or create AI usage for the current billing cycle
      let aiUsage = withLegacyId(await prisma.recruiterAiUsage.findFirst({
        where: {
          recruiterId: userId,
          subscriptionId: subscription.id,
          periodStart: { lte: now },
          periodEnd: { gte: now },
        },
        orderBy: [{ periodStart: 'desc' }, { id: 'desc' }],
      }));

      if (!aiUsage) {
        let pStart = new Date(subscription.startDate);
        let pEnd = new Date(subscription.endDate);
        
        if (subscription.durationMonths > 1) {
          const now = new Date();
          const monthsPassed = (now.getFullYear() - pStart.getFullYear()) * 12 + now.getMonth() - pStart.getMonth();
          pStart.setMonth(pStart.getMonth() + monthsPassed);
          pEnd = new Date(pStart);
          pEnd.setMonth(pEnd.getMonth() + 1);
        }

        aiUsage = withLegacyId(await prisma.recruiterAiUsage.create({
          data: {
            recruiterId: userId,
            subscriptionId: subscription.id,
            periodStart: pStart,
            periodEnd: pEnd,
            usage: {},
          },
        }));
      }

      const usage = aiUsage.usage && typeof aiUsage.usage === 'object' ? aiUsage.usage : {};
      const currentUsage = Number(usage[featureName] || 0);

      if (currentUsage >= limit) {
        const remaining = Math.max(0, limit - currentUsage);
        return res.status(403).json({ success: false, message: `Limit exceeded for ${featureName}. You have ${remaining}/${limit} requests remaining.` });
      }

      // 3. Pass data to route and increment after success
      req.aiUsageData = { subscription, recruiterAiUsage: aiUsage, featureName };
      
      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 400 && !res.locals.skipAiLimitIncrement) {
          try {
            await incrementJsonCounter('recruiterAiUsage', aiUsage.id, featureName);
          } catch (err) {
            console.error('Failed to increment AI usage:', err);
          }
        }
      });
      
      next();
    } catch (error) {
      console.error('Check AI Limit Error:', error);
      res.status(500).json({ success: false, message: 'Internal server error checking AI limit.' });
    }
  };
};

module.exports = {
  checkRecruiterAiLimit
};
