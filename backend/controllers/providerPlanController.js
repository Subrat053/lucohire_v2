const prisma = require('../config/prisma');
const { createProviderProfile, findProviderProfileByUserId } = require('../services/providerProfilePersistenceService');
const { getStripeInstance } = require('../utils/stripe');
const { getPaymentConfig, getRazorpayInstance } = require('../utils/razorpay');
const { getActiveBillingRule, resolveCountryGstPercent } = require('../utils/billingRuleUtils');
const {
  createProviderSubscription,
  findPlanById,
  findProviderSubscription,
  findProviderSubscriptionById,
  listPlans,
  updateProviderSubscription,
  updateProviderPlanProfile,
  updateProviderSubscriptions,
} = require('../services/billingPersistenceService');

const DURATION_DISCOUNTS = { 1: 0, 3: 10, 6: 15, 12: 20 };
const DEFAULT_PROVIDER_PLAN_SLUGS = [
  'basic-ai',
  'pro-ai',
  'premium-ai',
  'add-multiple-skills',
  'one-pincode-top',
  'top-in-city',
  'show-top-in-country',
  'customise-plan',
];

const roundMoney = (value) => Math.max(0, Math.round((Number(value) || 0) * 100) / 100);

const ensureDurationMonths = (value) => {
  const months = Number(value);
  if (!Number.isInteger(months) || months < 1 || months > 12) return null;
  return months;
};

const normalizeList = (value) => (Array.isArray(value) ? value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean) : []);

const pickMonthlyPrice = (plan) => {
  const monthly = Number(plan?.priceMonthly || 0);
  if (Number.isFinite(monthly) && monthly > 0) return monthly;
  const fallback = Number(plan?.price || 0);
  return Number.isFinite(fallback) ? fallback : 0;
};

const resolveCoverageLabel = ({ coverageType, selectedPincodes, selectedCities }) => {
  switch (coverageType) {
    case 'city':
      return 'Entire City';
    case 'country':
      return 'Entire Country';
    case 'custom':
      return 'Custom Coverage';
    case 'pincode':
    default:
      return selectedPincodes?.length ? selectedPincodes.join(', ') : 'Selected Pincode';
  }
};

const buildPricing = ({ plan, durationMonths, gstPercent = 0 }) => {
  const monthlyPrice = pickMonthlyPrice(plan);
  const discountPercent = DURATION_DISCOUNTS[durationMonths] || 0;
  const subtotal = roundMoney(monthlyPrice * durationMonths * (1 - discountPercent / 100));
  const gstAmount = roundMoney((subtotal * gstPercent) / 100);
  const totalAmount = roundMoney(subtotal + gstAmount);

  return {
    monthlyPrice,
    discountPercent,
    subtotal,
    gstPercent,
    gstAmount,
    totalAmount,
  };
};

const buildPlanSnapshot = (plan) => ({
  name: plan.name,
  slug: plan.slug,
  type: plan.type,
  priceMonthly: pickMonthlyPrice(plan),
  description: plan.description || '',
  coverageType: plan.coverageType || 'pincode',
  maxSkills: Number(plan.maxSkills || 1),
  maxPincodes: Number(plan.maxPincodes || 1),
  maxCities: Number(plan.maxCities || 1),
  visibilityLevel: plan.visibilityLevel || 'basic',
  priorityWeight: Number(plan.priorityWeight || 0),
  features: Array.isArray(plan.features) ? plan.features : [],
  isPopular: plan.isPopular === true,
});

const buildExpiryDate = (startDate, durationMonths) => {
  const expiresAt = new Date(startDate);
  expiresAt.setMonth(expiresAt.getMonth() + Math.max(1, Number(durationMonths || 1)));
  return expiresAt;
};

const buildCustomPlanBenefits = (customConfig, durationMonths, startDate = new Date()) => {
  if (!customConfig) return null;

  const localities = Array.isArray(customConfig.localities) ? customConfig.localities : [];
  const cities = Array.isArray(customConfig.cities) ? customConfig.cities : [];
  const countries = Array.isArray(customConfig.countries) ? customConfig.countries : [];
  const multipleSkills = Array.isArray(customConfig.multipleSkills) ? customConfig.multipleSkills : [];

  const maxDuration = (items) => {
    const durations = items.map((item) => Number(item?.durationMonths || 0)).filter((value) => value > 0);
    return durations.length ? Math.max(...durations) : Number(durationMonths || 1);
  };

  return {
    topInLocality: localities.length > 0 ? {
      enabled: true,
      expiresAt: buildExpiryDate(startDate, maxDuration(localities)),
      skillLimit: new Set(localities.map((item) => String(item.skill || '').trim()).filter(Boolean)).size || 1,
      locationLimit: localities.length,
    } : { enabled: false },
    topInCity: cities.length > 0 ? {
      enabled: true,
      expiresAt: buildExpiryDate(startDate, maxDuration(cities)),
      skillLimit: new Set(cities.map((item) => String(item.skill || '').trim()).filter(Boolean)).size || 1,
      locationLimit: cities.length,
    } : { enabled: false },
    topInCountry: countries.length > 0 ? {
      enabled: true,
      expiresAt: buildExpiryDate(startDate, maxDuration(countries)),
      skillLimit: new Set(countries.map((item) => String(item.skill || '').trim()).filter(Boolean)).size || 1,
      locationLimit: countries.length,
    } : { enabled: false },
    multipleSkills: multipleSkills.length > 0 ? {
      enabled: true,
      expiresAt: buildExpiryDate(startDate, durationMonths),
      skillLimit: multipleSkills.length,
      locationLimit: 0,
    } : { enabled: false },
  };
};

const buildCurrentSubscriptionResponse = async (providerId) => {
  const [activeSubscription, profile] = await Promise.all([
    findProviderSubscription({
      providerId,
      subscriptionStatus: 'active',
      paymentStatus: 'paid',
      endDate: { gt: new Date() }
    }, { orderBy: { createdAt: 'desc' } }),
    findProviderProfileByUserId(providerId),
  ]);

  const fallbackSubscription = activeSubscription || await findProviderSubscription({
    providerId,
    subscriptionStatus: { in: ['paused', 'pending'] },
    paymentStatus: 'paid',
  }, { orderBy: { updatedAt: 'desc' } });

  let actualSubscription = fallbackSubscription;

  // Auto-expire logic if it's active
  if (actualSubscription && actualSubscription.subscriptionStatus === 'active') {
    const purchaseDate = actualSubscription.startDate || actualSubscription.createdAt;
    const durationDays = (actualSubscription.durationMonths || 1) * (actualSubscription.planSnapshot?.duration || 30);
    if (purchaseDate) {
      const purchaseTime = new Date(purchaseDate).getTime();
      const validityMs = durationDays * 24 * 60 * 60 * 1000;
      const nowMs = new Date().getTime();
      if ((purchaseTime + validityMs) <= nowMs) {
        // Expire the subscription
        Object.assign(actualSubscription, await updateProviderSubscription(actualSubscription._id, { subscriptionStatus: 'expired' }));
        
        // Check for queued plans
        const queuedPlan = await findProviderSubscription({
          providerId,
          subscriptionStatus: 'queued',
          paymentStatus: 'paid'
        }, { orderBy: { createdAt: 'asc' } });

        if (queuedPlan) {
          const providerPlanService = require('../services/providerPlanService');
          const queuedStartDate = new Date();
          const queuedEndDate = new Date(queuedStartDate);
          queuedEndDate.setMonth(queuedEndDate.getMonth() + Math.max(1, Number(queuedPlan.durationMonths || 1)));
          Object.assign(queuedPlan, await updateProviderSubscription(queuedPlan._id, {
            subscriptionStatus: 'active', startDate: queuedStartDate, endDate: queuedEndDate,
          }));
          
          const limits = providerPlanService.getSubscriptionLimits(queuedPlan);
          const visibilityLevel = limits.visibilityLevel || 'basic';
          const boostWeightByLevel = { country_top: 5, city_top: 4, pincode_top: 3, custom: 4, basic: 1 };
          
          if (profile) {
            await updateProviderPlanProfile(
              providerId,
              {
                currentPlan: queuedPlan.planSnapshot.slug,
                activePlanId: queuedPlan.planId,
                activeSubscriptionId: queuedPlan._id,
                visibilityLevel,
                boostedUntil: queuedPlan.endDate,
                allowedSkillsCount: limits.maxSkills,
                allowedPincodesCount: limits.maxPincodes,
                allowedCitiesCount: limits.maxCities,
                planCoverageType: limits.coverageType || 'pincode',
                isTopInPincode: visibilityLevel === 'pincode_top',
                isTopInCity: visibilityLevel === 'city_top',
                isTopInCountry: visibilityLevel === 'country_top',
                isActiveSubscription: true,
                priorityWeight: Number(queuedPlan.priorityWeight || 0),
                boostWeight: Number(boostWeightByLevel[visibilityLevel] || 1),
                customConfig: queuedPlan.customConfig || null,
                benefits: queuedPlan.benefits || null,
                planBenefitsSnapshot: queuedPlan.benefits || null
              }
            );
          }
          actualSubscription = queuedPlan;
        } else {
          // Revert to free plan
          if (profile) {
            await updateProviderPlanProfile(
              providerId,
              { 
                currentPlan: 'free',
                activePlanId: null,
                activeSubscriptionId: null,
                visibilityLevel: 'basic',
                isTopInPincode: false,
                isTopInCity: false,
                isTopInCountry: false,
                isActiveSubscription: false,
                planCoverageType: 'pincode',
              }
            );
          }
          actualSubscription = null;
        }
      }
    }
  }

  const planSnapshot = actualSubscription?.planSnapshot || null;
  const currentPlanName = planSnapshot?.name || (actualSubscription ? profile?.currentPlan : 'Free') || 'Free';
  const allowedCities = Number(profile?.allowedCitiesCount || planSnapshot?.maxCities || 1);
  const allowedPincodes = Number(profile?.allowedPincodesCount || planSnapshot?.maxPincodes || 1);
  const usedCities = Array.isArray(profile?.serviceLocations) && profile.serviceLocations.length > 0
    ? profile.serviceLocations.length
    : Array.isArray(profile?.locations)
      ? profile.locations.length
      : 0;
  const usedPincodes = usedCities;

  return {
    planId: actualSubscription?.planId || null,
    planName: currentPlanName,
    status: actualSubscription?.subscriptionStatus || 'inactive',
    allowedCities,
    allowedPincodes,
    usedCities,
    usedPincodes,
    remainingCities: Math.max(0, allowedCities - usedCities),
    remainingPincodes: Math.max(0, allowedPincodes - usedPincodes),
    expiresAt: actualSubscription?.endDate || profile?.profileExpiresAt || null,
    startDate: actualSubscription?.startDate || null,
    createdAt: actualSubscription?.createdAt || null,
    durationMonths: actualSubscription?.durationMonths || 1,
    planSnapshot: actualSubscription?.planSnapshot || null,
  };
};


const getProviderPlans = async (req, res) => {
  try {
    let country = req.query.country || req.user?.country;
    if (!country && req.user) {
      const profile = await findProviderProfileByUserId(req.user._id);
      country = profile?.country;
    }
    country = (country || 'IN').toUpperCase();

    const plans = await listPlans({
      type: 'provider',
      isActive: true,
    }, { sortOrder: 'asc' });

    const { getPlanPrice } = require('../services/pricingEngine');
    const localizedPlans = await Promise.all(plans.map(async (plan) => {
      if (plan.availableCountries && plan.availableCountries.length > 0) {
        if (!plan.availableCountries.includes(country)) {
          return null;
        }
      }
      try {
        const priceDetails = await getPlanPrice(plan._id, country);
        const planObj = { ...plan };
        planObj.price = priceDetails.basePrice;
        planObj.discountedPrice = priceDetails.discountedPrice;
        planObj.gstPercent = priceDetails.taxPercent;
        planObj.currency = priceDetails.currency;
        planObj.currencySymbol = priceDetails.currencySymbol;
        planObj.taxName = priceDetails.taxName;
        planObj.taxAmount = priceDetails.taxAmount;
        planObj.finalAmount = priceDetails.finalAmount;
        planObj.isTaxInclusive = priceDetails.isTaxInclusive;
        return planObj;
      } catch (err) {
        return { ...plan };
      }
    }));

    res.json(localizedPlans.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: 'Failed to load plans', error: error.message });
  }
};

const getMyPlan = async (req, res) => {
  try {
    let activeSubscription = await findProviderSubscription({
      providerId: req.user._id,
      subscriptionStatus: 'active',
      paymentStatus: 'paid',
    }, { orderBy: { createdAt: 'desc' } });

    const now = new Date();

    if (activeSubscription && new Date(activeSubscription.endDate) <= now) {
      if (activeSubscription.isAutoRenew) {
        const months = activeSubscription.durationMonths || 1;
        const durationMs = months * 30 * 24 * 60 * 60 * 1000;
        Object.assign(activeSubscription, await updateProviderSubscription(activeSubscription._id, {
          startDate: now,
          endDate: new Date(now.getTime() + durationMs),
          subscriptionStatus: 'active',
          paymentStatus: 'paid',
        }));
      } else {
        await updateProviderSubscription(activeSubscription._id, { subscriptionStatus: 'expired' });
        activeSubscription = null;
      }
    }

    if (!activeSubscription) {
      const pausedSubscription = await findProviderSubscription({
        providerId: req.user._id,
        subscriptionStatus: 'paused',
        paymentStatus: 'paid',
        remainingDurationMs: { gt: 0 },
      }, { orderBy: { updatedAt: 'desc' } });

      if (pausedSubscription) {
        const newEndDate = new Date(now.getTime() + pausedSubscription.remainingDurationMs);
        Object.assign(pausedSubscription, await updateProviderSubscription(pausedSubscription._id, {
          subscriptionStatus: 'active', startDate: now, endDate: newEndDate, remainingDurationMs: 0,
        }));

        const boostWeightByLevel = {
          country_top: 5,
          city_top: 4,
          pincode_top: 3,
          custom: 4,
          basic: 1,
        };
        const visibilityLevel = pausedSubscription.planSnapshot.visibilityLevel || 'basic';

        await updateProviderPlanProfile(
          req.user._id,
          {
            currentPlan: pausedSubscription.planSnapshot.slug,
            activePlanId: pausedSubscription.planId,
            activeSubscriptionId: pausedSubscription._id,
            visibilityLevel: visibilityLevel,
            boostedUntil: newEndDate,
            allowedSkillsCount: Number(pausedSubscription.planSnapshot.maxSkills || 1),
            allowedPincodesCount: Number(pausedSubscription.planSnapshot.maxPincodes || 1),
            allowedCitiesCount: Number(pausedSubscription.planSnapshot.maxCities || 1),
            planCoverageType: pausedSubscription.planSnapshot.coverageType || 'pincode',
            isTopInPincode: visibilityLevel === 'pincode_top',
            isTopInCity: visibilityLevel === 'city_top',
            isTopInCountry: visibilityLevel === 'country_top',
            isActiveSubscription: true,
            inRotationPool: true,
            priorityWeight: Number(pausedSubscription.priorityWeight || 0),
            boostWeight: Number(boostWeightByLevel[visibilityLevel] || 1),
            customConfig: null,
          },
          { new: true }
        );

        activeSubscription = pausedSubscription;
      }
    }

    if (!activeSubscription) {
      const freePlan = {
        name: 'Free Visibility',
        slug: 'free',
        type: 'provider',
        priceMonthly: 0,
        coverageType: 'pincode',
        maxSkills: 1,
        maxPincodes: 1,
        maxCities: 1,
        visibilityLevel: 'basic',
        features: ['One skill in one pincode'],
      };

      return res.json({
        subscription: null,
        plan: freePlan,
        isDefault: true,
      });
    }

    return res.json({
      subscription: activeSubscription,
      plan: activeSubscription.planSnapshot || null,
      isDefault: false,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load subscription', error: error.message });
  }
};

const getCurrentSubscription = async (req, res) => {
  try {
    const summary = await buildCurrentSubscriptionResponse(req.user._id);
    return res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load current subscription', error: error.message });
  }
};

const previewPlan = async (req, res) => {
  try {
    const { planId, durationMonths, selectedSkills, selectedPincodes, selectedCities } = req.body || {};
    if (!planId) return res.status(400).json({ message: 'planId is required' });

    const months = ensureDurationMonths(durationMonths);
    if (!months) return res.status(400).json({ message: 'durationMonths must be between 1 and 12' });

    const plan = await findPlanById(planId);
    if (!plan || plan.type !== 'provider' || !plan.isActive) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    let country = req.body.preferredCountry || req.user.country;
    if (!country && req.user.activeRole === 'provider') {
      const profile = await findProviderProfileByUserId(req.user._id);
      country = profile?.country;
    }
    country = (country || 'IN').toUpperCase();

    // Check availableCountries
    if (plan.availableCountries && plan.availableCountries.length > 0) {
      if (!plan.availableCountries.includes(country)) {
        return res.status(400).json({ message: `Plan is not available in your country (${country}).` });
      }
    }

    const { getPlanPrice } = require('../services/pricingEngine');
    const priceDetails = await getPlanPrice(plan._id, country);

    const monthlyPrice = priceDetails.discountedPrice > 0 ? priceDetails.discountedPrice : priceDetails.basePrice;
    const discountPercent = DURATION_DISCOUNTS[months] || 0;
    
    let subtotal = 0;
    let gstPercent = priceDetails.taxPercent;
    let gstAmount = 0;
    let totalAmount = 0;

    if (priceDetails.isTaxInclusive === true) {
      totalAmount = roundMoney(monthlyPrice * months * (1 - discountPercent / 100));
      gstAmount = roundMoney(totalAmount - (totalAmount / (1 + priceDetails.taxPercent / 100)));
      subtotal = roundMoney(totalAmount - gstAmount);
    } else {
      subtotal = roundMoney(monthlyPrice * months * (1 - discountPercent / 100));
      gstAmount = roundMoney((subtotal * priceDetails.taxPercent) / 100);
      totalAmount = roundMoney(subtotal + gstAmount);
    }

    const pricing = {
      monthlyPrice,
      discountPercent,
      subtotal,
      gstPercent,
      gstAmount,
      totalAmount,
      currency: priceDetails.currency,
      currencySymbol: priceDetails.currencySymbol,
      taxName: priceDetails.taxName
    };
    const snapshot = buildPlanSnapshot(plan);

    const normalizedSkills = normalizeList(selectedSkills);
    const normalizedPincodes = normalizeList(selectedPincodes);
    const normalizedCities = normalizeList(selectedCities);

    return res.json({
      plan: snapshot,
      pricing,
      durationMonths: months,
      selectedSkills: normalizedSkills,
      selectedPincodes: normalizedPincodes,
      selectedCities: normalizedCities,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to preview plan', error: error.message });
  }
};

const checkoutPlan = async (req, res) => {
  try {
    const { planId, durationMonths, selectedSkills, selectedPincodes, selectedCities, customAmount, customConfig, isAutoSubscription } = req.body || {};
    if (!planId) return res.status(400).json({ message: 'planId is required' });

    const months = ensureDurationMonths(durationMonths) || 1; // Default to 1 if not standard

    const plan = await findPlanById(planId);
    if (!plan || plan.type !== 'provider' || !plan.isActive) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    let country = req.body.preferredCountry || req.user.country;
    if (!country && req.user.activeRole === 'provider') {
      const profile = await findProviderProfileByUserId(req.user._id);
      country = profile?.country;
    }
    country = (country || 'IN').toUpperCase();

    // Check availableCountries
    if (plan.availableCountries && plan.availableCountries.length > 0) {
      if (!plan.availableCountries.includes(country)) {
        return res.status(400).json({ message: `Plan is not available in your country (${country}).` });
      }
    }

    const { getPlanPrice } = require('../services/pricingEngine');
    const priceDetails = await getPlanPrice(plan._id, country);
    
    if (plan.slug.endsWith('-ai')) {
      priceDetails.taxPercent = 0;
    }

    const monthlyPrice = priceDetails.discountedPrice > 0 ? priceDetails.discountedPrice : priceDetails.basePrice;
    const discountPercent = DURATION_DISCOUNTS[months] || 0;
    
    let subtotal = 0;
    let gstPercent = priceDetails.taxPercent;
    let gstAmount = 0;
    let totalAmount = 0;

    if (priceDetails.isTaxInclusive === true) {
      totalAmount = roundMoney(monthlyPrice * months * (1 - discountPercent / 100));
      gstAmount = roundMoney(totalAmount - (totalAmount / (1 + priceDetails.taxPercent / 100)));
      subtotal = roundMoney(totalAmount - gstAmount);
    } else {
      subtotal = roundMoney(monthlyPrice * months * (1 - discountPercent / 100));
      gstAmount = roundMoney((subtotal * priceDetails.taxPercent) / 100);
      totalAmount = roundMoney(subtotal + gstAmount);
    }

    let pricing = {
      monthlyPrice,
      discountPercent,
      subtotal,
      gstPercent,
      gstAmount,
      totalAmount,
      currency: priceDetails.currency,
      currencySymbol: priceDetails.currencySymbol,
      taxName: priceDetails.taxName
    };

    if (plan.slug === 'customise-plan' && Number(customAmount) > 0) {
      const subtotalVal = roundMoney(customAmount);
      const activeRule = await getActiveBillingRule();
      const customGstPercent = resolveCountryGstPercent(country, activeRule);
      const gstAmountVal = roundMoney((subtotalVal * customGstPercent) / 100);
      const totalAmountVal = roundMoney(subtotalVal + gstAmountVal);
      pricing = {
        monthlyPrice: subtotalVal / months,
        discountPercent: 0,
        subtotal: subtotalVal,
        gstPercent: customGstPercent,
        gstAmount: gstAmountVal,
        totalAmount: totalAmountVal,
        currency: 'INR',
        currencySymbol: '₹',
        taxName: 'GST'
      };
    }
    const snapshot = buildPlanSnapshot(plan);

    const normalizedSkills = normalizeList(selectedSkills);
    const normalizedPincodes = normalizeList(selectedPincodes);
    const normalizedCities = normalizeList(selectedCities);

    // Get payment config to see if we can process online payment
    const config = await getPaymentConfig();
    
    // Removed simulation mode override
    const isConfigured = !!(config.keyId && config.keySecret);
    const isCustomInquiry = String(plan.slug || '') === 'customise-plan' && pricing.totalAmount <= 0;

    const subscription = await createProviderSubscription({
      providerId: req.user._id,
      planId: plan._id,
      isAutoRenew: isAutoSubscription === true,
      planSnapshot: snapshot,
      durationMonths: months,
      subtotal: pricing.subtotal,
      gstPercent: pricing.gstPercent,
      gstAmount: pricing.gstAmount,
      totalAmount: pricing.totalAmount,
      paymentStatus: 'pending',
      subscriptionStatus: 'pending',

      selectedSkills: normalizedSkills,
      selectedPincodes: normalizedPincodes,
      selectedCities: normalizedCities,
      coverageLabel: resolveCoverageLabel({
        coverageType: snapshot.coverageType,
        selectedPincodes: normalizedPincodes,
        selectedCities: normalizedCities,
      }),
      visibilityLevel: snapshot.visibilityLevel,
      priorityWeight: snapshot.priorityWeight,
      finalAmount: pricing.totalAmount,
      currency: pricing.currency || 'INR',
      priceSnapshot: plan.slug === 'customise-plan' ? null : priceDetails,
      paymentProvider: isConfigured ? 'razorpay' : 'manual',
      customConfig: customConfig || null,
      benefits: plan.slug === 'customise-plan' ? buildCustomPlanBenefits(customConfig, months) : null,
    });

    const checkout = await generateCheckoutSession(subscription, req.user, req);

    return res.json({
      subscription,
      checkout,
    });


  } catch (error) {
    res.status(500).json({ message: 'Failed to create checkout', error: error.message });
  }
};

const paymentSuccess = async (req, res) => {
  try {
    const { subscriptionId, paymentId, orderId } = req.body || {};
    if (!subscriptionId) return res.status(400).json({ message: 'subscriptionId is required' });

    const subscription = await findProviderSubscriptionById(subscriptionId);
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });

    if (String(subscription.providerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this subscription' });
    }

    const plan = await findPlanById(subscription.planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + Number(subscription.durationMonths || 1));

    let activeStandardPlan = null;
    if (plan.slug === 'customise-plan') {
      activeStandardPlan = await findProviderSubscription({
        providerId: req.user._id,
        id: { not: subscription._id },
        subscriptionStatus: 'active',
        NOT: { planSnapshot: { path: ['slug'], equals: 'customise-plan' } },
      });
      if (activeStandardPlan) {
        const remainingMs = Math.max(0, new Date(activeStandardPlan.endDate).getTime() - now.getTime());
        Object.assign(activeStandardPlan, await updateProviderSubscription(activeStandardPlan._id, {
          subscriptionStatus: 'paused', remainingDurationMs: remainingMs,
        }));
      }
    }

    await updateProviderSubscriptions({
      providerId: req.user._id,
      id: activeStandardPlan ? { notIn: [subscription._id, activeStandardPlan._id] } : { not: subscription._id },
      subscriptionStatus: 'active',
    }, { subscriptionStatus: 'expired' });

    let stripeSubId = null;
    if (paymentId && (paymentId.startsWith('cs_test_') || paymentId.startsWith('cs_live_'))) {
      try {
        const stripe = await getStripeInstance();
        const session = await stripe.checkout.sessions.retrieve(paymentId);
        if (session && session.subscription) {
          stripeSubId = session.subscription;
        }
      } catch (e) {
        console.error('Failed to fetch Stripe session:', e.message);
      }
    }

    Object.assign(subscription, await updateProviderSubscription(subscription._id, {
      paymentStatus: 'paid',
      subscriptionStatus: 'active',
      paymentId: paymentId || subscription.paymentId || '',
      orderId: orderId || subscription.orderId || '',
      ...(stripeSubId ? { stripeSubscriptionId: stripeSubId } : {}),
      startDate: now,
      endDate,
      visibilityLevel: plan.visibilityLevel,
    }));

    const visibilityLevel = plan.visibilityLevel || 'basic';
    const boostWeightByLevel = {
      country_top: 5,
      city_top: 4,
      pincode_top: 3,
      custom: 4,
      basic: 1,
    };

    let profile = await findProviderProfileByUserId(req.user._id);
    if (!profile) {
      profile = await createProviderProfile({
        user: req.user._id,
        profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
    }

    const updateFields = {
      currentPlan: plan.slug,
      activePlanId: plan._id,
      activeSubscriptionId: subscription._id,
      visibilityLevel,
      boostedUntil: endDate,
      allowedSkillsCount: plan.slug === 'customise-plan' ? 20 : Number(plan.maxSkills || 1),
      allowedPincodesCount: plan.slug === 'customise-plan' ? 20 : Number(plan.maxPincodes || 1),
      allowedCitiesCount: plan.slug === 'customise-plan' ? 20 : Number(plan.maxCities || 1),
      planCoverageType: plan.coverageType || 'pincode',
      isTopInPincode: visibilityLevel === 'pincode_top',
      isTopInCity: visibilityLevel === 'city_top',
      isTopInCountry: visibilityLevel === 'country_top',
      isActiveSubscription: true,
      inRotationPool: true,
      priorityWeight: Number(subscription.priorityWeight || plan.priorityWeight || 0),
      boostWeight: Number(boostWeightByLevel[visibilityLevel] || 1),
      customConfig: subscription.customConfig || null,
      benefits: subscription.benefits || null,
      planBenefitsSnapshot: subscription.benefits || null,
    };

    // Sync selected boost options (skills & target areas) into ProviderProfile schema so searches pick them up immediately
    const existingSkills = Array.isArray(profile.skills) ? profile.skills : [];
    const subscriptionSkills = Array.isArray(subscription.selectedSkills) ? subscription.selectedSkills : [];
    const mergedSkills = [...new Set([...existingSkills, ...subscriptionSkills])];
    updateFields.skills = mergedSkills;

    const existingLocations = Array.isArray(profile.locations) ? profile.locations : [];
    const subscriptionPincodes = Array.isArray(subscription.selectedPincodes) ? subscription.selectedPincodes : [];
    const subscriptionCities = Array.isArray(subscription.selectedCities) ? subscription.selectedCities : [];
    const mergedLocations = [...new Set([...existingLocations, ...subscriptionPincodes, ...subscriptionCities])];
    updateFields.locations = mergedLocations;

    if (subscription.customConfig) {
      updateFields.customConfig = subscription.customConfig;
      
      const customSkills = [];
      if (subscription.customConfig.localities) {
        subscription.customConfig.localities.forEach(item => {
          if (item.skill && !customSkills.includes(item.skill)) {
            customSkills.push(item.skill);
          }
        });
      }
      if (subscription.customConfig.cities) {
        subscription.customConfig.cities.forEach(item => {
          if (item.skill && !customSkills.includes(item.skill)) {
            customSkills.push(item.skill);
          }
        });
      }
      if (subscription.customConfig.countries) {
        subscription.customConfig.countries.forEach(item => {
          if (item.skill && !customSkills.includes(item.skill)) {
            customSkills.push(item.skill);
          }
        });
      }
      
      if (customSkills.length > 0) {
        const existingSkills = profile.skills || [];
        const mergedSkills = Array.from(new Set([...existingSkills, ...customSkills]));
        updateFields.skills = mergedSkills;
      }
    }

    if (plan.slug === 'whatsapp-alerts') {
      await updateProviderPlanProfile(
        req.user._id,
        {
          whatsappFreelancePlanActive: true,
          whatsappFreelancePlanSubscriptionId: subscription._id,
          whatsappFreelancePlanExpiry: endDate,
        },
        { new: true }
      );
    } else {
      await updateProviderPlanProfile(
        req.user._id,
        updateFields,
        { new: true }
      );
    }

    if (plan.slug === 'customise-plan') {
      try {
        const customPlan = await prisma.customVisibilityPlan.findFirst({
          where: { providerId: String(req.user._id), subscriptionId: subscription._id, status: 'pending' },
        });
        if (customPlan) {
          await prisma.customVisibilityPlan.update({
            where: { id: customPlan.id },
            data: { status: 'active', paymentId: paymentId || '', startDate: now, endDate },
          });
        }
      } catch (err) {
        console.error('Failed to activate custom visibility plan record:', err.message);
      }
    }

    return res.json({ subscription });
  } catch (error) {
    res.status(500).json({ message: 'Failed to confirm payment', error: error.message });
  }
};

const providerPlanService = require('../services/providerPlanService');
const providerUsageService = require('../services/providerUsageService');

const getActiveSubscriptionDetail = async (req, res) => {
  try {
    const activeSub = await providerPlanService.getActiveProviderSubscription(req.user._id);
    if (!activeSub) {
      return res.json({ subscription: null, limits: null });
    }
    const limits = providerPlanService.getSubscriptionLimits(activeSub);
    res.json({ subscription: activeSub, limits });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load active subscription detail', error: error.message });
  }
};

const getProviderUsageMetrics = async (req, res) => {
  try {
    const summary = await providerUsageService.getProviderUsageSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load usage metrics', error: error.message });
  }
};

const calculateCustomPriceController = async (req, res) => {
  try {
    let country = req.body.preferredCountry || req.user.country;
    if (!country && req.user.activeRole === 'provider') {
      const profile = await findProviderProfileByUserId(req.user._id);
      country = profile?.country;
    }
    const calculated = await providerPlanService.calculateCustomProviderPlanPrice(req.body, country);
    res.json({ success: true, ...calculated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to calculate custom price', error: error.message });
  }
};

async function generateCheckoutSession(subscription, user, req) {
  const config = await getPaymentConfig();
  
  const isConfigured = !!(config.keyId && config.keySecret);
  const isCustomInquiry = String(subscription.planSnapshot?.slug || '') === 'customise-plan' && subscription.totalAmount <= 0;

  if (isCustomInquiry) {
    return {
      paymentRequired: false,
      message: 'Custom plan request received. Our team will contact you shortly.',
    };
  }

  let checkoutData = {};
  if (isConfigured && !config.simulationMode) {
    try {
      const razorpay = await getRazorpayInstance();
      const reqOrigin = req ? (req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null)) : null;
      const frontendUrl = reqOrigin || process.env.FRONTEND_URL || 'http://localhost:5173';
      
      const currencyStr = (subscription.currency || 'INR').toUpperCase();
      const unitAmountRZP = Math.max(1, Math.round(Number(subscription.totalAmount || 0) * 100));

      const RAZORPAY_PLAN_MAP = {
        // Live IDs
        'provider-max-yearly': 'plan_TMrrtvqo67bR4j',
        'provider-max-quarterly': 'plan_TMrrN6T3ICamUy',
        'provider-max-monthly': 'plan_TMrqvibx6s3TMo',
        'provider-pro-yearly': 'plan_TMrqWNTX7r2c1k',
        'provider-pro-quarterly': 'plan_TMrq7VQv45iGOz',
        'provider-pro-monthly': 'plan_TMrpVQubofSDO6',
        'provider-basic-yearly': 'plan_TMrmIAQVxZDMP1',
        'provider-basic-quarterly': 'plan_TMroyrrgcsvYq7',
        'provider-basic-monthly': 'plan_TMrki2EOQJwu5P',
      };

      let isSubscription = false;
      let sessionId = null;

      if (subscription.isAutoRenew) {
        let planSuffix = '-monthly';
        if (subscription.durationMonths === 12) planSuffix = '-yearly';
        if (subscription.durationMonths === 3) planSuffix = '-quarterly';
        
        const internalSlug = `provider-${subscription.planSnapshot?.slug}${planSuffix}`;
        const razorpayPlanId = RAZORPAY_PLAN_MAP[internalSlug];

        if (razorpayPlanId) {
          const subscriptionOptions = {
            plan_id: razorpayPlanId,
            customer_notify: 1,
            total_count: 120, // 10 years by default for indefinite
            notes: {
              subscriptionId: String(subscription._id),
              providerId: String(user._id),
              type: 'plan_purchase',
            }
          };

          if (subscription.selectedAddons && subscription.selectedAddons.length > 0) {
            subscriptionOptions.addons = subscription.selectedAddons.map(addon => ({
              item: {
                name: addon.description || addon.key || 'Add-on',
                amount: Math.round(Number(addon.price || 0) * 100),
                currency: currencyStr
              }
            }));
          }

          const rzpSubscription = await razorpay.subscriptions.create(subscriptionOptions);
          subscription.orderId = rzpSubscription.id;
          await updateProviderSubscription(subscription._id, { orderId: subscription.orderId });
          sessionId = rzpSubscription.id;
          isSubscription = true;
        }
      }

      // Fallback to one-time order if not auto-renew or plan map missing
      if (!isSubscription) {
        const orderOptions = {
          amount: unitAmountRZP,
          currency: currencyStr,
          receipt: `sub_${subscription._id}`,
          notes: {
            subscriptionId: String(subscription._id),
            providerId: String(user._id),
            type: 'plan_purchase',
          }
        };

        const order = await razorpay.orders.create(orderOptions);
        subscription.orderId = order.id;
        await updateProviderSubscription(subscription._id, { orderId: subscription.orderId });
        sessionId = order.id;
      }

      checkoutData.sessionId = sessionId;
      checkoutData.isSubscription = isSubscription;
    } catch (err) {
      console.error('Razorpay Checkout Error:', err.message);
      throw new Error(`Razorpay initialization failed: ${err.message}`);
    }
  }

  return {
    paymentRequired: isConfigured,
    paymentProvider: isConfigured ? 'razorpay' : 'manual',
    publishableKey: config.keyId,
    keyId: config.keyId,
    url: null,
    orderId: checkoutData.sessionId,    // Razorpay order_id or subscription_id
    sessionId: checkoutData.sessionId, // keep for backward compat
    isSubscription: checkoutData.isSubscription || false,
    simulationMode: config.simulationMode,
    amount: Math.round(subscription.totalAmount * 100),
    currency: subscription.currency || 'INR',
    message: isConfigured
      ? 'Payment gateway ready.'
      : 'Payment gateway not configured. Subscription created as pending.',
  };
}

const purchaseFixedPlan = async (req, res) => {
  try {
    const { planId, durationMonths } = req.body || {};
    
    // Check if there's a recent pending subscription for this user & plan
    const recentPending = await findProviderSubscription({
      providerId: req.user._id,
      planId: String(planId),
      subscriptionStatus: 'pending',
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
    });
    
    let subscription;
    let queueWarning = null;

    if (recentPending && recentPending.orderId) {
      // Reuse existing pending subscription so user can retry checkout without 429 error
      subscription = recentPending;
    } else {
      // Clean up old pending subscriptions for this plan
      await prisma.providerSubscription.deleteMany({
        where: { providerId: String(req.user._id), planId: String(planId), subscriptionStatus: 'pending' },
      });

      const result = await providerPlanService.createFixedPlanSubscription(
        req.user._id,
        planId,
        durationMonths,
        req.body
      );
      subscription = result.subscription;
      queueWarning = result.queueWarning;
    }

    const checkout = await generateCheckoutSession(subscription, req.user, req);
    res.json({ subscription, checkout, queueWarning });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Purchase failed' });
  }
};

const purchaseCustomPlan = async (req, res) => {
  try {
    const { items, durationMonths, customConfig, benefits } = req.body || {};
    const { subscription, queueWarning } = await providerPlanService.createCustomPlanSubscription(
      req.user._id,
      { items, durationMonths, customConfig, benefits },
      req.body
    );

    const checkout = await generateCheckoutSession(subscription, req.user, req);
    res.json({ subscription, checkout, queueWarning });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Custom purchase failed' });
  }
};

const confirmPaymentSuccessController = async (req, res) => {
  try {
    const { subscriptionId, paymentId, orderId, signature } = req.body || {};
    if (!subscriptionId) return res.status(400).json({ message: 'subscriptionId is required' });

    // Verify Razorpay signature for real payments (skip for free/simulation)
    const isRealPayment = paymentId &&
      !paymentId.startsWith('free_') &&
      !paymentId.startsWith('sim_') &&
      orderId &&
      orderId !== 'stripe_session';

    if (isRealPayment) {
      if (!signature) {
        return res.status(400).json({ message: 'Payment signature missing. Cannot verify payment.' });
      }
      const { verifyPaymentSignature } = require('../utils/razorpay');
      const isValid = await verifyPaymentSignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });
      if (!isValid) {
        return res.status(400).json({ message: 'Payment signature verification failed.' });
      }
    }

    const subscription = await providerPlanService.activatePaidSubscription(subscriptionId, { paymentId, orderId });
    
    // Send Invoice Email
    try {
      const { sendMail } = require('../services/mailService');
      const invoiceNumber = `INV-${subscription._id.toString().slice(-6).toUpperCase()}`;
      
      // Calculate amount to show
      const amount = subscription.finalAmount || subscription.totalAmount || subscription.subtotal || 0;
      const currency = subscription.currency || 'INR';
      const planName = subscription.planSnapshot?.name || 'Subscription Plan';
      
      const invoiceHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-bottom: 20px;">Payment Receipt & Invoice</h2>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p style="margin: 0 0 10px 0;"><strong>Date of Purchase:</strong> ${new Date().toLocaleDateString()}</p>
            <p style="margin: 0 0 10px 0;"><strong>Time of Purchase:</strong> ${new Date().toLocaleTimeString()}</p>
            <p style="margin: 0 0 10px 0;"><strong>Next Billing Date:</strong> ${subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A'}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="border-bottom: 2px solid #cbd5e1;">
                <th style="text-align: left; padding: 10px 0;">Description</th>
                <th style="text-align: right; padding: 10px 0;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0;">${planName}</td>
                <td style="text-align: right; padding: 10px 0;">${currency} ${amount}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="text-align: right;">
            <h3 style="color: #0f172a; margin-top: 0;">Total Paid: ${currency} ${amount}</h3>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            Thank you for choosing Lucohire Inc.<br/>
            Need help? Contact support@lucohire.com
          </p>
        </div>
      `;
      
      await sendMail({
        to: req.user.email,
        subject: `Invoice ${invoiceNumber} from Lucohire Inc.`,
        html: invoiceHtml,
      });
    } catch (mailErr) {
      console.error('Failed to send invoice email:', mailErr);
    }

    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ message: 'Payment confirmation failed', error: error.message });
  }
};





const toggleAutoRenewController = async (req, res) => {
  try {
    const userId = req.user._id;
    let sub = await findProviderSubscription({
      providerId: userId,
      subscriptionStatus: 'active',
    });

    if (!sub) {
      sub = await findProviderSubscription({ providerId: userId }, { orderBy: { createdAt: 'desc' } });
    }

    if (!sub) {
      return res.status(404).json({ success: false, message: 'No subscription found to update auto-renewal.' });
    }

    const nextState = req.body.isAutoRenew !== undefined ? Boolean(req.body.isAutoRenew) : !sub.isAutoRenew;
    Object.assign(sub, await updateProviderSubscription(sub._id, { isAutoRenew: nextState }));

    return res.json({
      success: true,
      isAutoRenew: sub.isAutoRenew,
      message: sub.isAutoRenew
        ? 'Auto subscription enabled. Your subscription will automatically renew at the end of the current period.'
        : 'Auto subscription disabled. Your subscription will NOT automatically renew at the end of the current period.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update auto renewal state', error: error.message });
  }
};

module.exports = {
  getProviderPlans,
  getMyPlan,
  getCurrentSubscription,
  previewPlan,
  checkoutPlan,
  paymentSuccess,
  getActiveSubscriptionDetail,
  getProviderUsageMetrics,
  calculateCustomPriceController,
  purchaseFixedPlan,
  purchaseCustomPlan,
  confirmPaymentSuccessController,

  toggleAutoRenewController,
};
