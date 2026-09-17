const prisma = require('../config/prisma');
const {
  listUserSubscriptions,
  mapUserSubscription,
  updateUserSubscription,
  updateProviderPlanProfile,
  updateRecruiterPlanProfile,
} = require('../services/billingPersistenceService');

const getProviderSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, role, country, planType, search } = req.query;
    const filter = {};

    // 1. Filter by subscription status
    if (status) {
      filter.status = status;
    }

    // 2. Filter by user role (provider / recruiter)
    if (role) {
      filter.role = role;
    }

    // 3. Search by username or email
    if (search) {
      const searchText = String(search).trim();
      const users = await prisma.user.findMany({
        where: { OR: [
          { name: { contains: searchText, mode: 'insensitive' } },
          { email: { contains: searchText, mode: 'insensitive' } },
        ] },
        select: { id: true },
      });
      filter.userId = { in: users.map((user) => user.id) };
    }

    // 4. Filter by plan attributes (country, planType)
    const planQuery = {};
    if (country) {
      planQuery.country = String(country).trim().toUpperCase();
    }
    if (planType) {
      planQuery.planType = planType;
    }

    if (Object.keys(planQuery).length > 0) {
      const plans = await prisma.plan.findMany({ where: planQuery, select: { id: true } });
      filter.planId = { in: plans.map((plan) => plan.id) };
    }

    const pageNum = Math.max(1, Number(page || 1));
    const limitNum = Math.max(1, Number(limit || 20));

    const result = await listUserSubscriptions({
      where: filter, page: pageNum, limit: limitNum, includeUser: true, includePlan: true,
    });
    const subscriptions = result.subscriptions;
    const total = result.total;

    // Rescale mapping to match expected frontend structure for compatibility
    const formattedSubscriptions = subscriptions.map(sub => {
      const subObj = sub;
      return {
        ...subObj,
        providerId: subObj.userId, // Map userId to providerId for table render safety
        planSnapshot: subObj.planId ? {
          name: subObj.planId.name,
          slug: subObj.planId.slug,
          type: subObj.planId.type,
          priceMonthly: subObj.planId.price,
          currency: subObj.planId.currency || 'INR',
        } : null,
        subscriptionStatus: subObj.status,
        paymentStatus: subObj.paymentStatus || (subObj.amount === 0 ? 'free' : 'paid'),
        totalAmount: subObj.totalAmount || subObj.amount || 0,
      };
    });

    res.json({
      subscriptions: formattedSubscriptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load subscriptions', error: error.message });
  }
};

const updateProviderSubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['active', 'expired', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updatePayload = { status };
    if (status === 'active') updatePayload.paymentStatus = 'paid';

    await updateUserSubscription(id, updatePayload);
    const subscription = mapUserSubscription(await prisma.userSubscription.findUnique({
      where: { id: String(id) },
      include: { userIdRecord: { select: { id: true, name: true, email: true, phone: true } }, planIdRecord: true },
    }));

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Propagation logic for profiles
    if (subscription.status === 'active') {
      const plan = subscription.planId;
      const role = subscription.role || plan?.type || 'provider';
      const endDate = subscription.endDate || new Date(Date.now() + (plan?.duration || 30) * 24 * 60 * 60 * 1000);

      if (role === 'provider') {
        const visibilityLevel = String(plan?.visibilityLevel || 'basic');
        const boostWeightByLevel = {
          country_top: 5,
          city_top: 4,
          pincode_top: 3,
          custom: 4,
          basic: 1,
        };

        await updateProviderPlanProfile(
          subscription.userId?._id || subscription.userId,
          {
            currentPlan: plan?.slug || 'basic',
            activePlanId: plan?._id || null,
            activeSubscriptionId: subscription._id,
            visibilityLevel,
            boostedUntil: endDate,
            allowedSkillsCount: Number(plan?.maxSkills || 1),
            allowedPincodesCount: Number(plan?.maxPincodes || 1),
            allowedCitiesCount: Number(plan?.maxCities || 1),
            planCoverageType: plan?.coverageType || 'pincode',
            isTopInPincode: visibilityLevel === 'pincode_top',
            isTopInCity: visibilityLevel === 'city_top',
            isTopInCountry: visibilityLevel === 'country_top',
            isActiveSubscription: true,
            inRotationPool: true,
            priorityWeight: Number(subscription.priorityWeight || plan?.priorityWeight || 0),
            boostWeight: Number(boostWeightByLevel[visibilityLevel] || 1),
          },
          { new: true }
        );
      } else if (role === 'recruiter') {
        const creditsToAdd = Number(plan?.unlockCredits || 0);

        await updateRecruiterPlanProfile(
          subscription.userId?._id || subscription.userId,
          {
            currentPlan: plan?.slug || 'free',
            planExpiresAt: endDate,
            unlocksRemaining: creditsToAdd,
            unlockPackSize: creditsToAdd,
          },
          { new: true }
        );
      }
    } else {
      // Reset profiles to defaults
      const role = subscription.role || subscription.planId?.type || 'provider';

      if (role === 'provider') {
        await updateProviderPlanProfile(
          subscription.userId?._id || subscription.userId,
          {
            currentPlan: 'free',
            activePlanId: null,
            activeSubscriptionId: null,
            visibilityLevel: 'basic',
            boostedUntil: null,
            allowedSkillsCount: 1,
            allowedPincodesCount: 1,
            allowedCitiesCount: 1,
            planCoverageType: 'pincode',
            isTopInPincode: false,
            isTopInCity: false,
            isTopInCountry: false,
            isActiveSubscription: false,
            boostWeight: 0,
          },
          { new: true }
        );
      } else if (role === 'recruiter') {
        await updateRecruiterPlanProfile(
          subscription.userId?._id || subscription.userId,
          {
            currentPlan: 'free',
            planExpiresAt: null,
            unlocksRemaining: 2,
            unlockPackSize: 2,
          },
          { new: true }
        );
      }
    }

    const formattedSub = {
      ...subscription,
      providerId: subscription.userId,
      planSnapshot: subscription.planId ? {
        name: subscription.planId.name,
        slug: subscription.planId.slug,
        type: subscription.planId.type,
        priceMonthly: subscription.planId.price,
        currency: subscription.planId.currency || 'INR',
      } : null,
      subscriptionStatus: subscription.status,
      paymentStatus: subscription.paymentStatus || (subscription.amount === 0 ? 'free' : 'paid'),
      totalAmount: subscription.totalAmount || subscription.amount || 0,
    };

    res.json({ subscription: formattedSub });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update subscription status', error: error.message });
  }
};

module.exports = {
  getProviderSubscriptions,
  updateProviderSubscriptionStatus,
};
