const cron = require('node-cron');
const ProviderSubscription = require('../models/ProviderSubscription');
const ProviderProfile = require('../models/ProviderProfile');
const { activatePaidSubscription } = require('../services/providerPlanService');

/**
 * Runs every hour:
 * 1. Expires subscriptions whose endDate has passed
 * 2. Resets profile visibility flags for expired plans
 * 3. Auto-activates queued plans whose parent subscription has expired
 */
const runSubscriptionExpiry = async () => {
  const now = new Date();
  console.log('[SubscriptionCron] Running at ' + now.toISOString());

  const expiredSubs = await ProviderSubscription.find({
    subscriptionStatus: 'active',
    endDate: { $lte: now }
  }).lean();

  if (expiredSubs.length === 0) {
    console.log('[SubscriptionCron] No subscriptions to expire.');
  }

  for (const sub of expiredSubs) {
    try {
      await ProviderSubscription.findByIdAndUpdate(sub._id, { subscriptionStatus: 'expired' });

      const resetFields = {};

      if (sub.planSnapshot && sub.planSnapshot.slug === 'whatsapp-alerts') {
        resetFields.whatsappFreelancePlanActive = false;
        resetFields.whatsappFreelancePlanExpiry = null;
      } else {
        resetFields.visibilityLevel = 'basic';
        resetFields.isTopInPincode = false;
        resetFields.isTopInCity = false;
        resetFields.isTopInCountry = false;
        resetFields.boostedUntil = null;
        resetFields.boostWeight = 1;
        resetFields.isActiveSubscription = false;
        resetFields.inRotationPool = false;
        resetFields.activePlanId = null;
        resetFields.activeSubscriptionId = null;
        resetFields.currentPlan = 'free';
      }

      if (Object.keys(resetFields).length > 0) {
        await ProviderProfile.findOneAndUpdate({ user: sub.providerId }, resetFields);
      }

      console.log('[SubscriptionCron] Expired sub ' + sub._id + ' for provider ' + sub.providerId);
    } catch (err) {
      console.error('[SubscriptionCron] Error expiring sub ' + sub._id + ':', err.message);
    }
  }

  const expiredProviderIds = [...new Set(expiredSubs.map(s => String(s.providerId)))];
  for (const providerId of expiredProviderIds) {
    try {
      const stillActive = await ProviderSubscription.findOne({
        providerId,
        subscriptionStatus: 'active',
        endDate: { $gt: now }
      });

      if (stillActive) continue;

      const queued = await ProviderSubscription.findOne({
        providerId,
        subscriptionStatus: 'pending',
        paymentStatus: 'paid'
      }).sort({ createdAt: 1 });

      if (queued) {
        await activatePaidSubscription(queued._id, {
          paymentId: queued.paymentId || 'queued_auto',
          orderId: queued.orderId || 'queued_order'
        });
        console.log('[SubscriptionCron] Auto-activated queued sub ' + queued._id + ' for provider ' + providerId);
      }
    } catch (err) {
      console.error('[SubscriptionCron] Error activating queued sub for provider ' + providerId + ':', err.message);
    }
  }

  await ProviderProfile.updateMany(
    { isTopInCity: true, boostedUntil: { $lte: now } },
    { isTopInCity: false, isTopInCountry: false, isTopInPincode: false, visibilityLevel: 'basic', boostWeight: 1 }
  );
};

const initSubscriptionCron = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      await runSubscriptionExpiry();
    } catch (err) {
      console.error('[SubscriptionCron] Fatal error:', err.message);
    }
  });
  console.log('[SubscriptionCron] Initialized - runs every hour.');
};

module.exports = { initSubscriptionCron, runSubscriptionExpiry };
