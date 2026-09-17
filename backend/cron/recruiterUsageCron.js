const cron = require('node-cron');
const RecruiterSubscription = require('../models/RecruiterSubscription');
const RecruiterProfile = require('../models/RecruiterProfile');

const resetRecruiterUsage = async () => {
  try {
    const now = new Date();
    // Find active subscriptions that are monthly reset cycle and multi-month duration
    const subscriptions = await RecruiterSubscription.find({
      subscriptionStatus: 'active',
      usageResetCycle: 'monthly',
      durationMonths: { $gt: 1 },
      endDate: { $gt: now }
    });

    for (const sub of subscriptions) {
      if (!sub.lastUsageResetAt) {
        sub.lastUsageResetAt = sub.startDate;
        await sub.save();
        continue;
      }

      // Calculate when the next reset should happen (1 month after last reset)
      const nextResetDate = new Date(sub.lastUsageResetAt);
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);

      if (now >= nextResetDate) {
        // Time to reset!
        const profile = await RecruiterProfile.findOne({ user: sub.recruiterId });
        if (profile) {
          // Reset limits exactly to the monthly quota from the snapshot
          profile.unlocksRemaining = sub.planSnapshot.unlockCredits || 0;
          
          if (sub.planSnapshot.aiLimits) {
            profile.boostJobsRemaining = sub.planSnapshot.aiLimits.jobBoostJobsLimit || 0;
            profile.boostDaysRemaining = sub.planSnapshot.aiLimits.jobBoostDaysLimit || 0;
            profile.jobPostLimitRemaining = sub.planSnapshot.aiLimits.jobPostLimit || 0;
            profile.outreachCampaignsRemaining = sub.planSnapshot.aiLimits.outreachCampaigns || 0;
            profile.directMessagingRemaining = sub.planSnapshot.aiLimits.directMessaging || 0;
            profile.aiJdGeneratorRemaining = sub.planSnapshot.aiLimits.aiJdGenerator || 0;
            profile.aiJdParsingRemaining = sub.planSnapshot.aiLimits.aiJdParsing || 0;
            profile.aiCopilotRemaining = sub.planSnapshot.aiLimits.aiCopilot || 0;
            profile.interviewKitsRemaining = sub.planSnapshot.aiLimits.interviewKits || 0;
            profile.customReportsRemaining = sub.planSnapshot.aiLimits.customReports || 0;
          }

          await profile.save();
        }

        sub.lastUsageResetAt = now;
        await sub.save();
        console.log(`[RecruiterUsageCron] Reset monthly credits for recruiter ${sub.recruiterId}`);
      }
    }
  } catch (error) {
    console.error('[RecruiterUsageCron] Error processing usage resets:', error);
  }
};

// Run daily at midnight
const initRecruiterUsageCron = () => {
  cron.schedule('0 0 * * *', () => {
    console.log('[Cron] Running Recruiter Monthly Usage Reset task...');
    resetRecruiterUsage();
  });
};

module.exports = {
  initRecruiterUsageCron,
  resetRecruiterUsage
};
