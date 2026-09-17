const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { incrementJsonCounter } = require('../services/aiUsageCounterService');

const checkAiLimit = (featureName) => {
  return async (req, res, next) => {
    try {
      const userId = String(req.user.id || req.user._id);
      
      // Special exemption for specific user
      const userDoc = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (userDoc && userDoc.email === 'dfnokh@gmail.com') {
         req.aiUsageData = { subscription: null, providerAiUsage: null, featureName };
         return next();
      }

      // 1. Find active provider subscription
      const now = new Date();
      const subscriptionRecord = await prisma.providerSubscription.findFirst({
        where: {
          providerId: userId,
          subscriptionStatus: 'active',
          endDate: { gt: now },
        },
        include: { planIdRecord: true },
        orderBy: [{ endDate: 'desc' }, { id: 'desc' }],
      });
      const subscription = withLegacyId(subscriptionRecord);

      if (!subscription || !subscriptionRecord.planIdRecord) {
        return res.status(403).json({ success: false, message: 'No active AI plan found. Please upgrade your plan.' });
      }

      const planObj = withLegacyId(subscriptionRecord.planIdRecord);
      
      // Check if feature limit exists in plan
      let limit = planObj.aiLimits && planObj.aiLimits[featureName] !== undefined ? planObj.aiLimits[featureName] : 0;

      // Fallback for AI feature keys that might use alternate names in the database
      if (limit === 0 && planObj.aiLimits) {
        const fallbackMapping = {
          refreshInsight: ['interviewQuestionsRefresh', 'careerGpsRefresh', 'whyNotHiredRefresh', 'skillGapRefresh', 'aiCareerAnalysis'],
          careerHealth: ['careerHealthRefresh', 'aiCareerAnalysis'],
          careerReport: ['aiTipsRefresh', 'autoAnalysisLimit', 'aiCareerAnalysis'],
          resumeImprovement: ['resumeOptimization', 'resumeScoreRefresh'],
          careerGps: ['careerGpsRefresh'],
          mockInterview: ['interviewQuestionsRefresh'],
          salaryInsights: ['autoAnalysisLimit'],
          atsScore: ['atsOptimizerRefresh'],
          skillGapReport: ['skillGapRefresh'],
          whyNotHired: ['whyNotHiredRefresh'],
          interviewCallProb: ['autoAnalysisLimit'],
        };
        const fallbacks = fallbackMapping[featureName] || [];
        for (const fKey of fallbacks) {
          if (planObj.aiLimits[fKey]) {
            limit = planObj.aiLimits[fKey];
            break;
          }
        }
      }
      
      if (limit === 0) {
        return res.status(403).json({ success: false, message: `Your current plan does not support ${featureName}. Please upgrade.` });
      }

      if (limit === -1) {
        // Unlimited
        req.aiUsageData = { subscription, providerAiUsage: null, featureName };
        return next();
      }
      
      // 2. Find or create AI usage for the current billing cycle
      let aiUsage = withLegacyId(await prisma.providerAiUsage.findFirst({
        where: {
          providerId: userId,
          subscriptionId: subscription.id,
          periodStart: { lte: now },
          periodEnd: { gte: now },
        },
        orderBy: [{ periodStart: 'desc' }, { id: 'desc' }],
      }));

      if (!aiUsage) {
        // If not found, it means it's a new cycle or first time. Let's create one.
        // Assume period starts from subscription startDate and ends at endDate for now.
        // Realistically, for recurring, this should align with the current month.
        // For simplicity, we track it for the duration of this specific active subscription period.
        
        let pStart = new Date(subscription.startDate);
        let pEnd = new Date(subscription.endDate);
        
        // If the subscription is long (e.g. 1 year) and resets monthly, we need to calculate current month
        if (subscription.durationMonths > 1) {
          const now = new Date();
          const monthsPassed = (now.getFullYear() - pStart.getFullYear()) * 12 + now.getMonth() - pStart.getMonth();
          pStart.setMonth(pStart.getMonth() + monthsPassed);
          pEnd = new Date(pStart);
          pEnd.setMonth(pEnd.getMonth() + 1);
        }

        aiUsage = withLegacyId(await prisma.providerAiUsage.create({
          data: {
            providerId: userId,
            subscriptionId: subscription.id,
            periodStart: pStart,
            periodEnd: pEnd,
            usage: {},
          },
        }));
      }

      const isCachedOnly = req.body?.cachedOnly || req.query?.cachedOnly === 'true' || req.query?.cachedOnly === true;

      const usage = aiUsage.usage && typeof aiUsage.usage === 'object' ? aiUsage.usage : {};
      const currentUsage = Number(usage[featureName] || 0);

      if (currentUsage >= limit && !isCachedOnly) {
        return res.status(403).json({ success: false, message: `Limit exceeded for ${featureName}. You have used ${currentUsage}/${limit} requests.` });
      }

      // 3. Pass data to route and increment after success
      req.aiUsageData = { subscription, providerAiUsage: aiUsage, featureName };
      
      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 400 && !res.locals.skipAiLimitIncrement && !isCachedOnly) {
          try {
            await incrementJsonCounter('providerAiUsage', aiUsage.id, featureName);
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
  checkAiLimit
};
