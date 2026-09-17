const crypto = require('crypto');
const ProviderProfile = require('../../models/ProviderProfile');
const ProviderAiUsage = require('../../models/ProviderAiUsage');
const ProviderSubscription = require('../../models/ProviderSubscription');
const logger = require('../../utils/logger');
const { getCachedCareerHealth, setCachedCareerHealth } = require('./careerHealthCache.service');
const { generateCareerHealthReport } = require('./careerHealthLLM.service');

const { setAiFeatureCache } = require('./mongoCacheHelper');
const { getCareerGPSAnalysis, getHiringBarriersAnalysis, getSkillGapAnalysis, getAICareerReportAnalysis, getIncomeOpportunitiesAnalysis, getInterviewQuestionsAnalysis } = require('./growWithAILLM.service');

async function triggerAutoAnalysis(userId, parsedData, force = false) {
  try {
    const profile = await ProviderProfile.findOne({ user: userId });
    if (!profile) return;
    
    if (!parsedData) {
      const { resolveUserData } = require('../../utils/aiResolution');
      const resolved = await resolveUserData(userId);
      if (resolved.error) {
        logger.warn(`[AutoAnalyzer] Could not resolve data for ${userId}: ${resolved.error}`);
        return;
      }
      parsedData = resolved.dataToAnalyze;
    }

    // 1. Check usage limits
    const subscription = await ProviderSubscription.findOne({
      providerId: userId,
      subscriptionStatus: 'active',
      endDate: { $gt: new Date() },
    }).populate('planId');

    let isUnlimited = false;
    let limit = 3; // Free limit

    if (subscription && subscription.planId) {
       const plan = subscription.planId;
       const planObj = plan.toObject ? plan.toObject() : plan;
       limit = planObj.aiLimits && planObj.aiLimits.autoAnalysisLimit !== undefined ? planObj.aiLimits.autoAnalysisLimit : 3;
       if (limit === -1) {
         isUnlimited = true;
       }
    }

    let pStart = new Date();
    pStart.setDate(1); // simplified period start
    let pEnd = new Date();
    pEnd.setMonth(pEnd.getMonth() + 1);

    if (subscription) {
      pStart = new Date(subscription.startDate);
      pEnd = new Date(subscription.endDate);
      if (subscription.durationMonths > 1) {
        const now = new Date();
        const monthsPassed = (now.getFullYear() - pStart.getFullYear()) * 12 + now.getMonth() - pStart.getMonth();
        pStart.setMonth(pStart.getMonth() + monthsPassed);
        pEnd = new Date(pStart);
        pEnd.setMonth(pEnd.getMonth() + 1);
      }
    }

    let aiUsage = await ProviderAiUsage.findOne({
      providerId: userId,
      periodStart: { $lte: new Date() },
      periodEnd: { $gte: new Date() }
    });

    if (!aiUsage) {
      aiUsage = await ProviderAiUsage.create({
        providerId: userId,
        subscriptionId: subscription ? subscription._id : null,
        periodStart: pStart,
        periodEnd: pEnd
      });
    }

    const currentUsage = aiUsage.usage['autoAnalysisLimit'] || 0;

    if (!isUnlimited && currentUsage >= limit) {
      logger.info(`[AutoAnalyzer] Limit exceeded for ${userId} (${currentUsage}/${limit}). Skipping background generation. Future requests will use cached result.`);
      return;
    }

    const targetHash = crypto.createHash('sha256').update(JSON.stringify(parsedData)).digest('hex');
    if (profile.lastAnalyzedHash === targetHash && !force) {
       return; // Already analyzed
    }

    logger.info(`[AutoAnalyzer] Generating AI features in background for ${userId}`);

    // Call generating functions (in background) - taking care not to block
    Promise.allSettled([
      generateCareerHealthReport(parsedData, null).then(res => res.used && setCachedCareerHealth(targetHash, res.output)),
      getCareerGPSAnalysis(parsedData, null).then(res => setAiFeatureCache('careerGPS', targetHash, `careerGPS:${targetHash}`, res)),
      getHiringBarriersAnalysis(parsedData, [], null).then(res => setAiFeatureCache('hiringBarriers', targetHash, `hiringBarriers:${targetHash}`, res)),
      getSkillGapAnalysis(parsedData, null).then(res => setAiFeatureCache('skillGap', targetHash, `skillGap:${targetHash}`, res)),
      getAICareerReportAnalysis(parsedData, null).then(res => setAiFeatureCache('careerReport', targetHash, `careerReport:${targetHash}`, res)),
      getIncomeOpportunitiesAnalysis(parsedData, null).then(res => setAiFeatureCache('incomeOpportunities', targetHash, `incomeOpportunities:${targetHash}`, res)),
      getInterviewQuestionsAnalysis(parsedData, 'technical', []).then(res => setAiFeatureCache('interviewQuestions', targetHash, `interviewQuestions:${targetHash}`, res))
    ]).then(async () => {
       // Update Profile hash and Increment Limit
       await ProviderProfile.updateOne({ user: userId }, { $set: { lastAnalyzedHash: targetHash } });
       
       if (!isUnlimited) {
         await ProviderAiUsage.updateOne(
            { _id: aiUsage._id },
            { $inc: { 'usage.autoAnalysisLimit': 1 } }
         );
       }
       logger.info(`[AutoAnalyzer] Completed generating AI features for ${userId}`);
    }).catch(err => {
       logger.error(`[AutoAnalyzer] Promise rejection: ${err.message}`);
    });

  } catch (err) {
    logger.error(`[AutoAnalyzer] Error: ${err.message}`);
  }
}

module.exports = { triggerAutoAnalysis };
