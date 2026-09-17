const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { updateUserBadge } = require('../services/badgeService');
const { getActiveBillingRule, buildBillingRuleSnapshot, calculateBillingAmounts } = require('../utils/billingRuleUtils');
const {
  countUserSubscriptions,
  createUserSubscription,
  findActiveUserSubscription,
  findPlan,
  findPlanById,
  listPlans,
  listUserSubscriptions,
  paymentRevenue,
  updateUserSubscriptions,
} = require('../services/billingPersistenceService');

const getEffectiveRole = (user) => user.activeRole || (Array.isArray(user.roles) ? user.roles[0] : null) || user.role;

const setPanelAccess = async (userId, role, source = 'paid_plan') => {
  const user = withLegacyId(await prisma.user.findUnique({ where: { id: String(userId) } }));
  if (!user) return null;

  user.panelAccess = user.panelAccess || {
    provider: { enabled: false, source: 'none' },
    recruiter: { enabled: false, source: 'none' },
  };

  if (role === 'provider') {
    user.panelAccess.provider.enabled = true;
    user.panelAccess.provider.source = source;
  }
  if (role === 'recruiter') {
    user.panelAccess.recruiter.enabled = true;
    user.panelAccess.recruiter.source = source;
  }

  if (!user.activePanel) user.activePanel = role;
  if (!user.roles.includes(role)) user.roles.push(role);
  user.activeRole = user.activeRole || role;

  await prisma.user.update({ where: { id: user.id }, data: {
    panelAccess: user.panelAccess, activePanel: user.activePanel, roles: user.roles, activeRole: user.activeRole,
  } });
  return user;
};

// @desc    Get my active subscription
// @route   GET /api/subscriptions/me
const getMySubscription = async (req, res) => {
  try {
    const activeRole = getEffectiveRole(req.user);
    if (!activeRole || activeRole === 'admin') {
      return res.json({ subscription: null, message: 'No role-scoped subscription for current role' });
    }

    const subscription = await findActiveUserSubscription(req.user._id, activeRole, true);

    if (!subscription) {
      return res.json({ subscription: null, message: 'No active subscription' });
    }
    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Activate subscription after payment (called internally or by admin)
// @route   POST /api/subscriptions/activate
const activateSubscription = async (req, res) => {
  try {
    const { userId, planId, role } = req.body;

    const plan = await findPlanById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const roleForPlan = role || plan.type;
    const subscription = await assignPlanToUser(userId, roleForPlan, plan);
    await setPanelAccess(userId, roleForPlan, Number(plan.price || 0) > 0 ? 'paid_plan' : 'free_plan');
    res.json({ message: 'Subscription activated', subscription });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get plans for landing page
// @route   GET /api/plans/landing
const getLandingPagePlans = async (req, res) => {
  try {
    const plans = await listPlans({
      isActive: true,
      showOnLandingPage: true,
    });

    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get plans by audience (provider/recruiter)
// @route   GET /api/plans?audience=provider
const getPlansByAudience = async (req, res) => {
  try {
    const audience = req.query.audience;
    if (!['provider', 'recruiter'].includes(audience)) {
      return res.status(400).json({ message: 'audience must be provider or recruiter' });
    }

    const plans = await listPlans({
      isActive: true,
      OR: [{ audience }, { type: audience }],
    });

    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get active subscription by audience
// @route   GET /api/subscriptions/me/:audience
const getMySubscriptionByAudience = async (req, res) => {
  try {
    const audience = req.params.audience;
    if (!['provider', 'recruiter'].includes(audience)) {
      return res.status(400).json({ message: 'audience must be provider or recruiter' });
    }

    const subscription = await findActiveUserSubscription(req.user._id, audience, true);

    if (!subscription) return res.json({ subscription: null });
    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Select a plan (free or paid)
// @route   POST /api/subscriptions/select
const selectSubscription = async (req, res) => {
  try {
    const { planId, planCode, audience } = req.body || {};
    const role = audience;
    if (!['provider', 'recruiter'].includes(role)) {
      return res.status(400).json({ message: 'audience must be provider or recruiter' });
    }

    const plan = planId
      ? await findPlanById(planId)
      : await findPlan({ code: planCode });

    if (!plan || (plan.audience && plan.audience !== role) || (plan.type && plan.type !== role)) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    if (plan.planType === 'custom') {
      return res.status(400).json({ message: 'Custom plans must be requested separately.' });
    }

    // Resolve user country
    let country = req.user?.country;
    if (!country) {
      const profile = await (role === 'provider' 
        ? prisma.providerProfile.findUnique({ where: { user: String(req.user._id) } })
        : prisma.recruiterProfile.findUnique({ where: { user: String(req.user._id) } }));
      country = profile?.country;
    }
    country = (country || 'IN').toUpperCase();

    // Check plan availability
    if (plan.availableCountries && plan.availableCountries.length > 0) {
      if (!plan.availableCountries.includes(country)) {
        return res.status(400).json({ message: `Plan is not available in your country (${country}).` });
      }
    }

    const { getPlanPrice } = require('../services/pricingEngine');
    const priceDetails = await getPlanPrice(plan._id, country);

    const amount = priceDetails.discountedPrice > 0 ? priceDetails.discountedPrice : priceDetails.basePrice;
    if (amount <= 0 && priceDetails.finalAmount <= 0) {
      const subscription = await assignPlanToUser(req.user._id, role, plan, { isDefault: plan.isDefaultFree, priceSnapshot: priceDetails });
      await setPanelAccess(req.user._id, role, 'free_plan');
      return res.json({ subscription, paymentRequired: false });
    }

    const durationDays = Number(plan.durationDays || plan.duration || 30);
    const gstPercent = priceDetails.taxPercent;
    const gstAmount = priceDetails.taxAmount;
    const totalAmount = priceDetails.finalAmount;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await updateUserSubscriptions(
      { userId: req.user._id, role, status: 'active' },
      { status: 'expired' }
    );

    const unlockCreditsTotal = plan.unlockCredits || (role === 'recruiter' ? 2 : 0);
    const subscription = await createUserSubscription({
      userId: req.user._id,
      role,
      planId: plan._id,
      planCode: plan.code || plan.slug,
      startDate,
      endDate,
      startedAt: startDate,
      expiresAt: endDate,
      billingCycle: plan.billingCycle || 'monthly',
      amount,
      gstAmount,
      totalAmount,
      currency: priceDetails.currency,
      priceSnapshot: priceDetails,
      paymentStatus: 'pending',
      status: 'pending_payment',
      unlockCreditsTotal,
      unlockCreditsUsed: 0,
      unlockCreditsRemaining: unlockCreditsTotal,
      expiryDate: endDate,
    });

    return res.json({
      subscription,
      paymentRequired: true,
      paymentSummary: { amount, gstPercent, gstAmount, totalAmount, currency: priceDetails.currency },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Submit a custom plan request
// @route   POST /api/subscriptions/custom-request
const requestCustomPlan = async (req, res) => {
  try {
    const { audience, notes } = req.body || {};
    if (!['provider', 'recruiter'].includes(audience)) {
      return res.status(400).json({ message: 'audience must be provider or recruiter' });
    }

    res.json({ message: 'Custom plan request received. Our team will contact you shortly.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin: View all subscriptions
// @route   GET /api/subscriptions/all
const getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const result = await listUserSubscriptions({ where: filter, page, limit, includeUser: true, includePlan: true });
    res.json({
      subscriptions: result.subscriptions,
      pagination: { page: result.page, limit: result.limit, total: result.total, pages: Math.ceil(result.total / result.limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin: View revenue stats
// @route   GET /api/subscriptions/revenue
const getRevenue = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRevenue, monthlyRevenue, activeSubscriptions] = await Promise.all([
      paymentRevenue({ status: 'completed' }),
      paymentRevenue({ status: 'completed', createdAt: { gte: startOfMonth } }),
      countUserSubscriptions({ status: 'active', endDate: { gt: now } }),
    ]);

    res.json({
      totalRevenue,
      monthlyRevenue,
      activeSubscriptions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Helper: assign a plan to a user.
 * Expires any existing active subscription, then creates a new one.
 * Also updates the user's badge.
 */
async function assignPlanToUser(userId, role, plan, options = {}) {
  const isDefault = options.isDefault === true;
  const durationDays = Number(plan.durationDays || plan.duration || 30);
  const startDate = options.startDate || new Date();
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  
  let amount = Number(plan.price || 0);
  let gstPercent = Number(plan.gstPercent || 0);
  let gstAmount = Math.round(amount * (gstPercent / 100) * 100) / 100;
  let totalAmount = Math.round((amount + gstAmount) * 100) / 100;
  let currency = 'INR';

  let resolvedPriceSnapshot = options.priceSnapshot;
  if (!resolvedPriceSnapshot && plan && plan._id !== 'custom') {
    try {
      const user = await prisma.user.findUnique({ where: { id: String(userId) } });
      const profile = await (role === 'provider' 
        ? prisma.providerProfile.findUnique({ where: { user: String(userId) } })
        : prisma.recruiterProfile.findUnique({ where: { user: String(userId) } }));
      const country = (user?.country || profile?.country || 'IN').toUpperCase();
      const { getPlanPrice } = require('../services/pricingEngine');
      resolvedPriceSnapshot = await getPlanPrice(plan._id, country);
    } catch (e) {
      console.error("Failed to generate priceSnapshot inside assignPlanToUser:", e);
    }
  }

  if (resolvedPriceSnapshot) {
    amount = resolvedPriceSnapshot.discountedPrice > 0 ? resolvedPriceSnapshot.discountedPrice : resolvedPriceSnapshot.basePrice;
    gstPercent = resolvedPriceSnapshot.taxPercent;
    gstAmount = resolvedPriceSnapshot.taxAmount;
    totalAmount = resolvedPriceSnapshot.finalAmount;
    currency = resolvedPriceSnapshot.currency;
  }

  // Expire existing active subscriptions for this role only.
  await updateUserSubscriptions(
    { userId, role, status: 'active' },
    { status: 'expired' }
  );

  const activeRule = await getActiveBillingRule();
  const snapshot = buildBillingRuleSnapshot(activeRule);
  const calculated = calculateBillingAmounts(amount, activeRule);
  const billingFields = {
    billingRuleSnapshot: snapshot,
    platformCommissionAmount: calculated.platformCommissionAmount,
    providerShareAmount: calculated.providerShareAmount,
    referralCommissionAmount: calculated.referralCommissionAmount,
    cashbackAmount: calculated.cashbackAmount,
    netPlatformRevenue: calculated.netPlatformRevenue
  };

  const unlockCreditsTotal = plan.unlockCredits || (role === 'recruiter' ? 2 : 0);
  const unlockCreditsRemaining = unlockCreditsTotal;

  const subscription = await createUserSubscription({
    userId,
    role,
    planId: plan._id,
    planCode: plan.code || plan.slug,
    startDate,
    endDate,
    startedAt: startDate,
    expiresAt: endDate,
    billingCycle: plan.billingCycle || 'monthly',
    amount,
    gstAmount,
    totalAmount,
    currency,
    priceSnapshot: resolvedPriceSnapshot,
    paymentStatus: amount > 0 ? 'paid' : 'free',
    status: 'active',
    isDefault,
    unlockCreditsTotal,
    unlockCreditsUsed: 0,
    unlockCreditsRemaining,
    expiryDate: endDate,
    ...billingFields
  });

  if (role === 'recruiter') {
    await prisma.recruiterProfile.updateMany({
      where: { user: String(userId) }, data: {
        currentPlan: plan.slug,
        planExpiresAt: endDate,
        unlocksRemaining: unlockCreditsRemaining,
        unlockPackSize: unlockCreditsTotal,
      },
    });
  }

  // Update badge
  await updateUserBadge(userId);

  return subscription;
}

/**
 * Helper: assign the free plan to a user.
 * Finds the free plan for the user's role and creates a subscription.
 */
async function assignFreePlan(userId, role) {
  const planType = role === 'recruiter' ? 'recruiter' : 'provider';
  const freePlan = await findPlan({
    type: planType,
    OR: [
      { isDefaultFree: true },
      { planType: 'free' },
      { price: 0 },
    ],
    isActive: true,
  }, { sortOrder: 'asc' });

  if (!freePlan) {
    // No free plan configured; skip
    return null;
  }

  const subscription = await assignPlanToUser(userId, planType, freePlan, { isDefault: false });
  await setPanelAccess(userId, planType, 'free_plan');

  if (planType === 'provider') {
    await prisma.providerProfile.updateMany({
      where: { user: String(userId) }, data: {
        currentPlan: freePlan.slug || 'free',
        boostWeight: freePlan.boostWeight || 0,
        isTopCity: freePlan.isRotationEligible || false,
        inRotationPool: freePlan.isRotationEligible || false,
        allowedSkillsCount: Number(freePlan.maxSkills || 1),
        allowedPincodesCount: Number(freePlan.maxPincodes || 1),
        allowedCitiesCount: Number(freePlan.maxCities || 1),
      },
    });
  } else {
    const now = new Date();
    const resetAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await prisma.recruiterProfile.updateMany({
      where: { user: String(userId) }, data: {
        currentPlan: 'free',
        unlocksRemaining: 2,
        unlockPackSize: 2,
        freeUnlockResetAt: resetAt,
      },
    });
  }

  return subscription;
}

async function getDefaultProviderSubscriptionConfig() {
  const keys = [
    'default_provider_subscription_enabled',
    'default_provider_plan_slug',
    'default_provider_plan_duration_days',
  ];

  const settings = await prisma.adminSetting.findMany({ where: { key: { in: keys } } });
  const map = {};
  settings.forEach(s => { map[s.key] = s.value; });

  const enabledValue = map.default_provider_subscription_enabled;
  const enabled = enabledValue !== false && enabledValue !== 'false';

  return {
    enabled,
    planSlug: typeof map.default_provider_plan_slug === 'string' ? map.default_provider_plan_slug : 'basic',
    durationDays: Number(map.default_provider_plan_duration_days) || 30,
  };
}

async function findDefaultProviderPlan(planSlug, durationDays) {
  if (planSlug) {
    const bySlug = await findPlan({ type: 'provider', slug: planSlug, isActive: true });
    if (bySlug) return bySlug;
  }

  if (durationDays) {
    const byDuration = await findPlan(
      { type: 'provider', duration: durationDays, isActive: true },
      [{ price: 'asc' }, { sortOrder: 'asc' }],
    );
    if (byDuration) return byDuration;
  }

  return findPlan({ type: 'provider', isActive: true }, [{ price: 'asc' }, { sortOrder: 'asc' }]);
}

/**
 * Ensure provider has a default monthly subscription if none exists.
 * Returns existing or newly created subscription, or null if disabled.
 */
async function ensureDefaultProviderSubscription(userId, options = {}) {
  // Deprecated: all newly registered users should start on free plan.
  return assignFreePlan(userId, 'provider');
}

module.exports = {
  getMySubscription,
  getLandingPagePlans,
  getPlansByAudience,
  getMySubscriptionByAudience,
  selectSubscription,
  requestCustomPlan,
  activateSubscription,
  getAllSubscriptions,
  getRevenue,
  assignPlanToUser,
  assignFreePlan,
  ensureDefaultProviderSubscription,
};
