const cron = require('node-cron');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const RecruiterProfile = require('../models/RecruiterProfile');
const prisma = require('../config/prisma');
const { mapUserSubscription, mapProviderSubscription, findProviderSubscription, updateUserSubscription, updateProviderSubscription, updateProviderPlanProfile } = require('../services/billingPersistenceService');
const MatchLog = require('../models/MatchLog');
const JobPost = require('../models/JobPost');
const RecruiterHireEmbedding = require('../models/RecruiterHireEmbedding');
const ProviderEmbedding = require('../models/ProviderEmbedding');
const { sendWhatsAppMessage, formatPhoneNumber } = require('./messaging');
const { clearUserBadge } = require('../services/badgeService');
const { createNotification } = require('../services/notificationService');
const { createWhatsappLog } = require('../services/auditPersistenceService');
const { findNotification } = require('../services/communicationPersistenceService');
const { enqueueJob } = require('../services/queueService');
const { JOB_QUEUES, JOB_NAMES } = require('../queues/jobNames');
const { sendMail } = require('../services/mailService');
const { cosineSimilarity } = require('../services/ai/vectorSearchService');

const escapeRegex = (str) => String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Check subscription expiry and send renewal reminders
 * Runs daily at 9:00 AM
 */
const startCronJobs = () => {
  // Daily renewal check at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running daily renewal check...');
    try {
      await checkProviderRenewals();
      await checkRecruiterRenewals();
      await sendPlanExpiryReminders();
      await sendProviderRenewalReminders();
      await revertExpiredSubscriptions();
    } catch (err) {
      console.error('[CRON] Renewal check error:', err.message);
    }
  });

  // Daily ATS Job Sync (Crawler) at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    if (String(process.env.ENABLE_SYNC_ENGINE || '').toLowerCase() !== 'true'
      || String(process.env.ENABLE_CONNECTORS || '').toLowerCase() !== 'true'
      || String(process.env.ENABLE_CRAWLERS || '').toLowerCase() !== 'true') {
      console.log('[CRON] ATS sync disabled; skipping autonomous sync.');
      return;
    }
    console.log('[CRON] Starting autonomous ATS Job Sync Crawler...');
    try {
      const { runDailySync } = require('../modules/syncEngine/syncEngine.service');
      await runDailySync();
      console.log('[CRON] Autonomous ATS Job Sync Crawler completed.');
    } catch (err) {
      console.error('[CRON] Crawler sync error:', err.message);
    }
  });

  // Rotation pool cleanup and hourly matching alert dispatches every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await cleanupExpiredProfiles();
    } catch (err) {
      console.error('[CRON] Cleanup error:', err.message);
    }
    try {
      await runHourlyMatchingAndAlerts();
    } catch (err) {
      console.error('[CRON] Matching and alerts error:', err.message);
    }
  });

  // Daily external jobs sync at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    if (String(process.env.ENABLE_SYNC_ENGINE || '').toLowerCase() !== 'true'
      || String(process.env.ENABLE_CONNECTORS || '').toLowerCase() !== 'true') {
      console.log('[CRON] Daily ingestion sync disabled; skipping.');
      return;
    }
    console.log('[CRON] Running daily job ingestion sync...');
    try {
      const { runDailySync } = require('../modules/syncEngine/syncEngine.service');
      await runDailySync();
    } catch (err) {
      console.error('[CRON] Daily job ingestion sync error:', err.message);
    }
  });

  // Daily SEO pages and sitemap generation at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    if (String(process.env.ENABLE_SEO_AUTOMATION || '').toLowerCase() !== 'true') {
      console.log('[CRON] SEO automation disabled; skipping daily SEO page generation.');
      return;
    }
    console.log('[CRON] Running daily SEO page generation...');
    try {
      const { generateSEOPages } = require('../services/SeoEngineService');
      await generateSEOPages();
    } catch (err) {
      console.error('[CRON] SEO page generation error:', err.message);
    }
  });

  // Daily demand spike analysis for boost suggestions
  cron.schedule('30 1 * * *', async () => {
    try {
      await enqueueJob({
        queueName: JOB_QUEUES.ANALYTICS,
        jobName: JOB_NAMES.DEMAND_SPIKE_ANALYSIS,
        payload: {},
        relatedEntityType: 'demand_snapshot',
        relatedEntityId: 'daily',
        idempotencyKey: `demand-spike:${new Date().toISOString().slice(0, 10)}`,
      });
    } catch (err) {
      console.error('[CRON] Demand spike analysis enqueue failed:', err.message);
    }
  });

  // Periodic fraud review
  cron.schedule('*/30 * * * *', async () => {
    try {
      await enqueueJob({
        queueName: JOB_QUEUES.ANALYTICS,
        jobName: JOB_NAMES.FRAUD_REVIEW,
        payload: {},
        relatedEntityType: 'fraud_review',
        relatedEntityId: 'periodic',
        idempotencyKey: `fraud-review:${new Date().toISOString().slice(0, 13)}`,
      });
    } catch (err) {
      console.error('[CRON] Fraud review enqueue failed:', err.message);
    }
  });

  // Trust score recalculation
  cron.schedule('0 */4 * * *', async () => {
    try {
      await enqueueJob({
        queueName: JOB_QUEUES.ANALYTICS,
        jobName: JOB_NAMES.TRUST_SCORE_RECALC,
        payload: {},
        relatedEntityType: 'trust_score',
        relatedEntityId: 'batch',
        idempotencyKey: `trust-recalc:${new Date().toISOString().slice(0, 13)}`,
      });
    } catch (err) {
      console.error('[CRON] Trust recalculation enqueue failed:', err.message);
    }
  });

  console.log('[CRON] Scheduled jobs started');
};

async function checkProviderRenewals() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 30-day reminder
  const providers30 = await ProviderProfile.find({
    profileExpiresAt: { $lte: thirtyDaysFromNow, $gt: sevenDaysFromNow },
    renewalReminderSent: false,
  }).populate('user', 'name phone whatsappNumber isWhatsappSameAsMobile whatsappAlerts');

  for (const profile of providers30) {
    const user = profile.user;
    if (!user) continue;

    profile.renewalReminderSent = true;
    await profile.save();

    const phone = user.isWhatsappSameAsMobile ? user.phone : (user.whatsappNumber || user.phone);
    if (phone && user.whatsappAlerts !== false) {
      try {
        await sendWhatsAppMessage(phone, 'renewal_reminder', {
          name: user.name,
          expiresAt: profile.profileExpiresAt.toLocaleDateString(),
        });
        await createWhatsappLog({
          user: user._id,
          phone,
          templateName: 'renewal_reminder',
          message: `30-day renewal reminder for ${user.name}`,
          status: 'sent',
          triggerEvent: 'renewal_reminder_30d',
        });
      } catch (err) {
        console.error(`[CRON] WhatsApp renewal reminder failed for ${user.name}:`, err.message);
      }
    }
  }

  // 7-day urgent reminder
  const providers7 = await ProviderProfile.find({
    profileExpiresAt: { $lte: sevenDaysFromNow, $gt: now },
    renewalReminderSent: true, // already got 30-day reminder
  }).populate('user', 'name phone whatsappNumber isWhatsappSameAsMobile whatsappAlerts');

  for (const profile of providers7) {
    const user = profile.user;
    if (!user) continue;

    const phone = user.isWhatsappSameAsMobile ? user.phone : (user.whatsappNumber || user.phone);
    if (phone) {
      try {
        await sendWhatsAppMessage(phone, 'renewal_urgent', {
          name: user.name,
          daysLeft: Math.ceil((profile.profileExpiresAt - now) / (24 * 60 * 60 * 1000)),
        });
        await createWhatsappLog({
          user: user._id,
          phone,
          templateName: 'renewal_urgent',
          message: `7-day urgent renewal reminder for ${user.name}`,
          status: 'sent',
          triggerEvent: 'renewal_reminder_7d',
        });
      } catch (err) {
        console.error(`[CRON] WhatsApp urgent reminder failed for ${user.name}:`, err.message);
      }
    }
  }

  console.log(`[CRON] Provider renewals: ${providers30.length} (30d), ${providers7.length} (7d)`);
}

async function sendPlanExpiryReminders() {
  const now = new Date();
  const maxWindow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const subscriptions = (await prisma.userSubscription.findMany({
    where: { status: 'active', endDate: { gt: now, lte: maxWindow } },
    include: { userIdRecord: { select: { id: true, name: true } }, planIdRecord: { select: { id: true, name: true } } },
  })).map(mapUserSubscription);

  const milestones = [30, 7, 1];
  let sent = 0;

  for (const sub of subscriptions) {
    if (!sub.userId || !sub.planId) continue;

    const daysLeft = Math.ceil((sub.endDate - now) / (24 * 60 * 60 * 1000));
    const milestone = milestones.find((d) => daysLeft <= d && daysLeft > d - 1);
    if (!milestone) continue;

    const existing = await findNotification({
      userId: String(sub.userId._id),
      type: 'PLAN_EXPIRY_REMINDER',
      AND: [
        { data: { path: ['subscriptionId'], equals: String(sub._id) } },
        { data: { path: ['milestoneDays'], equals: milestone } },
      ],
    });

    if (existing) continue;

    await createNotification({
      userId: sub.userId._id,
      type: 'PLAN_EXPIRY_REMINDER',
      title: 'Plan Expiry Reminder',
      message: `Your ${sub.planId.name} plan expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
      data: {
        subscriptionId: sub._id,
        planId: sub.planId._id,
        milestoneDays: milestone,
        daysLeft,
        expiresAt: sub.endDate,
      },
    });
    sent += 1;
  }

  if (sent > 0) {
    console.log(`[CRON] Sent ${sent} in-app plan expiry reminders`);
  }
}

async function checkRecruiterRenewals() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const recruiters = await RecruiterProfile.find({
    profileExpiresAt: { $lte: thirtyDaysFromNow, $gt: now },
    renewalReminderSent: false,
  }).populate('user', 'name phone whatsappNumber isWhatsappSameAsMobile whatsappAlerts');

  for (const profile of recruiters) {
    const user = profile.user;
    if (!user) continue;

    profile.renewalReminderSent = true;
    await profile.save();

    const phone = user.isWhatsappSameAsMobile ? user.phone : (user.whatsappNumber || user.phone);
    if (phone && user.whatsappAlerts !== false) {
      try {
        await sendWhatsAppMessage(phone, 'renewal_reminder', {
          name: user.name,
          expiresAt: profile.profileExpiresAt.toLocaleDateString(),
        });
        await createWhatsappLog({
          user: user._id,
          phone,
          templateName: 'renewal_reminder',
          message: `Renewal reminder for recruiter ${user.name}`,
          status: 'sent',
          triggerEvent: 'renewal_reminder_recruiter',
        });
      } catch (err) {
        console.error(`[CRON] WhatsApp recruiter reminder failed:`, err.message);
      }
    }
  }

  console.log(`[CRON] Recruiter renewals: ${recruiters.length}`);
}

async function cleanupExpiredProfiles() {
  const now = new Date();

  // Deactivate expired provider profiles (remove from rotation pool)
  const expired = await ProviderProfile.find({
    profileExpiresAt: { $lt: now },
    inRotationPool: true,
  });

  for (const profile of expired) {
    profile.inRotationPool = false;
    profile.isTopCity = false;
    await profile.save();

    // Remove from rotation pools
    const RotationPool = require('../models/RotationPool');
    await RotationPool.updateMany(
      {},
      { $pull: { providers: { provider: profile._id } } }
    );
  }

  if (expired.length > 0) {
    console.log(`[CRON] Removed ${expired.length} expired providers from rotation pools`);
  }
}

/**
 * Revert expired subscriptions to the free plan.
 * Marks expired UserSubscription records and assigns a free plan.
 */
async function revertExpiredSubscriptions() {
  const now = new Date();
  const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
  const expiredDateLimit = new Date(now.getTime() - gracePeriodMs);
  // Handle UserSubscription (mainly recruiters or older logic) with 3-day grace period
  const expiredSubs = (await prisma.userSubscription.findMany({
    where: { status: 'active', endDate: { lt: expiredDateLimit } },
    include: { userIdRecord: { select: { id: true } } },
  })).map(mapUserSubscription);

  for (const sub of expiredSubs) {
    sub.status = 'expired';
    await updateUserSubscription(sub._id, { status: 'expired' });
    if (sub.userId) {
       await clearUserBadge(sub.userId._id);
       // old logic reset profile plan to free if provider
    }
  }

  // Handle ProviderSubscription (New specific logic) with 3-day grace period
  const expiredProviderSubs = (await prisma.providerSubscription.findMany({
    where: { subscriptionStatus: 'active', endDate: { lt: expiredDateLimit } },
  })).map(mapProviderSubscription);

  for (const sub of expiredProviderSubs) {
    if (sub.isAutoRenew) {
      const months = sub.durationMonths || 1;
      const durationMs = months * 30 * 24 * 60 * 60 * 1000;
      sub.startDate = now;
      sub.endDate = new Date(now.getTime() + durationMs);
      sub.subscriptionStatus = 'active';
      sub.paymentStatus = 'paid';
      await updateProviderSubscription(sub._id, {
        startDate: sub.startDate, endDate: sub.endDate, subscriptionStatus: 'active', paymentStatus: 'paid',
      });

      await updateProviderPlanProfile(sub.providerId, {
        boostedUntil: sub.endDate,
        isActiveSubscription: true,
        inRotationPool: true,
      });

      console.log(`[CRON] Auto-renewed subscription ${sub._id} for provider ${sub.providerId} for ${months} month(s).`);
      continue;
    }

    sub.subscriptionStatus = 'expired';
    await updateProviderSubscription(sub._id, { subscriptionStatus: 'expired' });

    // Check if there is a paused subscription
    const pausedSub = await findProviderSubscription({
      providerId: sub.providerId,
      subscriptionStatus: 'paused',
      paymentStatus: 'paid',
      remainingDurationMs: { gt: 0 },
    }, { orderBy: { updatedAt: 'desc' } });

    if (pausedSub) {
      const newEndDate = new Date(now.getTime() + pausedSub.remainingDurationMs);
      pausedSub.subscriptionStatus = 'active';
      pausedSub.startDate = now;
      pausedSub.endDate = newEndDate;
      pausedSub.remainingDurationMs = 0;
      await updateProviderSubscription(pausedSub._id, {
        subscriptionStatus: 'active', startDate: now, endDate: newEndDate, remainingDurationMs: 0,
      });

      const boostWeightByLevel = {
        country_top: 5,
        city_top: 4,
        pincode_top: 3,
        custom: 4,
        basic: 1,
      };
      const visibilityLevel = pausedSub.planSnapshot.visibilityLevel || 'basic';

      await updateProviderPlanProfile(sub.providerId, {
        currentPlan: pausedSub.planSnapshot.slug,
        activePlanId: pausedSub.planId,
        activeSubscriptionId: pausedSub._id,
        visibilityLevel: visibilityLevel,
        boostedUntil: newEndDate,
        allowedSkillsCount: Number(pausedSub.planSnapshot.maxSkills || 1),
        allowedPincodesCount: Number(pausedSub.planSnapshot.maxPincodes || 1),
        allowedCitiesCount: Number(pausedSub.planSnapshot.maxCities || 1),
        planCoverageType: pausedSub.planSnapshot.coverageType || 'pincode',
        isTopInPincode: visibilityLevel === 'pincode_top',
        isTopInCity: visibilityLevel === 'city_top',
        isTopInCountry: visibilityLevel === 'country_top',
        isActiveSubscription: true,
        inRotationPool: true,
        priorityWeight: Number(pausedSub.priorityWeight || 0),
        boostWeight: Number(boostWeightByLevel[visibilityLevel] || 1),
        customConfig: null,
      });
      console.log(`[CRON] Reactivated paused subscription ${pausedSub._id} for provider ${sub.providerId}`);
    } else {
      await updateProviderPlanProfile(sub.providerId, {
        activePlanId: null,
        activeSubscriptionId: null,
        visibilityLevel: 'basic',
        boostedUntil: null,
        isTopInPincode: false,
        isTopInCity: false,
        isTopInCountry: false,
        isActiveSubscription: false,
        inRotationPool: false,
        priorityWeight: 0,
        boostWeight: 0,
        customConfig: null,
      });
    }
  }
}

async function runHourlyMatchingAndAlerts() {
  console.log('[CRON] Running hourly matching and alert dispatch...');
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // 1. Get new active jobs posted in the last 1 hour
  const newJobs = await JobPost.find({
    status: 'active',
    createdAt: { $gte: oneHourAgo },
  }).populate('recruiter');

  for (const job of newJobs) {
    try {
      const recruiterId = job.recruiter?._id || job.recruiter;
      if (!recruiterId) continue;

      const recruiterProfile = await RecruiterProfile.findOne({ user: recruiterId });
      if (!recruiterProfile) continue;

      const isFree = recruiterProfile.currentPlan === 'free' || !recruiterProfile.currentPlan;

      // Gate check for paid plans
      if (!isFree && recruiterProfile.unlocksRemaining <= 0) {
        console.log(`[CRON] Recruiter ${recruiterId} has no credits remaining. Skipping alerts for job ${job._id}.`);
        continue;
      }

      // 2. Find matching provider candidates
      // We start by finding all approved providers whose skills match the job skill (regex)
      const providers = await ProviderProfile.find({
        isApproved: true,
        skills: { $regex: escapeRegex(job.skill), $options: 'i' },
      }).populate('user');

      if (providers.length === 0) continue;

      // Apply unskilled city filtering rules
      const filteredProviders = providers.filter(provider => {
        const tier = String(provider.tier || 'unskilled').toLowerCase();
        if (tier === 'unskilled') {
          // Strict city filter
          const cityQuery = String(job.city || '').trim().toLowerCase();
          const matchesCity = 
            String(provider.city || '').toLowerCase().includes(cityQuery) || 
            String(provider.nearestLocation || '').toLowerCase().includes(cityQuery) ||
            (Array.isArray(provider.locations) && provider.locations.some(loc => String(loc).toLowerCase().includes(cityQuery)));
          return matchesCity;
        }
        return true;
      });

      if (filteredProviders.length === 0) continue;

      // 3. Get job embedding
      const jobEmbedding = await RecruiterHireEmbedding.findOne({
        recruiterId,
        sourceType: 'job_intent',
        referenceId: String(job._id),
      }).lean();

      let scoredProviders = [];

      if (jobEmbedding && Array.isArray(jobEmbedding.vector) && jobEmbedding.vector.length > 0) {
        // Fetch provider embeddings for our matching providers
        const providerUserIds = filteredProviders.map(p => p.user?._id || p.user).filter(Boolean);
        const providerEmbeddings = await ProviderEmbedding.find({
          providerId: { $in: providerUserIds },
        }).lean();

        const embeddingMap = new Map(providerEmbeddings.map(e => [String(e.providerId), e.vector]));

        scoredProviders = filteredProviders.map(provider => {
          const userId = String(provider.user?._id || provider.user);
          const pVector = embeddingMap.get(userId);
          const similarityScore = pVector ? cosineSimilarity(jobEmbedding.vector, pVector) : 0;
          return {
            provider,
            score: similarityScore,
          };
        });
      } else {
        // Fallback if no embedding is generated yet
        scoredProviders = filteredProviders.map(provider => ({
          provider,
          score: 0.5, // neutral fallback score
        }));
      }

      // Sort by similarity score descending
      scoredProviders.sort((a, b) => b.score - a.score);

      // Determine alert limit
      const limit = isFree ? 3 : Math.min(scoredProviders.length, recruiterProfile.unlocksRemaining);

      const selectedMatches = scoredProviders.slice(0, limit);

      for (const match of selectedMatches) {
        const provider = match.provider;
        const providerUser = provider.user;
        if (!providerUser || !providerUser.email) continue;

        // Duplicate check using MatchLog
        const hasAlerted = await MatchLog.exists({
          jobId: job._id,
          providerId: providerUser._id,
        });

        if (hasAlerted) {
          console.log(`[CRON] Match already alerted for Job: ${job._id}, Provider: ${providerUser._id}. Skipping.`);
          continue;
        }

        // Send Email Alert
        try {
          const appName = process.env.EMAIL_FROM_NAME || 'ServiceHub';
          const subject = `[New Job Match] ${job.title} in ${job.city}`;
          const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 520px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #4f46e5; margin-bottom: 16px;">New Job Alert!</h2>
              <p>Hi ${providerUser.name},</p>
              <p>We found a new job posting that matches your expertise:</p>
              <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0; color: #1f2937;">${job.title}</h3>
                <p style="margin: 0 0 4px 0;"><strong>Speciality:</strong> ${job.skill}</p>
                <p style="margin: 0 0 4px 0;"><strong>Location:</strong> ${job.locality || ''}, ${job.city}</p>
                <p style="margin: 0 0 8px 0;"><strong>Description:</strong> ${job.description.slice(0, 150)}...</p>
              </div>
              <p>Log in to your ${appName} dashboard to view details and apply.</p>
              <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">– The ${appName} Team</p>
            </div>
          `;

          await sendMail({
            to: providerUser.email,
            subject,
            html,
          });

          // Log match
          await MatchLog.create({
            jobId: job._id,
            providerId: providerUser._id,
            recruiterId,
            alertType: 'email',
          });

          console.log(`[CRON] Dispatched email alert to ${providerUser.email} for Job: ${job._id}`);
        } catch (mailErr) {
          console.error(`[CRON] Email alert failed for provider ${providerUser.email}:`, mailErr.message);
        }


        // Deduct recruiter credit if not free
        if (!isFree) {
          recruiterProfile.unlocksRemaining = Math.max(0, recruiterProfile.unlocksRemaining - 1);
          recruiterProfile.totalUnlocks += 1;
          await recruiterProfile.save();

          // Sync active UserSubscription record
          // Outreach remains on its existing persistence path until its own batch.
          const UserSubscription = require('../models/UserSubscription');
          const activeSub = await UserSubscription.findOne({
            userId: recruiterId,
            role: 'recruiter',
            status: 'active',
            endDate: { $gt: new Date() },
          });

          if (activeSub) {
            activeSub.unlockCreditsRemaining = Math.max(0, activeSub.unlockCreditsRemaining - 1);
            activeSub.unlockCreditsUsed += 1;
            await activeSub.save();
          }
        }
      }
    } catch (jobErr) {
      console.error(`[CRON] Error processing matching and alerts for Job ${job._id}:`, jobErr.message);
    }
  }
}

async function sendProviderRenewalReminders() {
  const now = new Date();
  const maxWindow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const subscriptions = (await prisma.providerSubscription.findMany({
    where: { subscriptionStatus: 'active', isAutoRenew: true, endDate: { gt: now, lte: maxWindow } },
    include: { providerIdRecord: { select: { id: true, name: true, email: true } } },
  })).map(mapProviderSubscription);

  const milestones = [3, 2, 1];

  for (const sub of subscriptions) {
    if (!sub.providerId || !sub.providerId.email) continue;

    const daysLeft = Math.ceil((sub.endDate - now) / (24 * 60 * 60 * 1000));
    const milestone = milestones.find((d) => daysLeft === d);
    if (!milestone) continue;

    const existing = await findNotification({
      userId: String(sub.providerId._id),
      type: 'PROVIDER_RENEWAL_REMINDER',
      AND: [
        { data: { path: ['subscriptionId'], equals: String(sub._id) } },
        { data: { path: ['milestoneDays'], equals: milestone } },
      ],
    });

    if (existing) continue;

    const appName = process.env.EMAIL_FROM_NAME || 'ServiceHub';
    const amount = sub.finalAmount || sub.totalAmount || sub.subtotal || 0;
    const currency = sub.currency || 'INR';
    const planName = sub.planSnapshot?.name || 'Subscription Plan';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-bottom: 20px;">Subscription Auto-Renewal Reminder</h2>
        <p>Hi ${sub.providerId.name},</p>
        <p>This is a reminder that your <strong>${planName}</strong> will automatically renew in <strong>${milestone} day${milestone > 1 ? 's' : ''}</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 20px; margin-top: 20px;">
          <p style="margin: 0 0 10px 0;"><strong>Renewal Date:</strong> ${sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}</p>
          <p style="margin: 0 0 10px 0;"><strong>Amount to be charged:</strong> ${currency} ${amount}</p>
        </div>
        
        <p>If you wish to manage or cancel your subscription, please log in to your dashboard before the renewal date.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Thank you for choosing ${appName}.<br/>
          Need help? Contact support@lucohire.com
        </p>
      </div>
    `;

    try {
      await sendMail({
        to: sub.providerId.email,
        subject: `Upcoming Subscription Renewal - ${milestone} day${milestone > 1 ? 's' : ''} left`,
        html,
      });

      await createNotification({
        userId: sub.providerId._id,
        type: 'PROVIDER_RENEWAL_REMINDER',
        title: 'Subscription Auto-Renewal Reminder',
        message: `Your ${planName} will automatically renew in ${milestone} day${milestone > 1 ? 's' : ''}.`,
        data: {
          subscriptionId: sub._id,
          milestoneDays: milestone,
          daysLeft,
        },
      });
      console.log(`[CRON] Sent ${milestone}-day renewal reminder email to ${sub.providerId.email}`);
    } catch (err) {
      console.error(`[CRON] Failed to send renewal reminder email to ${sub.providerId.email}:`, err.message);
    }
  }
}

module.exports = { startCronJobs, runHourlyMatchingAndAlerts, sendProviderRenewalReminders };
