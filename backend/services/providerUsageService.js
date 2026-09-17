const prisma = require('../config/prisma');
const { findProviderProfileByUserId } = require('./providerProfilePersistenceService');
const providerPlanService = require('./providerPlanService');

const getProviderUsageSummary = async (providerId) => {
  const subscription = await providerPlanService.getActiveProviderSubscription(providerId);
  if (!subscription) {
    return {
      hasActivePlan: false,
      skills: { used: 0, max: 0 },
      locations: { used: 0, max: 0 },
      jobApplications: { used: 0, max: 0 }
    };
  }

  const limits = providerPlanService.getSubscriptionLimits(subscription);
  const usage = await providerPlanService.getOrCreateCurrentUsage(providerId, subscription);

  const maxLocations = Math.max(limits.maxPincodes || 0, limits.maxCities || 0);

  return {
    hasActivePlan: true,
    planName: subscription.planSnapshot.name,
    planCategory: subscription.planCategory,
    usageResetCycle: subscription.usageResetCycle,
    periodStart: usage.periodStart,
    periodEnd: usage.periodEnd,
    skills: {
      used: usage.skillsUsed,
      max: limits.maxSkills
    },
    locations: {
      used: usage.locationsUsed,
      max: maxLocations
    },
    jobApplications: {
      used: usage.jobApplicationsUsed,
      max: limits.maxJobApplications
    }
  };
};

const canAddProviderSkill = async (providerId, countToAdd = 1) => {
  const subscription = await providerPlanService.getActiveProviderSubscription(providerId);
  if (!subscription) {
    return {
      allowed: false,
      reason: 'NO_ACTIVE_SUBSCRIPTION',
      limitType: 'skills',
      message: 'No active plan found. Please purchase a plan.'
    };
  }

  const limits = providerPlanService.getSubscriptionLimits(subscription);
  const usage = await providerPlanService.getOrCreateCurrentUsage(providerId, subscription);

  if (usage.skillsUsed + countToAdd > limits.maxSkills) {
    return {
      allowed: false,
      reason: 'LIMIT_REACHED',
      limitType: 'skills',
      message: `Limit reached. Your plan allows max ${limits.maxSkills} skill(s). Please upgrade your plan.`
    };
  }

  return {
    allowed: true,
    current: usage.skillsUsed,
    max: limits.maxSkills
  };
};

const consumeProviderSkill = async (providerId, countToAdd = 1) => {
  const subscription = await providerPlanService.getActiveProviderSubscription(providerId);
  if (!subscription) throw new Error('No active subscription');

  const limits = providerPlanService.getSubscriptionLimits(subscription);
  const usage = await providerPlanService.getOrCreateCurrentUsage(providerId, subscription);

  // Atomic update with limit condition
  const result = await prisma.providerUsage.updateMany({
    where: { id: usage._id, skillsUsed: { lte: limits.maxSkills - countToAdd } },
    data: { skillsUsed: { increment: countToAdd } },
  });
  return result.count > 0;
};

const canAddProviderLocation = async (providerId, countToAdd = 1) => {
  const subscription = await providerPlanService.getActiveProviderSubscription(providerId);
  if (!subscription) {
    return {
      allowed: false,
      reason: 'NO_ACTIVE_SUBSCRIPTION',
      limitType: 'locations',
      message: 'No active plan found. Please purchase a plan.'
    };
  }

  const limits = providerPlanService.getSubscriptionLimits(subscription);
  const usage = await providerPlanService.getOrCreateCurrentUsage(providerId, subscription);

  const maxLocations = Math.max(limits.maxPincodes || 0, limits.maxCities || 0);

  if (usage.locationsUsed + countToAdd > maxLocations) {
    return {
      allowed: false,
      reason: 'LIMIT_REACHED',
      limitType: 'locations',
      message: `Limit reached. Your plan allows max ${maxLocations} location(s). Please upgrade your plan.`
    };
  }

  return {
    allowed: true,
    current: usage.locationsUsed,
    max: maxLocations
  };
};

const consumeProviderLocation = async (providerId, countToAdd = 1) => {
  const subscription = await providerPlanService.getActiveProviderSubscription(providerId);
  if (!subscription) throw new Error('No active subscription');

  const limits = providerPlanService.getSubscriptionLimits(subscription);
  const usage = await providerPlanService.getOrCreateCurrentUsage(providerId, subscription);

  const maxLocations = Math.max(limits.maxPincodes || 0, limits.maxCities || 0);

  const result = await prisma.providerUsage.updateMany({
    where: { id: usage._id, locationsUsed: { lte: maxLocations - countToAdd } },
    data: { locationsUsed: { increment: countToAdd } },
  });
  return result.count > 0;
};

const canApplyToJob = async (providerId, countToAdd = 1) => {
  // Applying for internal jobs is now free for everyone.
  return {
    allowed: true,
    current: 0,
    max: 9999
  };
};

// ponytail: job applications are unrestricted for all providers; we still track for analytics
const consumeJobApplication = async (providerId, countToAdd = 1) => {
  try {
    const subscription = await providerPlanService.getActiveProviderSubscription(providerId);
    if (subscription) {
      const usage = await providerPlanService.getOrCreateCurrentUsage(providerId, subscription);
      await prisma.providerUsage.updateMany({ where: { id: usage._id }, data: { jobApplicationsUsed: { increment: countToAdd } } });
    }
  } catch (err) {
    // non-blocking — analytics only
    console.warn('[consumeJobApplication] usage tracking skipped:', err.message);
  }
  return true;
};


const syncProviderUsageCounts = async (providerId) => {
  const profile = await findProviderProfileByUserId(providerId);
  if (!profile) return;
  const subscription = await providerPlanService.getActiveProviderSubscription(providerId);
  if (!subscription) return;
  const usage = await providerPlanService.getOrCreateCurrentUsage(providerId, subscription);

  // Enforce the plan limit on specialities instead of basic skills.
  usage.skillsUsed = Array.isArray(profile.specialities) ? profile.specialities.length : 0;
  
  const locationsCount = Array.isArray(profile.serviceLocations)
    ? profile.serviceLocations.length
    : (Array.isArray(profile.locations) ? profile.locations.length : 0);
  usage.locationsUsed = locationsCount;
  
  await prisma.providerUsage.update({
    where: { id: usage._id }, data: { skillsUsed: usage.skillsUsed, locationsUsed: usage.locationsUsed },
  });
};

module.exports = {
  getProviderUsageSummary,
  canAddProviderSkill,
  consumeProviderSkill,
  canAddProviderLocation,
  consumeProviderLocation,
  canApplyToJob,
  consumeJobApplication,
  syncProviderUsageCounts
};
