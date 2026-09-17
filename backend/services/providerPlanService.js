const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { createProviderProfile, ensureProviderProfile, findProviderProfileByUserId, updateProviderProfile } = require('./providerProfilePersistenceService');
const { sendMail } = require('./mailService');
const { generatePaymentReceipt } = require('../utils/templates/paymentReceipt');
const customPlanService = require('./provider/customPlan.service');
const { getActiveBillingRule, resolveCountryGstPercent } = require('../utils/billingRuleUtils');
const { getPlanPrice } = require('./pricingEngine');
const {
  createProviderSubscription,
  findActiveProviderSubscription: findActiveProviderSubscriptionRecord,
  findPlan,
  findPlanById,
  findProviderSubscription,
  findProviderSubscriptionById,
  listPlans,
  mapProviderSubscription,
  updateProviderSubscription,
  updateProviderSubscriptions,
} = require('./billingPersistenceService');

const DURATION_DISCOUNTS = { 1: 0, 3: 10, 6: 15, 12: 20 };

const roundMoney = (value) => Math.max(0, Math.round((Number(value) || 0) * 100) / 100);

const buildExpiryDate = (startDate, durationMonths) => {
  const expiresAt = new Date(startDate);
  expiresAt.setMonth(expiresAt.getMonth() + Math.max(1, Number(durationMonths || 1)));
  return expiresAt;
};

const buildPlanSnapshot = (plan) => {
  const priceMonthly = plan.priceMonthly || plan.price || 0;
  return {
    name: plan.name,
    slug: plan.slug,
    type: plan.type,
    priceMonthly: priceMonthly,
    description: plan.description || '',
    coverageType: plan.coverageType || 'pincode',
    maxSkills: Number(plan.maxSkills || 1),
    maxPincodes: Number(plan.maxPincodes || 1),
    maxCities: Number(plan.maxCities || 1),
    visibilityLevel: plan.visibilityLevel || 'basic',
    priorityWeight: Number(plan.priorityWeight || 0),
    features: Array.isArray(plan.features) ? plan.features : [],
    isPopular: plan.isPopular === true,

    planCategory: plan.planCategory || 'general',
    planType: plan.planType || 'paid',
    billingCycle: plan.billingCycle || 'monthly',
    price: plan.price || 0,
    discountedPrice: plan.discountedPrice || 0,
    duration: plan.duration || 30,
    maxJobApplications: plan.maxJobApplications || 0,
    usageResetCycle: plan.usageResetCycle || 'monthly',
    isCustomisable: plan.isCustomisable || false,
    boostWeight: plan.boostWeight || 0,
    supportsWhatsappAlerts: plan.supportsWhatsappAlerts || false,
    supportsSmsAlerts: plan.supportsSmsAlerts || false,
    supportsPerformanceInsights: plan.supportsPerformanceInsights || false
  };
};

const getSubscriptionLimits = (subscription) => {
  if (!subscription) return null;
  const snapshot = subscription.planSnapshot || {};
  const custom = subscription.customLimits || {};

  const addons = custom.selectedAddons || subscription.selectedAddons || [];
  const addonKeys = addons.map(a => typeof a === 'string' ? a : a.key);
  
  let visibilityLevel = custom.visibilityLevel || snapshot.visibilityLevel || 'basic';
  
  if (addonKeys.includes('show-top-in-country') || addonKeys.includes('visibility_addon_country')) {
    visibilityLevel = 'country_top';
  } else if (addonKeys.includes('top-in-city') || addonKeys.includes('visibility_addon_city')) {
    visibilityLevel = 'city_top';
  } else if (addonKeys.includes('one-pincode-top') || addonKeys.includes('visibility_addon_pincode')) {
    if (visibilityLevel === 'basic') {
      visibilityLevel = 'pincode_top';
    }
  }

  return {
    maxSkills: custom.maxSkills !== null && custom.maxSkills !== undefined ? custom.maxSkills : (snapshot.maxSkills || 1),
    maxPincodes: custom.maxPincodes !== null && custom.maxPincodes !== undefined ? custom.maxPincodes : (snapshot.maxPincodes || 1),
    maxCities: custom.maxCities !== null && custom.maxCities !== undefined ? custom.maxCities : (snapshot.maxCities || 1),
    maxJobApplications: custom.maxJobApplications !== null && custom.maxJobApplications !== undefined ? custom.maxJobApplications : (snapshot.maxJobApplications || 0),
    visibilityLevel: visibilityLevel,
    coverageType: custom.coverageType || snapshot.coverageType || 'pincode',
    durationMonths: custom.durationMonths || subscription.durationMonths || 1,
    selectedSkills: custom.selectedSkills?.length ? custom.selectedSkills : (subscription.selectedSkills || []),
    selectedCities: custom.selectedCities?.length ? custom.selectedCities : (subscription.selectedCities || []),
    selectedPincodes: custom.selectedPincodes?.length ? custom.selectedPincodes : (subscription.selectedPincodes || []),
    ...(snapshot.aiFeatures ? snapshot.aiFeatures : {}),
    supportsSmsAlerts: snapshot.supportsSmsAlerts || false,
    supportsPerformanceInsights: snapshot.supportsPerformanceInsights || false
  };
};


const getActiveProviderSubscription = async (providerId) => {
  let activeSub = await findActiveProviderSubscriptionRecord(providerId);

  if (!activeSub) {
    const user = await prisma.user.findUnique({ where: { id: String(providerId) } });
    if (user && (user.role === 'provider' || user.roles.includes('provider'))) {
      try {
        activeSub = await assignDefaultProviderPlan(providerId);
      } catch (err) {
        console.error('Auto-assignment of default free plan failed:', err.message);
      }
    }
  }

  return activeSub;
};

const getOrCreateCurrentUsage = async (providerId, subscription) => {
  if (!subscription) throw new Error('Subscription is required');
  const now = new Date();
  let periodStart = subscription.startDate || now;
  let periodEnd = subscription.endDate || now;

  const cycle = subscription.usageResetCycle || subscription.planSnapshot?.usageResetCycle || 'monthly';

  if (cycle === 'monthly') {
    const start = new Date(subscription.startDate || now);
    let monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) {
      monthsDiff--;
    }
    monthsDiff = Math.max(0, monthsDiff);
    periodStart = new Date(start);
    periodStart.setMonth(start.getMonth() + monthsDiff);
    periodEnd = new Date(start);
    periodEnd.setMonth(start.getMonth() + monthsDiff + 1);
  } else if (cycle === 'yearly') {
    const start = new Date(subscription.startDate || now);
    let yearsDiff = now.getFullYear() - start.getFullYear();
    if (now.getMonth() < start.getMonth() || (now.getMonth() === start.getMonth() && now.getDate() < start.getDate())) {
      yearsDiff--;
    }
    yearsDiff = Math.max(0, yearsDiff);
    periodStart = new Date(start);
    periodStart.setFullYear(start.getFullYear() + yearsDiff);
    periodEnd = new Date(start);
    periodEnd.setFullYear(start.getFullYear() + yearsDiff + 1);
  }

  // Cap periodEnd at subscription endDate
  if (subscription.endDate && periodEnd > subscription.endDate) {
    periodEnd = subscription.endDate;
  }
  if (periodStart > periodEnd) {
    periodStart = periodEnd;
  }

  const key = {
    providerId: String(providerId), subscriptionId: String(subscription.id || subscription._id),
    periodStart: new Date(periodStart), periodEnd: new Date(periodEnd),
  };
  return withLegacyId(await prisma.providerUsage.upsert({
    where: { providerId_subscriptionId_periodStart_periodEnd: key },
    create: { ...key, metadata: {} }, update: {},
  }));
};

const assignDefaultProviderPlan = async (providerId) => {
  const plan = await findPlan({
    type: 'provider',
    isProviderDefault: true,
    status: 'active',
    isActive: true
  });

  if (!plan) {
    throw new Error('Default provider plan is not configured by admin.');
  }

  const startDate = new Date();
  const durationDays = plan.duration || 365;
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const durationMonths = Math.round(durationDays / 30) || 12;

  await expireOldProviderSubscriptions(providerId);

  const user = await prisma.user.findUnique({ where: { id: String(providerId) } });
  const profile = await findProviderProfileByUserId(providerId);
  const country = (user?.country || profile?.country || 'IN').toUpperCase();

  const priceDetails = await getPlanPrice(plan._id, country);
  const snapshot = buildPlanSnapshot(plan);

  const subscription = await createProviderSubscription({
    providerId,
    planId: plan._id,
    planSnapshot: snapshot,
    durationMonths,
    subtotal: 0,
    gstPercent: priceDetails.taxPercent || 0,
    gstAmount: 0,
    totalAmount: 0,
    paymentStatus: 'paid',
    subscriptionStatus: 'active',
    startDate,
    endDate,
    coverageLabel: 'Default Free Coverage',
    visibilityLevel: plan.visibilityLevel || 'basic',
    priorityWeight: plan.priorityWeight || 0,
    finalAmount: 0,
    currency: priceDetails.currency || 'INR',
    priceSnapshot: priceDetails,
    customConfig: null,
    benefits: null,
    planCategory: plan.planCategory || 'default_free',
    usageResetCycle: plan.usageResetCycle || 'monthly',
    maxJobApplications: plan.maxJobApplications || 5,
    customLimits: {
      maxSkills: plan.maxSkills || 2,
      maxPincodes: plan.maxPincodes || 2,
      maxCities: plan.maxCities || 1,
      maxJobApplications: plan.maxJobApplications || 5,
      visibilityLevel: plan.visibilityLevel || 'basic',
      coverageType: plan.coverageType || 'pincode',
      durationMonths,
      selectedSkills: [],
      selectedCities: [],
      selectedPincodes: []
    }
  });

  const boostWeightByLevel = {
    country_top: 5,
    city_top: 4,
    pincode_top: 3,
    custom: 4,
    basic: 1,
  };
  const visibilityLevel = plan.visibilityLevel || 'basic';

  await ensureProviderProfile(providerId);
  await updateProviderProfile(
    providerId,
    {
      currentPlan: plan.slug,
      activePlanId: plan._id,
      activeSubscriptionId: subscription._id,
      visibilityLevel,
      boostedUntil: endDate,
      allowedSkillsCount: plan.maxSkills || 2,
      allowedPincodesCount: plan.maxPincodes || 2,
      allowedCitiesCount: plan.maxCities || 1,
      planCoverageType: plan.coverageType || 'pincode',
      isTopInPincode: visibilityLevel === 'pincode_top',
      isTopInCity: visibilityLevel === 'city_top',
      isTopInCountry: visibilityLevel === 'country_top',
      isActiveSubscription: true,
      inRotationPool: plan.isRotationEligible || false,
      priorityWeight: Number(plan.priorityWeight || 0),
      boostWeight: Number(boostWeightByLevel[visibilityLevel] || 1),
      customConfig: null,
      benefits: null,
      planBenefitsSnapshot: null
    }
  );

  await getOrCreateCurrentUsage(providerId, subscription);

  return subscription;
};

const calculateCustomProviderPlanPrice = async (payload, country) => {
  return await customPlanService.calculatePrice(payload.items, country);
};

const createFixedPlanSubscription = async (providerId, planId, durationMonths, paymentData = {}) => {
  const plan = await findPlanById(planId);
  if (!plan || plan.type !== 'provider' || !plan.isActive) {
    throw new Error('Plan not found or inactive');
  }

  const activeSubscription = await findActiveProviderSubscriptionRecord(providerId);

  const ADDON_SLUGS = ['top-in-city', 'one-pincode-top', 'show-top-in-country', 'add-multiple-skills', 'whatsapp-alerts'];
  const isPureAddon = ADDON_SLUGS.includes(plan.slug);

  let queueWarning = null;
  if (activeSubscription && !isPureAddon) {
    const formattedDate = new Date(activeSubscription.endDate).toLocaleDateString();
    const diffTime = Math.max(0, new Date(activeSubscription.endDate) - new Date());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (String(activeSubscription.planId) === String(planId)) {
      queueWarning = `You already have this plan active. This renewal will be queued and will automatically start on ${formattedDate} (in ${diffDays} day${diffDays === 1 ? '' : 's'}).`;
    } else {
      queueWarning = `You have an active plan running until ${formattedDate} (${diffDays} day${diffDays === 1 ? '' : 's'} left). This new plan will be queued and automatically activate when your current plan ends.`;
    }
  }

  // Resolve country
  let country = paymentData.preferredCountry;
  if (!country) {
    const user = await prisma.user.findUnique({ where: { id: String(providerId) } });
    country = user?.country;
  }
  if (!country) {
    const profile = await findProviderProfileByUserId(providerId);
    country = profile?.country;
  }
  country = (country || 'IN').toUpperCase();

  // Resolve add-on plans by Plan _id (frontend sends addonIds[] of MongoDB ObjectIds)
  let addonsAmount = 0;
  const resolvedAddons = [];
  const addonIds = paymentData.addonIds || [];
  if (Array.isArray(addonIds) && addonIds.length > 0) {
    const addonPlans = await listPlans({ id: { in: addonIds.map(String) }, type: 'provider', isActive: true });
    for (const addonPlan of addonPlans) {
      const addonMonthly = addonPlan.priceMonthly || addonPlan.price || 0;
      // Each add-on has its own duration; frontend sends addonDurations map {addonId: months}
      const addonDurations = paymentData.addonDurations || {};
      const addonMonths = Number(addonDurations[String(addonPlan._id)] || 1);
      const addonTotal = roundMoney(addonMonthly * addonMonths);
      addonsAmount += addonTotal;
      resolvedAddons.push({
        key: addonPlan.slug,
        planId: addonPlan._id,
        price: addonMonthly,
        durationMonths: addonMonths,
        totalPrice: addonTotal,
        description: addonPlan.name
      });
    }
  }

  // Check availableCountries
  if (plan.availableCountries && plan.availableCountries.length > 0) {
    if (!plan.availableCountries.includes(country)) {
      throw new Error(`Plan is not available in your country (${country}).`);
    }
  }

  const priceDetails = await getPlanPrice(plan._id, country);
  priceDetails.taxPercent = 0; // No GST on provider plans

  const months = Number(durationMonths) || 1;
  const monthlyPrice = priceDetails.discountedPrice > 0 ? priceDetails.discountedPrice : priceDetails.basePrice;
  const discountPercent = DURATION_DISCOUNTS[months] || 0;
  const subtotal = roundMoney(monthlyPrice * months * (1 - discountPercent / 100)) + addonsAmount;
  const gstAmount = 0;
  const totalAmount = subtotal;

  const snapshot = buildPlanSnapshot(plan);

  const subscription = await createProviderSubscription({
    providerId,
    planId: plan._id,
    planSnapshot: snapshot,
    isAutoRenew: paymentData.isAutoSubscription === true,
    durationMonths: months,
    subtotal,
    gstPercent: 0,
    gstAmount: 0,
    totalAmount,
    paymentStatus: totalAmount > 0 ? 'pending' : 'paid',
    subscriptionStatus: totalAmount > 0 ? 'pending' : 'active',
    selectedSkills: paymentData.selectedSkills || [],
    selectedPincodes: paymentData.selectedPincodes || [],
    selectedCities: paymentData.selectedCities || [],
    selectedAddons: resolvedAddons,
    coverageLabel: paymentData.coverageLabel || 'Selected Coverage',
    visibilityLevel: plan.visibilityLevel || 'basic',
    priorityWeight: plan.priorityWeight || 0,
    finalAmount: totalAmount,
    currency: priceDetails.currency || 'INR',
    priceSnapshot: priceDetails,
    paymentProvider: paymentData.paymentProvider || 'manual',
    customConfig: null,
    benefits: null,
    planCategory: plan.planCategory || 'general',
    usageResetCycle: plan.usageResetCycle || 'monthly',
    maxJobApplications: plan.maxJobApplications || 0
  });

  if (totalAmount <= 0) {
    // Instantly activate free plan purchases
    await activatePaidSubscription(subscription._id, {
      paymentId: 'free_' + Date.now(),
      orderId: 'free_order_' + Date.now()
    });
  }

  return { subscription, queueWarning };
};

const createCustomPlanSubscription = async (providerId, customPayload, paymentData = {}) => {
  const plan = await findPlan({ slug: 'customise-plan', isActive: true });
  if (!plan) {
    throw new Error('Customise Plan template not found in system.');
  }

  const activeSubscription = await findActiveProviderSubscriptionRecord(providerId);

  let queueWarning = null;
  if (activeSubscription) {
    if (String(activeSubscription.planId) === String(plan._id)) {
      throw new Error('You already have a custom plan active. Please wait for it to expire or upgrade your current features.');
    } else {
      const formattedDate = new Date(activeSubscription.endDate).toLocaleDateString();
      queueWarning = `You already have an active plan. This custom plan will be queued and will automatically activate on ${formattedDate}.`;
    }
  }

  // Resolve country
  let country = paymentData.preferredCountry;
  if (!country) {
    const user = await prisma.user.findUnique({ where: { id: String(providerId) } });
    country = user?.country;
  }
  if (!country) {
    const profile = await findProviderProfileByUserId(providerId);
    country = profile?.country;
  }
  country = (country || 'IN').toUpperCase();

  const calculated = await calculateCustomProviderPlanPrice({ items: customPayload.items }, country);
  const subtotal = calculated.subtotal;
  const gstAmount = calculated.gstAmount;
  const totalAmount = calculated.totalAmount;
  const gstPercent = calculated.gstPercent || 0;

  const snapshot = buildPlanSnapshot(plan);

  const flatSkills = Array.from(new Set(customPayload.items.map(i => i.skillName)));
  const flatLocalities = [];
  const flatCities = [];

  customPayload.items.forEach(item => {
    if (item.visibilityType === 'locality') {
      item.locations.forEach(loc => {
        const label = loc.pincode ? `${loc.locality || loc.name} (${loc.pincode})` : loc.locality || loc.name;
        if (label && !flatLocalities.includes(label)) flatLocalities.push(label);
      });
    } else if (item.visibilityType === 'city') {
      item.locations.forEach(loc => {
        if (loc.city && !flatCities.includes(loc.city)) flatCities.push(loc.city);
      });
    }
  });

  const customLimits = {
    maxSkills: flatSkills.length,
    maxPincodes: flatLocalities.length,
    maxCities: flatCities.length,
    maxJobApplications: 50, // Higher default limit for customized premium visibility plans
    visibilityLevel: 'custom',
    coverageType: 'custom',
    durationMonths: customPayload.durationMonths || 1,
    selectedSkills: flatSkills,
    selectedCities: flatCities,
    selectedPincodes: flatLocalities
  };

  const priceSnapshot = {
    countryCode: country,
    countryName: country === 'IN' ? 'India' : country,
    currency: paymentData.currency || 'INR',
    basePrice: subtotal,
    discountedPrice: subtotal,
    taxName: 'GST',
    taxPercent: gstPercent,
    taxAmount: gstAmount,
    finalAmount: totalAmount
  };

  const subscription = await createProviderSubscription({
    providerId,
    planId: plan._id,
    planSnapshot: snapshot,
    durationMonths: customPayload.durationMonths || 1,
    subtotal,
    gstPercent,
    gstAmount,
    totalAmount,
    paymentStatus: totalAmount > 0 ? 'pending' : 'paid',
    subscriptionStatus: totalAmount > 0 ? 'pending' : 'active',
    selectedSkills: flatSkills,
    selectedPincodes: flatLocalities,
    selectedCities: flatCities,
    coverageLabel: 'Custom Dynamic Coverage',
    visibilityLevel: 'custom',
    priorityWeight: plan.priorityWeight || 0,
    finalAmount: totalAmount,
    currency: paymentData.currency || 'INR',
    priceSnapshot,
    paymentProvider: paymentData.paymentProvider || 'manual',
    customConfig: customPayload.customConfig || null,
    benefits: customPayload.benefits || null,
    planCategory: 'custom',
    usageResetCycle: 'monthly', // default cycle for custom plans
    maxJobApplications: 50,
    customLimits
  });

  if (totalAmount <= 0) {
    await activatePaidSubscription(subscription._id, {
      paymentId: 'free_custom_' + Date.now(),
      orderId: 'free_custom_order_' + Date.now()
    });
  }

  return { subscription, queueWarning };
};

const expireOldProviderSubscriptions = async (providerId) => {
  await updateProviderSubscriptions(
    { providerId, subscriptionStatus: 'active' },
    { subscriptionStatus: 'expired' }
  );
};


const activatePaidSubscription = async (subscriptionId, paymentData = {}) => {
  // ATOMIC LOCK: Find the subscription ONLY if it is pending activation.
  // This prevents double-fulfillment if the webhook and frontend both hit this at the same time.
  const claimed = await prisma.providerSubscription.updateMany({
    where: { id: String(subscriptionId), subscriptionStatus: 'pending' },
    data: { paymentStatus: 'paid' },
  });
  const subscription = claimed.count
    ? mapProviderSubscription(await prisma.providerSubscription.findUnique({ where: { id: String(subscriptionId) } }))
    : null;

  if (!subscription) {
    // If it's not found or already active/queued, just return the existing one.
    const existing = await findProviderSubscriptionById(subscriptionId);
    if (existing && existing.subscriptionStatus !== 'pending') return existing;
    throw new Error('Subscription not found or already processed');
  }

  const now = new Date();

  // SPECIAL HANDLING FOR WHATSAPP ADD-ON PLAN
  if (subscription.planSnapshot?.slug === 'whatsapp-alerts') {
    const endDate = buildExpiryDate(now, subscription.durationMonths);
    
    Object.assign(subscription, await updateProviderSubscription(subscription._id, {
      subscriptionStatus: 'active',
      paymentId: paymentData.paymentId || '',
      orderId: paymentData.orderId || '',
      startDate: now,
      endDate,
    }));

    await ensureProviderProfile(subscription.providerId);
    await updateProviderProfile(
      subscription.providerId,
      {
        whatsappFreelancePlanActive: true,
        whatsappFreelancePlanExpiry: endDate,
        whatsappFreelancePlanSubscriptionId: String(subscription._id)
      }
    );
    return subscription;
  }

  // LOGIC FOR MAIN & VISIBILITY PLANS
  const currentActive = await findProviderSubscription({
    providerId: subscription.providerId,
    id: { not: subscription._id },
    subscriptionStatus: 'active',
    endDate: { gt: now }
  });

  const plan = await findPlanById(subscription.planId);
  const ADDON_SLUGS = ['top-in-city', 'one-pincode-top', 'show-top-in-country', 'add-multiple-skills', 'whatsapp-alerts'];
  const isPureAddon = plan && ADDON_SLUGS.includes(plan.slug);

  // If the user has an active plan, queue this new plan behind the current active cycle (Opt B).
  if (currentActive && !isPureAddon) {
    const startDate = new Date(currentActive.endDate);
    const endDate = buildExpiryDate(startDate, subscription.durationMonths);

    Object.assign(subscription, await updateProviderSubscription(subscription._id, {
      subscriptionStatus: 'pending',
      paymentId: paymentData.paymentId || '',
      orderId: paymentData.orderId || '',
      startDate,
      endDate,
    }));

    return subscription;
  }

  // Activate immediately
  const endDate = buildExpiryDate(now, subscription.durationMonths);

  if (!isPureAddon) {
    await expireOldProviderSubscriptions(subscription.providerId);
  }

  Object.assign(subscription, await updateProviderSubscription(subscription._id, {
    subscriptionStatus: 'active',
    paymentId: paymentData.paymentId || '',
    orderId: paymentData.orderId || '',
    startDate: now,
    endDate,
  }));

  const limits = getSubscriptionLimits(subscription);

  const boostWeightByLevel = {
    country_top: 5,
    city_top: 4,
    pincode_top: 3,
    custom: 4,
    basic: 1,
  };
  const visibilityLevel = limits.visibilityLevel || 'basic';

  const updateFields = {
    currentPlan: subscription.planSnapshot.slug,
    activePlanId: subscription.planId,
    activeSubscriptionId: subscription._id,
    visibilityLevel,
    boostedUntil: endDate,
    allowedSkillsCount: limits.maxSkills,
    allowedPincodesCount: limits.maxPincodes,
    allowedCitiesCount: limits.maxCities,
    planCoverageType: limits.coverageType,
    isTopInPincode: visibilityLevel === 'pincode_top',
    isTopInCity: visibilityLevel === 'city_top',
    isTopInCountry: visibilityLevel === 'country_top',
    isActiveSubscription: true,
    inRotationPool: true,
    priorityWeight: Number(subscription.priorityWeight || 0),
    boostWeight: Number(boostWeightByLevel[visibilityLevel] || 1),
    customConfig: subscription.customConfig || null,
    benefits: subscription.benefits || null,
    planBenefitsSnapshot: subscription.benefits || null
  };

  const hasWhatsappAddon = subscription.planSnapshot?.slug === 'whatsapp-alerts' || 
                           (subscription.selectedAddons || []).some(a => (a.key === 'whatsapp-alerts' || a === 'whatsapp-alerts'));
  if (hasWhatsappAddon) {
    updateFields.whatsappFreelancePlanActive = true;
  }

  // Sync selected options into profile for active queries
  let profile = await findProviderProfileByUserId(subscription.providerId);
  if (!profile) {
    profile = await createProviderProfile({
      user: subscription.providerId,
      profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
  }

  const existingSkills = Array.isArray(profile.skills) ? profile.skills : [];
  const subscriptionSkills = Array.isArray(limits.selectedSkills) ? limits.selectedSkills : [];
  updateFields.skills = [...new Set([...existingSkills, ...subscriptionSkills])];

  const existingLocations = Array.isArray(profile.locations) ? profile.locations : [];
  const subscriptionPincodes = Array.isArray(limits.selectedPincodes) ? limits.selectedPincodes : [];
  const subscriptionCities = Array.isArray(limits.selectedCities) ? limits.selectedCities : [];
  updateFields.locations = [...new Set([...existingLocations, ...subscriptionPincodes, ...subscriptionCities])];

  await updateProviderProfile(subscription.providerId, updateFields);

  // Initialize the usage metrics for the active period
  const currentUsage = await getOrCreateCurrentUsage(subscription.providerId, subscription);

  // Update limit snapshot for usage limit middleware
  await prisma.providerUsage.update({
    where: { id: currentUsage._id },
    data: { metadata: { ...currentUsage.metadata, limitSnapshot: limits } },
  });

  // Dispatch payment receipt email
  if (paymentData.paymentId && !paymentData.paymentId.startsWith('free_')) {
    prisma.user.findUnique({ where: { id: String(subscription.providerId) } }).then(withLegacyId).then(user => {
      if (user && user.email) {
        const htmlContent = generatePaymentReceipt(user, subscription, paymentData);
        sendMail({
          to: user.email,
          subject: 'Payment Successful! 🎉 Your Plan is Active',
          html: htmlContent
        }).catch(err => console.error('Failed to send payment receipt:', err.message));
      }
    }).catch(err => console.error('Error fetching user for receipt:', err.message));
  }

  return subscription;
};

module.exports = {
  getActiveProviderSubscription,
  getOrCreateCurrentUsage,
  assignDefaultProviderPlan,
  buildPlanSnapshot,
  getSubscriptionLimits,
  calculateCustomProviderPlanPrice,
  createFixedPlanSubscription,
  createCustomPlanSubscription,
  expireOldProviderSubscriptions,
  activatePaidSubscription
};
