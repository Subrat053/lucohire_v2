const prisma = require('../config/prisma');
const {
  findActiveUserSubscription,
  findPlan,
} = require('../services/billingPersistenceService');

const getEffectiveRole = (user) => user.activeRole || (Array.isArray(user.roles) ? user.roles[0] : null) || user.role;

/**
 * Get the active subscription + plan for a user.
 * Returns { subscription, plan } or { subscription: null, plan: null }.
 */
async function getActiveSubscription(userId, role) {
  if (!role || role === 'admin') return { subscription: null, plan: null };

  const subscription = await findActiveUserSubscription(userId, role, true);

  if (!subscription) return { subscription: null, plan: null };

  let plan = subscription.planId;
  if (!plan && subscription.planCode) {
    const baseCode = subscription.planCode.replace('-quarterly', '').replace('-yearly', '');
    plan = await findPlan({ slug: baseCode, type: role });
  }

  return { subscription, plan };
}

/**
 * Middleware: check recruiter's job post limit before creating a job.
 * Uses active subscription if available, otherwise falls back to free plan.
 */
const checkPostLimit = async (req, res, next) => {
  try {
    const activeRole = getEffectiveRole(req.user);
    let { subscription, plan } = await getActiveSubscription(req.user._id, activeRole);

    // If no active subscription, use the free recruiter plan as default
    if (!plan) {
      plan = await findPlan({ type: 'recruiter', price: 0, isActive: true }, { sortOrder: 'asc' });
      if (!plan) {
        return res.status(500).json({
          message: 'Free recruiter plan not configured. Please contact support.',
        });
      }
    }

    // -1 means unlimited
    if (plan.jobPostLimit === -1) return next();

    // Count jobs posted this calendar month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const jobsThisMonth = await prisma.jobPost.count({
      where: {
        recruiter: String(req.user._id),
        createdAt: { gte: startOfMonth },
      },
    });

    if (jobsThisMonth >= plan.jobPostLimit) {
      return res.status(403).json({
        message: `Job post limit of ${plan.jobPostLimit} reached for this month. Upgrade your plan.`,
        upgradeRequired: true,
        limit: plan.jobPostLimit,
        used: jobsThisMonth,
      });
    }

    // Attach subscription data for downstream use
    req.subscription = subscription;
    req.plan = plan;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Middleware: check provider's job application limit before applying.
 * Uses active subscription if available, otherwise falls back to free plan.
 */
const checkApplyLimit = async (req, res, next) => {
  try {
    const activeRole = getEffectiveRole(req.user);
    let { subscription, plan } = await getActiveSubscription(req.user._id, activeRole);

    // If no active subscription, use the free plan as default
    if (!plan) {
      plan = await findPlan({ type: 'provider', price: 0, isActive: true }, { sortOrder: 'asc' });
      if (!plan) {
        return res.status(500).json({
          message: 'Free plan not configured. Please contact support.',
        });
      }
    }

    // -1 means unlimited
    if (plan.jobApplyLimit === -1) return next();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const appliedThisMonth = await prisma.application.count({
      where: {
        provider: String(req.user._id),
        createdAt: { gte: startOfMonth },
      },
    });

    if (appliedThisMonth >= plan.jobApplyLimit) {
      return res.status(403).json({
        message: `Application limit of ${plan.jobApplyLimit} reached for this month. Upgrade your plan.`,
        upgradeRequired: true,
        limit: plan.jobApplyLimit,
        used: appliedThisMonth,
      });
    }

    req.subscription = subscription;
    req.plan = plan;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Middleware: attach active subscription to request (non-blocking — continues even without sub).
 * Safe to use on public routes where req.user may not exist.
 */
const attachSubscription = async (req, res, next) => {
  try {
    if (req.user) {
      const activeRole = getEffectiveRole(req.user);
      const { subscription, plan } = await getActiveSubscription(req.user._id, activeRole);
      req.subscription = subscription;
      req.plan = plan;
    }
  } catch (_) {
    // Non-blocking
  }
  next();
};

/**
 * Middleware: check recruiter's unlock limit before unlocking a contact.
 * Uses active subscription if available, otherwise falls back to free plan.
 */
const checkUnlockLimit = async (req, res, next) => {
  try {
    const activeRole = getEffectiveRole(req.user);
    let { subscription, plan } = await getActiveSubscription(req.user._id, activeRole);

    // If no active subscription, use the free recruiter plan as default
    if (!plan) {
      plan = await findPlan({ type: 'recruiter', price: 0, isActive: true }, { sortOrder: 'asc' });
      if (!plan) {
        return res.status(500).json({
          message: 'Free recruiter plan not configured. Please contact support.',
        });
      }
    }

    // -1 means unlimited
    if (plan.unlockCredits === -1) return next();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const unlocksThisMonth = await prisma.lead.count({ where: {
      recruiter: String(req.user._id),
      type: 'contact_unlock',
      createdAt: { gte: startOfMonth },
    } });

    if (unlocksThisMonth >= (plan.unlockCredits || 0)) {
      return res.status(403).json({
        message: `Unlock limit of ${plan.unlockCredits || 0} reached for this month. Upgrade your plan.`,
        upgradeRequired: true,
        limit: plan.unlockCredits || 0,
        used: unlocksThisMonth,
      });
    }

    req.subscription = subscription;
    req.plan = plan;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { checkPostLimit, checkApplyLimit, checkUnlockLimit, attachSubscription, getActiveSubscription };
