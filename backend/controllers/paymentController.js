const { getPrismaClient, withPrismaTransaction } = require('../repositories/prismaContext');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { findProviderProfileByUserId, saveProviderProfile } = require('../services/providerProfilePersistenceService');
const { findRecruiterProfileByUserId, saveRecruiterProfile } = require('../services/recruiterCompanyPersistenceService');
const crypto = require('crypto');
const { getPaymentConfig, getRazorpayInstance, verifyPaymentSignature } = require('../utils/razorpay');
const { getStripeInstance } = require('../utils/stripe');
const { getExchangeRates } = require('../utils/exchangeRates');
const { updateUserBadge } = require('../services/badgeService');
const { createNotification } = require('../services/notificationService');
const { getActiveBillingRule, buildBillingRuleSnapshot, calculateBillingAmounts, resolveCountryGstPercent } = require('../utils/billingRuleUtils');
const {
  countUserSubscriptions,
  createPayment,
  createUserSubscription,
  findActiveUserSubscription,
  findPayment,
  findPaymentById,
  findPlanById,
  findProviderSubscription,
  findUserSubscription,
  listPayments,
  mapPayment,
  mapProviderSubscription,
  updatePayment,
  updateProviderSubscription,
  updateUserSubscription,
  updateUserSubscriptions,
} = require('../services/billingPersistenceService');

const DEFAULT_PARTNER_COMMISSION_RATE = 40;
const roundMoney = (value) => Math.max(0, Math.round((Number(value) || 0) * 100) / 100);

const completePaymentIfPending = async (id, data) => {
  const result = await prisma.payment.updateMany({
    where: { id: String(id), status: { not: 'completed' } },
    data,
  });
  return result.count ? findPayment({ id: String(id) }, { includePlan: true }) : null;
};

const resolvePartnerCommissionRate = async (partnerProfile, referral) => {
  if (Number.isFinite(Number(partnerProfile?.commissionRate))) {
    return Number(partnerProfile.commissionRate);
  }
  const setting = await prisma.adminSetting.findUnique({ where: { key: 'default_partner_commission_rate' } });
  const settingRate = Number(setting?.value);
  if (Number.isFinite(settingRate) && settingRate > 0) return settingRate;
  const fallbackReferralRate = Number(referral?.commissionRate);
  if (Number.isFinite(fallbackReferralRate) && fallbackReferralRate > 0) return fallbackReferralRate;
  return DEFAULT_PARTNER_COMMISSION_RATE;
};

const processReferralCommission = async ({ userId, plan, payment }) => {
  if (!userId || !plan) return null;
  const referral = withLegacyId(await prisma.referral.findFirst({ where: { referredUserId: String(userId) } }));
  if (!referral || referral.commissionStatus === 'paid') return null;

  // Ensure this is the first successful subscription of the main user account
  const subscriptionCount = await countUserSubscriptions({
    userId,
    status: { in: ['active', 'expired'] },
  });
  if (subscriptionCount > 1) return null;

  const planAmount = Number(plan.price || payment?.amount || 0);
  let commissionRate = 0;
  let commissionAmount = 0;

  const subscription = await findUserSubscription({
    userId,
    status: { in: ['active', 'expired'] },
  }, { orderBy: { createdAt: 'desc' } });

  if (referral.referrerType === 'partner') {
    const partnerProfile = referral.partnerProfileId
      ? await prisma.partnerProfile.findUnique({ where: { id: referral.partnerProfileId } })
      : await prisma.partnerProfile.findUnique({ where: { userId: referral.referrerId } });

    if (!partnerProfile) return null;

    commissionRate = await resolvePartnerCommissionRate(partnerProfile, referral);
    commissionAmount = roundMoney(planAmount * (commissionRate / 100));

    // Update partner commission
    await prisma.commissionTransaction.create({ data: {
      partnerId: referral.referrerId,
      referralId: referral._id,
      referredUserId: referral.referredUserId,
      subscriptionId: subscription?._id || null,
      paymentId: payment?._id || null,
      planAmount,
      commissionRate,
      commissionAmount,
      status: 'earned',
    } });

    await prisma.partnerProfile.update({ where: { id: partnerProfile.id }, data: {
        totalRevenueCollected: { increment: planAmount },
        totalCommissionEarned: { increment: commissionAmount },
        availableCommission: { increment: commissionAmount },
      },
    });
  } else if (referral.referrerType === 'user') {
    const setting = await prisma.adminSetting.findUnique({ where: { key: 'user_referral_commission_percentage' } });
    commissionRate = Number(setting?.value) || 40; // Default 40% if not set
    commissionAmount = roundMoney(planAmount * (commissionRate / 100));

    // Update user referral wallet
    await prisma.user.updateMany({ where: { id: referral.referrerId }, data: {
        referralWalletBalance: { increment: commissionAmount },
        totalReferralCommission: { increment: commissionAmount },
      },
    });

    // Create wallet transaction
    await prisma.walletTransaction.create({ data: {
      userId: referral.referrerId,
      type: 'user_referral_commission',
      amount: commissionAmount,
      sourceUserId: userId,
      sourceSubscriptionId: subscription?._id || null,
      description: `Referral commission from ${plan.name} purchase`,
      status: 'credited',
    } });
  }

  // Update referral record
  await prisma.referral.update({ where: { id: referral._id }, data: {
    status: 'subscribed',
    commissionStatus: 'paid',
    firstSubscriptionId: subscription?._id || null,
    subscriptionAmount: planAmount,
    commissionPercentage: commissionRate,
    commissionAmount,
    paidAt: new Date(),
  } });

  await prisma.user.updateMany({ where: { id: String(userId) }, data: { firstSubscriptionCompleted: true } });

  return { commissionAmount, commissionRate };
};

async function getCurrentActivePlan(userId, role) {
  const activeSub = await findActiveUserSubscription(userId, role, true);

  return activeSub?.planId || null;
}

function isNonUpgrade(currentPlan, nextPlan) {
  if (!currentPlan || !nextPlan) return false;
  
  // Upgrading from a free plan is always allowed
  if (currentPlan.slug === 'free' || currentPlan.planType === 'free' || currentPlan.price === 0) return false;

  const currentOrder = Number(currentPlan.sortOrder || 0);
  const nextOrder = Number(nextPlan.sortOrder || 0);
  
  if (currentOrder !== nextOrder) {
    return nextOrder < currentOrder;
  }
  
  // If sortOrder is the same, use price to determine upgrade
  const currentPrice = Number(currentPlan.price || 0);
  const nextPrice = Number(nextPlan.price || 0);
  
  // Allow purchase if new plan has higher or equal price
  if (nextPrice >= currentPrice) return false;
  
  return true;
}

async function notifyPlanPurchased(userId, plan, paymentId) {
  if (!plan) return;
  await createNotification({
    userId,
    type: 'PLAN_PURCHASED',
    title: 'Plan Purchased',
    message: `Your ${plan.name} plan has been activated successfully`,
    data: {
      planId: plan._id,
      planSlug: plan.slug,
      paymentId,
    },
  });
}

// Helper: update rotation pool
async function updateRotationPool(skill, city, profileId) {
  const poolSize = parseInt(process.env.ROTATION_POOL_SIZE || 5);
  let pool = await prisma.rotationPool.findFirst({ where: { skill: skill.toLowerCase(), city: city.toLowerCase() } });
  if (!pool) {
    pool = await prisma.rotationPool.create({ data: {
      skill: skill.toLowerCase(),
      city: city.toLowerCase(),
      providers: [{ provider: profileId }],
      maxPoolSize: poolSize,
    } });
  } else {
    const exists = pool.providers.some(p => p.provider.toString() === profileId.toString());
    if (!exists && pool.providers.length < pool.maxPoolSize) {
      pool.providers.push({ provider: profileId });
      await prisma.rotationPool.update({ where: { id: pool.id }, data: { providers: pool.providers } });
    }
  }
}

// Helper: activate plan on a provider profile
async function activateProviderPlan(userId, plan, billingData = null, priceSnapshot = null) {
  const profile = await findProviderProfileByUserId(userId);
  if (!profile) return;
  profile.currentPlan = plan.slug;
  profile.planExpiresAt = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
  profile.boostWeight = plan.boostWeight || 0;
  profile.isTopCity = plan.isRotationEligible || false;
  profile.inRotationPool = plan.isRotationEligible || false;

  if (plan.supportsWhatsappAlerts) {
    profile.whatsappFreelancePlanActive = true;
    profile.whatsappFreelancePlanExpiry = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
  }

  await saveProviderProfile(profile);

  if (plan.isRotationEligible && profile.skills.length > 0 && profile.city) {
    for (const skill of profile.skills) {
      await updateRotationPool(skill, profile.city, profile._id);
    }
  }

  let finalBilling = billingData;
  if (!finalBilling) {
    const activeRule = await getActiveBillingRule();
    const snapshot = buildBillingRuleSnapshot(activeRule);
    const calculated = calculateBillingAmounts(plan.price || 0, activeRule);
    finalBilling = {
      billingRuleSnapshot: snapshot,
      platformCommissionAmount: calculated.platformCommissionAmount,
      providerShareAmount: calculated.providerShareAmount,
      referralCommissionAmount: calculated.referralCommissionAmount,
      cashbackAmount: calculated.cashbackAmount,
      netPlatformRevenue: calculated.netPlatformRevenue
    };
  }

  let baseAmount = plan.price || 0;
  let gstPercent = 0;
  if (finalBilling && finalBilling.billingRuleSnapshot) {
    const activeRule = finalBilling.billingRuleSnapshot;
    gstPercent = resolveCountryGstPercent(profile.country || 'IN', activeRule);
  } else {
    const activeRule = await getActiveBillingRule();
    gstPercent = resolveCountryGstPercent(profile.country || 'IN', activeRule);
  }
  let gstAmount = roundMoney((baseAmount * gstPercent) / 100);
  let totalAmount = roundMoney(baseAmount + gstAmount);
  let currency = 'INR';

  let resolvedPriceSnapshot = priceSnapshot;
  if (!resolvedPriceSnapshot && plan && plan._id !== 'custom') {
    try {
      const { getPlanPrice } = require('../services/pricingEngine');
      const country = profile.country || 'IN';
      resolvedPriceSnapshot = await getPlanPrice(plan._id, country);
    } catch (e) {
      console.error("Failed to generate priceSnapshot on the fly:", e);
    }
  }

  if (resolvedPriceSnapshot) {
    baseAmount = resolvedPriceSnapshot.discountedPrice > 0 ? resolvedPriceSnapshot.discountedPrice : resolvedPriceSnapshot.basePrice;
    gstPercent = resolvedPriceSnapshot.taxPercent;
    gstAmount = resolvedPriceSnapshot.taxAmount;
    totalAmount = resolvedPriceSnapshot.finalAmount;
    currency = resolvedPriceSnapshot.currency;
  }

  // Create UserSubscription and update badge
  await updateUserSubscriptions({ userId: String(userId), role: 'provider', status: 'active' }, { status: 'expired' });
  await createUserSubscription({
    userId,
    role: 'provider',
    planId: plan._id,
    startDate: new Date(),
    endDate: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
    status: 'active',
    amount: baseAmount,
    gstAmount: gstAmount,
    totalAmount: totalAmount,
    currency,
    priceSnapshot: resolvedPriceSnapshot,
    ...finalBilling
  });
  await updateUserBadge(userId);

  return profile;
}

// Helper: activate plan on a recruiter profile
async function activateRecruiterPlan(userId, plan, customMetadata = {}, billingData = null, priceSnapshot = null) {
  const profile = await findRecruiterProfileByUserId(userId);
  if (!profile) return;

  const planName = customMetadata.customName || plan?.name || 'custom';
  const planSlug = plan?.slug || 'custom';
  const durationDays = Number(customMetadata.customDuration || plan?.duration || 30);
  const creditsToAdd = Number(customMetadata.customCredits || plan?.unlockCredits || 0);

  profile.currentPlan = planSlug;
  profile.planExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  profile.unlocksRemaining += creditsToAdd;
  profile.unlockPackSize = creditsToAdd;

  const isCustom = plan?.planType === 'custom' || customMetadata?.customName;
  if (isCustom) {
    const targetPlanId = plan?._id || customMetadata?.planId;
    if (targetPlanId) {
      const customReq = await prisma.customPlanRequest.findFirst({
        where: { offerDetails: { path: ['planId'], equals: String(targetPlanId) } },
      });
      if (customReq) {
        profile.boostJobsRemaining += customReq.boostJobs || 0;
        profile.boostDaysRemaining += customReq.boostDays || 0;
        await prisma.customPlanRequest.update({
          where: { id: customReq.id },
          data: {
            status: 'closed',
            offerDetails: {
              ...(customReq.offerDetails || {}), status: 'accepted', purchasedAt: new Date().toISOString(),
            },
          },
        });
      }
    }
  } else if (plan) {
    if (plan.aiLimits) {
      if (plan.aiLimits.jobBoostJobsLimit) {
        profile.boostJobsRemaining += plan.aiLimits.jobBoostJobsLimit;
      } else if (plan.aiLimits.jobPostLimit) {
        profile.boostJobsRemaining += plan.aiLimits.jobPostLimit;
      }
      
      if (plan.aiLimits.jobBoostDaysLimit) {
        profile.boostDaysRemaining += plan.aiLimits.jobBoostDaysLimit;
      }
    }
  }

  await saveRecruiterProfile(profile);

  let finalBilling = billingData;
  if (!finalBilling) {
    const activeRule = await getActiveBillingRule();
    const snapshot = buildBillingRuleSnapshot(activeRule);
    const amount = customMetadata.customName ? (creditsToAdd * 10) : (plan?.price || 0);
    const calculated = calculateBillingAmounts(amount, activeRule);
    finalBilling = {
      billingRuleSnapshot: snapshot,
      platformCommissionAmount: calculated.platformCommissionAmount,
      providerShareAmount: calculated.providerShareAmount,
      referralCommissionAmount: calculated.referralCommissionAmount,
      cashbackAmount: calculated.cashbackAmount,
      netPlatformRevenue: calculated.netPlatformRevenue
    };
  }

  let baseAmount = customMetadata.customName ? (creditsToAdd * 10) : (plan?.price || 0);
  let gstPercent = 0;
  if (finalBilling && finalBilling.billingRuleSnapshot) {
    const activeRule = finalBilling.billingRuleSnapshot;
    gstPercent = resolveCountryGstPercent(profile.country || 'IN', activeRule);
  } else {
    const activeRule = await getActiveBillingRule();
    gstPercent = resolveCountryGstPercent(profile.country || 'IN', activeRule);
  }
  let gstAmount = roundMoney((baseAmount * gstPercent) / 100);
  let totalAmount = roundMoney(baseAmount + gstAmount);
  let currency = 'INR';

  let resolvedPriceSnapshot = priceSnapshot;
  if (!resolvedPriceSnapshot && plan && plan._id !== 'custom') {
    try {
      const { getPlanPrice } = require('../services/pricingEngine');
      const country = profile.country || 'IN';
      resolvedPriceSnapshot = await getPlanPrice(plan._id, country);
    } catch (e) {
      console.error("Failed to generate priceSnapshot on the fly:", e);
    }
  }

  if (resolvedPriceSnapshot) {
    baseAmount = resolvedPriceSnapshot.discountedPrice > 0 ? resolvedPriceSnapshot.discountedPrice : resolvedPriceSnapshot.basePrice;
    gstPercent = resolvedPriceSnapshot.taxPercent;
    gstAmount = resolvedPriceSnapshot.taxAmount;
    totalAmount = resolvedPriceSnapshot.finalAmount;
    currency = resolvedPriceSnapshot.currency;
  }

  // Create UserSubscription and update badge
  await updateUserSubscriptions({ userId: String(userId), role: 'recruiter', status: 'active' }, { status: 'expired' });
  await createUserSubscription({
    userId,
    role: 'recruiter',
    planId: plan?._id || undefined,
    planCode: plan?.slug || plan?.code || '',
    startDate: new Date(),
    endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
    status: 'active',
    amount: baseAmount,
    gstAmount: gstAmount,
    totalAmount: totalAmount,
    currency,
    priceSnapshot: resolvedPriceSnapshot,
    unlockCreditsTotal: creditsToAdd,
    unlockCreditsUsed: 0,
    unlockCreditsRemaining: creditsToAdd,
    ...finalBilling
  });
  await updateUserBadge(userId);

  return profile;
}

async function activatePlanByType(userId, plan, customMetadata = {}, billingData = null, priceSnapshot = null) {
  if (!plan && !customMetadata.customName) return null;
  if (plan?.type === 'provider') return activateProviderPlan(userId, plan, billingData, priceSnapshot);
  // Recruiter plans can be custom
  if (plan?.type === 'recruiter' || customMetadata.customName) {
    return activateRecruiterPlan(userId, plan, customMetadata, billingData, priceSnapshot);
  }
  return null;
}

async function getProfileByPlanType(userId, planType) {
  if (planType === 'provider') return findProviderProfileByUserId(userId);
  if (planType === 'recruiter') return findRecruiterProfileByUserId(userId);
  return null;
}

const SUPPORTED_CHECKOUT_CURRENCIES = new Set(['INR', 'USD', 'AED']);
const COUNTRY_TO_CURRENCY = {
  IN: 'INR',
  AE: 'AED',
};

const normalizeCountry = (value) => {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : '';
};

const normalizeCurrency = (value) => {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : '';
};

const resolveCheckoutMoney = async ({ plan, preferredCurrency, preferredCountry, userCurrency }) => {
  const fallbackCurrency = normalizeCurrency(plan?.currency) || 'INR';
  const countryCurrency = COUNTRY_TO_CURRENCY[normalizeCountry(preferredCountry)] || '';
  const requestedCurrency = normalizeCurrency(preferredCurrency) || countryCurrency || normalizeCurrency(userCurrency) || fallbackCurrency;
  const selectedCurrency = SUPPORTED_CHECKOUT_CURRENCIES.has(requestedCurrency) ? requestedCurrency : 'INR';

  const baseInr = Number(plan?.price || 0);
  const directUsd = Number(plan?.priceUSD || 0);
  const directAed = Number(plan?.priceAED || 0);

  if (selectedCurrency === 'INR') {
    return {
      amount: Number(baseInr.toFixed(2)),
      currency: 'INR',
      exchangeSource: 'plan-inr',
    };
  }

  if (selectedCurrency === 'USD' && Number.isFinite(directUsd) && directUsd > 0) {
    return {
      amount: Number(directUsd.toFixed(2)),
      currency: 'USD',
      exchangeSource: 'plan-usd',
    };
  }

  if (selectedCurrency === 'AED' && Number.isFinite(directAed) && directAed > 0) {
    return {
      amount: Number(directAed.toFixed(2)),
      currency: 'AED',
      exchangeSource: 'plan-aed',
    };
  }

  const exchangeRates = await getExchangeRates();
  if (selectedCurrency === 'USD') {
    const converted = baseInr * Number(exchangeRates.INR_USD || 0);
    return {
      amount: Number(converted.toFixed(2)),
      currency: 'USD',
      exchangeSource: exchangeRates.source || 'exchange-rate',
    };
  }

  const converted = baseInr * Number(exchangeRates.INR_AED || 0);
  return {
    amount: Number(converted.toFixed(2)),
    currency: 'AED',
    exchangeSource: exchangeRates.source || 'exchange-rate',
  };
};

/**
 * @desc    Returns the Stripe publishable key + simulation mode flag
 * @route   GET /api/payments/config
 * @access  Private
 */
const getPaymentPublicConfig = async (req, res) => {
  try {
    const config = await getPaymentConfig();
    const configured = Boolean(
      config.simulationMode || config.keyId,
    );

    const [pincodeAddon, cityAddon, countryAddon] = await Promise.all([
      prisma.adminSetting.findUnique({ where: { key: 'visibility_addon_pincode' } }),
      prisma.adminSetting.findUnique({ where: { key: 'visibility_addon_city' } }),
      prisma.adminSetting.findUnique({ where: { key: 'visibility_addon_country' } }),
    ]);

    res.json({
      publishableKey: config.keyId, // Using publishableKey key for frontend compat
      simulationMode: config.simulationMode,
      configured,
      addonPrices: {
        visibility_addon_pincode: pincodeAddon ? Number(pincodeAddon.value) : 100,
        visibility_addon_city: cityAddon ? Number(cityAddon.value) : 200,
        visibility_addon_country: countryAddon ? Number(countryAddon.value) : 500,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Create a Stripe Checkout Session (or simulate a payment)
 * @route   POST /api/payments/create-order
 * @access  Private
 * @body    { planId, successUrl, cancelUrl }
 */
const createOrder = async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl, preferredCurrency, preferredCountry, customConfig } = req.body;
    if (!planId) return res.status(400).json({ message: 'planId is required' });

    let basePlanId = planId;
    let durationMultiplier = 1;
    let discountMultiplier = 1;
    let planSuffix = '';
    let isVariant = false;

    if (planId && typeof planId === 'string') {
      if (planId.endsWith('_quarterly')) {
        basePlanId = planId.replace('_quarterly', '');
        durationMultiplier = 3;
        discountMultiplier = 0.9;
        planSuffix = '-quarterly';
        isVariant = true;
      } else if (planId.endsWith('_yearly')) {
        basePlanId = planId.replace('_yearly', '');
        durationMultiplier = 12;
        discountMultiplier = 0.8;
        planSuffix = '-yearly';
        isVariant = true;
      }
    }

    let plan;
    if (basePlanId === 'custom') {
      if (!customConfig || !customConfig.price || !customConfig.unlockCredits) {
        return res.status(400).json({ message: 'Invalid custom plan configuration' });
      }
      // Create a transient plan object for custom orders
      plan = {
        _id: 'custom',
        name: customConfig.name || 'Custom Plan',
        price: customConfig.price,
        currency: customConfig.currency || 'INR',
        unlockCredits: customConfig.unlockCredits,
        duration: customConfig.duration || 30,
        type: 'recruiter',
        slug: 'custom',
        isActive: true,
      };
    } else {
      plan = await findPlanById(basePlanId);
      if (!plan) return res.status(404).json({ message: 'Plan not found' });
      if (!plan.isActive) return res.status(400).json({ message: 'Plan is not active' });
    }

    const currentRole = req.user.activeRole || req.user.role;
    if (currentRole !== plan.type && currentRole !== 'admin') {
      return res.status(403).json({ message: 'Plan not available for your role' });
    }

    // Block non-upgrade purchases; only higher tier upgrades are allowed.
    // (Skip for custom plans as they are usually specific add-ons or tailored needs)
    if (basePlanId !== 'custom' && plan?.planType !== 'custom') {
      const activePlan = await getCurrentActivePlan(req.user._id, plan.type);
      if (isNonUpgrade(activePlan, plan)) {
        return res.status(400).json({
          message: `Only upgrades are allowed. Your current plan is '${activePlan.name}'. Please choose a higher plan.`,
        });
      }
    }

    const config = await getPaymentConfig();

    // Resolve user country
    let country = preferredCountry || req.user?.country;
    if (!country && req.user) {
      const profile = await (req.user.activeRole === 'provider' 
        ? findProviderProfileByUserId(req.user._id)
        : findRecruiterProfileByUserId(req.user._id));
      country = profile?.country;
    }
    if (!country) {
      country = 'IN';
    }
    country = country.toUpperCase();

    // Check availableCountries
    if (basePlanId !== 'custom' && plan.availableCountries && plan.availableCountries.length > 0) {
      if (!plan.availableCountries.includes(country)) {
        return res.status(400).json({
          message: `Plan is not available in your country (${country}).`,
        });
      }
    }

    let priceDetails = null;
    let baseAmount = 0;
    let gstPercent = 0;
    let gstAmount = 0;
    let totalAmount = 0;
    let checkoutCurrency = 'INR';

    if (basePlanId !== 'custom') {
      const { getPlanPrice } = require('../services/pricingEngine');
      priceDetails = await getPlanPrice(plan._id, country);
      
      let initialActivePrice = priceDetails.discountedPrice > 0 ? priceDetails.discountedPrice : priceDetails.basePrice;
      
      if (isVariant) {
        const scaleFactor = durationMultiplier * discountMultiplier;
        priceDetails.basePrice = Number((priceDetails.basePrice * durationMultiplier).toFixed(2));
        priceDetails.discountedPrice = Number((initialActivePrice * scaleFactor).toFixed(2));
        priceDetails.taxAmount = Number((priceDetails.taxAmount * scaleFactor).toFixed(2));
        priceDetails.finalAmount = Number((priceDetails.finalAmount * scaleFactor).toFixed(2));
      }

      baseAmount = priceDetails.discountedPrice > 0 ? priceDetails.discountedPrice : priceDetails.basePrice;
      gstPercent = priceDetails.taxPercent;
      gstAmount = priceDetails.taxAmount;
      totalAmount = priceDetails.finalAmount;
      checkoutCurrency = priceDetails.currency;
    } else {
      // For customise plan, resolve checkout money using old logic
      const checkoutMoney = await resolveCheckoutMoney({
        plan,
        preferredCurrency,
        preferredCountry,
        userCurrency: req.user?.currency,
      });
      const activeRule = await getActiveBillingRule();
      gstPercent = resolveCountryGstPercent(country, activeRule);
      baseAmount = checkoutMoney.amount;
      gstAmount = roundMoney((baseAmount * gstPercent) / 100);
      totalAmount = roundMoney(baseAmount + gstAmount);
      checkoutCurrency = checkoutMoney.currency;
    }

    // Fetch active billing rule snapshot and calculations
    const activeRule = await getActiveBillingRule();
    const ruleSnapshot = buildBillingRuleSnapshot(activeRule);
    const calculatedBilling = calculateBillingAmounts(baseAmount, activeRule);
    const billingFields = {
      billingRuleSnapshot: ruleSnapshot,
      platformCommissionAmount: calculatedBilling.platformCommissionAmount,
      providerShareAmount: calculatedBilling.providerShareAmount,
      referralCommissionAmount: calculatedBilling.referralCommissionAmount,
      cashbackAmount: calculatedBilling.cashbackAmount,
      netPlatformRevenue: calculatedBilling.netPlatformRevenue,
    };

    // ---------------------------------------- SIMULATION MODE
    if (config.simulationMode && currentRole !== 'recruiter') {
      const simulatedTxnId = `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const payment = await createPayment({
        user: req.user._id,
        plan: basePlanId === 'custom' ? null : plan._id,
        amount: totalAmount,
        currency: checkoutCurrency.toUpperCase(),
        type: 'plan_purchase',
        status: 'completed',
        transactionId: simulatedTxnId,
        stripeSessionId: `sim_session_${Date.now()}`,
        stripePaymentIntentId: simulatedTxnId,
        isSimulated: true,
        paymentMethod: 'simulation',
        priceSnapshot: priceDetails,
        metadata: {
          planName: isVariant ? `${plan.name} (${durationMultiplier === 12 ? 'Yearly' : 'Quarterly'})` : plan.name,
          planSlug: plan.slug + planSuffix,
          exchangeSource: priceDetails ? 'country-wise-pricing' : 'custom',
          baseCurrency: checkoutCurrency.toUpperCase(),
          baseAmount: baseAmount,
          customCredits: basePlanId === 'custom' ? plan.unlockCredits : undefined,
          customDuration: basePlanId === 'custom' ? plan.duration : (isVariant ? plan.duration * durationMultiplier : undefined),
          customName: basePlanId === 'custom' ? plan.name : (isVariant ? `${plan.name} (${durationMultiplier === 12 ? 'Yearly' : 'Quarterly'})` : undefined),
          providerId: req.body.providerId || undefined,
          gstPercent,
          gstAmount,
          baseAmount,
        },
        ...billingFields
      });

      let profile;
      if (plan.type === 'provider') {
        profile = await activateProviderPlan(req.user._id, plan, billingFields, priceDetails);
      } else if (plan.type === 'recruiter') {
        profile = await activateRecruiterPlan(req.user._id, plan, {}, billingFields, priceDetails);
      }

      await notifyPlanPurchased(req.user._id, plan, payment._id);
      await processReferralCommission({ userId: req.user._id, plan, payment });

      if (payment.metadata?.providerId) {
        await processProviderEarning({
          providerId: payment.metadata.providerId,
          amount: payment.amount,
          paymentId: payment._id
        });
      }

      return res.json({
        success: true,
        simulated: true,
        message: 'Plan activated (simulation mode)',
        payment,
        profile,
      });
    }

    
    // ---------------------------------------- LIVE RAZORPAY MODE
    const razorpay = await getRazorpayInstance();

    const currency = checkoutCurrency.toUpperCase();
    const unitAmount = Math.max(1, Math.round(Number(totalAmount || 0) * 100));

    // Create Razorpay Order
    const orderOptions = {
      amount: unitAmount,
      currency: currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        planId: basePlanId === 'custom' ? 'custom' : plan._id.toString(),
        type: 'plan_purchase',
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    // Persist a 'created' payment record keyed on the Razorpay order ID
    const payment = await createPayment({
      user: req.user._id,
      plan: basePlanId === 'custom' ? null : plan._id,
      amount: totalAmount,
      currency: currency,
      type: 'plan_purchase',
      status: 'pending',
      transactionId: order.id,
      stripeSessionId: order.id, // Keeping this field name for backward compatibility, but stores Razorpay Order ID
      priceSnapshot: priceDetails,
      metadata: {
        planName: isVariant ? `${plan.name} (${durationMultiplier === 12 ? 'Yearly' : 'Quarterly'})` : plan.name,
        planSlug: plan.slug + planSuffix,
        exchangeSource: priceDetails ? 'country-wise-pricing' : 'custom',
        baseCurrency: currency,
        baseAmount: baseAmount,
        customCredits: basePlanId === 'custom' ? plan.unlockCredits : undefined,
        customDuration: basePlanId === 'custom' ? plan.duration : (isVariant ? plan.duration * durationMultiplier : undefined),
        customName: basePlanId === 'custom' ? plan.name : (isVariant ? `${plan.name} (${durationMultiplier === 12 ? 'Yearly' : 'Quarterly'})` : undefined),
        providerId: req.body.providerId || undefined,
        gstPercent,
        gstAmount,
        baseAmount,
      },
      ...billingFields
    });

    res.json({
      success: true,
      simulated: false,
      keyId: config.keyId,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      payment: payment._id,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: error.message || 'Failed to create checkout session' });
  }
};


const RAZORPAY_PLAN_MAP = {
  // Live IDs
  /*
  'provider-max-yearly': 'plan_TMrrtvqo67bR4j',
  'provider-max-quarterly': 'plan_TMrrN6T3ICamUy',
  'provider-max-monthly': 'plan_TMrqvibx6s3TMo',
  'provider-pro-yearly': 'plan_TMrqWNTX7r2c1k',
  'provider-pro-quarterly': 'plan_TMrq7VQv45iGOz',
  'provider-pro-monthly': 'plan_TMrpVQubofSDO6',
  'provider-basic-yearly': 'plan_TMrmIAQVxZDMP1',
  'provider-basic-quarterly': 'plan_TMroyrrgcsvYq7',
  'provider-basic-monthly': 'plan_TMrki2EOQJwu5P',
  */
  // Test IDs
  'provider-basic-monthly': 'plan_TMsCV1C58TyTJ2',
  'provider-pro-monthly': 'plan_TMsDAxuNwBHVl0',
  'provider-pro-quarterly': 'plan_TMsDAxuNwBHVl0', // fallback in case you select quarterly
};

/**
 * @desc    Create a Razorpay Subscription
 * @route   POST /api/payments/create-subscription
 * @access  Private
 * @body    { planId, addons }
 */
const createSubscription = async (req, res) => {
  try {
    const { planId, addons = [] } = req.body;
    if (!planId) return res.status(400).json({ message: 'planId is required' });

    let basePlanId = planId;
    let durationMultiplier = 1;
    let planSuffix = '-monthly';
    
    if (planId && typeof planId === 'string') {
      if (planId.endsWith('_quarterly')) {
        basePlanId = planId.replace('_quarterly', '');
        durationMultiplier = 3;
        planSuffix = '-quarterly';
      } else if (planId.endsWith('_yearly')) {
        basePlanId = planId.replace('_yearly', '');
        durationMultiplier = 12;
        planSuffix = '-yearly';
      }
    }

    const plan = await findPlanById(basePlanId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    if (!plan.isActive) return res.status(400).json({ message: 'Plan is not active' });
    
    const internalSlug = `${plan.slug}${planSuffix}`;
    const razorpayPlanId = RAZORPAY_PLAN_MAP[internalSlug];
    if (!razorpayPlanId) {
       return res.status(400).json({ message: `Razorpay mapping not found for ${internalSlug}` });
    }

    const currentRole = req.user.activeRole || req.user.role;
    if (currentRole !== plan.type && currentRole !== 'admin') {
      return res.status(403).json({ message: 'Plan not available for your role' });
    }

    const config = await getPaymentConfig();
    const razorpay = await getRazorpayInstance();

    const subscriptionOptions = {
      plan_id: razorpayPlanId,
      customer_notify: 1,
      total_count: 120, // max billing cycles
      notes: {
        userId: req.user._id.toString(),
        planId: plan._id.toString(),
        type: 'subscription',
        internalSlug
      }
    };
    
    if (addons.length > 0) {
      subscriptionOptions.addons = addons.map(addon => ({
        item: {
          name: addon.name,
          amount: Math.round(Number(addon.amount) * 100),
          currency: 'INR'
        }
      }));
    }

    const subscription = await razorpay.subscriptions.create(subscriptionOptions);

    const activeRule = await getActiveBillingRule();
    const ruleSnapshot = buildBillingRuleSnapshot(activeRule);

    const payment = await createPayment({
      user: req.user._id,
      plan: plan._id,
      amount: 0, 
      currency: 'INR',
      type: 'subscription',
      status: 'pending',
      transactionId: subscription.id,
      stripeSessionId: subscription.id,
      metadata: {
        planName: plan.name,
        planSlug: internalSlug,
        razorpayPlanId,
      },
      billingRuleSnapshot: ruleSnapshot,
    });

    res.json({
      success: true,
      simulated: false,
      keyId: config.keyId,
      subscription: {
        id: subscription.id,
      },
      payment: payment._id,
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ message: error.message || 'Failed to create subscription session' });
  }
};

/**
 * @desc    Verify Razorpay Subscription
 * @route   POST /api/payments/verify-subscription
 * @access  Private
 * @body    { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
 */
const verifySubscription = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;
    
    if (razorpay_subscription_id && razorpay_payment_id && razorpay_signature) {
      const config = await getPaymentConfig();
      const text = razorpay_payment_id + "|" + razorpay_subscription_id;
      // Using process.env.RAZORPAY_KEY_SECRET as fallback if config.webhookSecret is different
      const secret = config.keySecret || process.env.RAZORPAY_KEY_SECRET; 
      const expectedSignature = crypto.createHmac('sha256', secret)
                                      .update(text)
                                      .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }

      const existingPayment = await findPayment({ transactionId: razorpay_subscription_id }, { includePlan: true });
      if (!existingPayment) {
        return res.status(404).json({ message: 'Payment record not found' });
      }

      if (existingPayment.status === 'completed') {
        const profile = await (existingPayment.plan ? getProfileByPlanType(existingPayment.user, existingPayment.plan.type) : null);
        return res.json({
          success: true,
          message: 'Payment already verified',
          payment: existingPayment,
          profile,
        });
      }

      const payment = await updatePayment(existingPayment._id, {
          status: 'completed',
          stripePaymentIntentId: razorpay_payment_id,
          paymentMethod: 'razorpay',
        }, true);

      if (payment?.plan) {
        let durationMultiplier = 1;
        if (payment.metadata.planSlug.includes('-quarterly')) durationMultiplier = 3;
        if (payment.metadata.planSlug.includes('-yearly')) durationMultiplier = 12;
        
        const originalDuration = payment.plan.duration;
        payment.plan.duration = originalDuration * durationMultiplier;
        
        await activatePlanByType(payment.user, payment.plan, payment.metadata, {
          billingRuleSnapshot: payment.billingRuleSnapshot,
          platformCommissionAmount: payment.platformCommissionAmount,
          providerShareAmount: payment.providerShareAmount,
          referralCommissionAmount: payment.referralCommissionAmount,
          cashbackAmount: payment.cashbackAmount,
          netPlatformRevenue: payment.netPlatformRevenue
        }, payment.priceSnapshot);
        
        payment.plan.duration = originalDuration;
        
        await notifyPlanPurchased(payment.user, payment.plan, payment._id);
        await processReferralCommission({ userId: payment.user, plan: payment.plan, payment: payment });
      }

      const profile = await (payment.plan ? getProfileByPlanType(payment.user, payment.plan.type) : null);

      return res.json({
        success: true,
        message: 'Subscription verified and activated successfully',
        payment,
        profile,
      });
    } else {
       return res.status(400).json({ message: 'Missing razorpay subscription parameters' });
    }
  } catch (error) {
    console.error('Verify subscription error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
};


/**
 * @desc    Verify Stripe Checkout Session after user returns to success URL
 * @route   POST /api/payments/verify
 * @access  Private
 * @body    { sessionId }
 */
const verifyPayment = async (req, res) => {
  try {
    const { sessionId, razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;
    
    // --- RAZORPAY VERIFICATION ---
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const isValid = await verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

      if (!isValid) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }

      const existingPayment = await findPayment({ transactionId: razorpay_order_id }, { includePlan: true });
      if (!existingPayment) {
        return res.status(404).json({ message: 'Payment record not found' });
      }

      if (existingPayment.status === 'completed') {
        const profile = await (existingPayment.plan ? getProfileByPlanType(existingPayment.user, existingPayment.plan.type) : null);
        return res.json({
          success: true,
          message: 'Payment already verified',
          payment: existingPayment,
          profile,
        });
      }

      const payment = await updatePayment(existingPayment._id, {
          status: 'completed',
          stripePaymentIntentId: razorpay_payment_id,
          paymentMethod: 'razorpay',
        }, true);

      if (payment?.plan || payment?.metadata?.customName) {
        await activatePlanByType(payment.user, payment.plan, payment.metadata, {
          billingRuleSnapshot: payment.billingRuleSnapshot,
          platformCommissionAmount: payment.platformCommissionAmount,
          providerShareAmount: payment.providerShareAmount,
          referralCommissionAmount: payment.referralCommissionAmount,
          cashbackAmount: payment.cashbackAmount,
          netPlatformRevenue: payment.netPlatformRevenue
        }, payment.priceSnapshot);
        await notifyPlanPurchased(payment.user, payment.plan || { name: payment.metadata?.customName }, payment._id);
        await processReferralCommission({ userId: payment.user, plan: payment.plan, payment });
      }

      if (payment?.metadata?.providerId) {
        await processProviderEarning({
          providerId: payment.metadata.providerId,
          amount: payment.amount,
          paymentId: payment._id
        });
      }

      const profile = await (payment.plan ? getProfileByPlanType(payment.user, payment.plan.type) : null);

      return res.json({
        success: true,
        status: 'completed',
        message: 'Payment verified and plan activated successfully!',
        payment,
        profile,
      });
    }

    // --- STRIPE VERIFICATION FALLBACK ---
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId or razorpay details are required' });
    }

    const stripe = await getStripeInstance();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Ensure the session belongs to the requesting user
    if (session.client_reference_id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Session does not belong to this user' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        message: `Payment not completed. Status: ${session.payment_status}`,
      });
    }

    const existingPayment = await findPayment({ stripeSessionId: sessionId }, { includePlan: true });

    if (!existingPayment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    // Idempotency: if already completed earlier (webhook or previous verify call), do not re-apply credits/plan.
    if (existingPayment.status === 'completed') {
      const profile = await (existingPayment.plan ? getProfileByPlanType(existingPayment.user, existingPayment.plan.type) : null);
      return res.json({
        success: true,
        message: 'Payment already verified',
        payment: existingPayment,
        profile,
      });
    }

    if (session.payment_status === 'paid') {
      const payment = await updatePayment(existingPayment._id, {
          status: 'completed',
          stripePaymentIntentId: session.payment_intent || '',
          transactionId: session.payment_intent || session.id,
          paymentMethod: 'card',
        }, true);

      if (payment?.plan || payment?.metadata?.customName) {
        await activatePlanByType(payment.user, payment.plan, payment.metadata, {
          billingRuleSnapshot: payment.billingRuleSnapshot,
          platformCommissionAmount: payment.platformCommissionAmount,
          providerShareAmount: payment.providerShareAmount,
          referralCommissionAmount: payment.referralCommissionAmount,
          cashbackAmount: payment.cashbackAmount,
          netPlatformRevenue: payment.netPlatformRevenue
        }, payment.priceSnapshot);
        await notifyPlanPurchased(payment.user, payment.plan || { name: payment.metadata?.customName }, payment._id);
        await processReferralCommission({ userId: payment.user, plan: payment.plan, payment });
      }

      if (payment?.metadata?.providerId) {
        await processProviderEarning({
          providerId: payment.metadata.providerId,
          amount: payment.amount,
          paymentId: payment._id
        });
      }

      const profile = await (payment.plan ? getProfileByPlanType(payment.user, payment.plan.type) : null);

      return res.json({
        success: true,
        status: 'completed',
        message: 'Payment verified and plan activated successfully!',
        payment,
        profile,
      });
    }

    res.status(400).json({
      message: `Payment not completed. Status: ${session.payment_status}`,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    require('fs').writeFileSync('verify_error.log', error.stack || error.message);
    res.status(500).json({ message: 'Payment verification failed', error: error.message });
  }
};

/**
 * @desc    Record a payment failure / cancellation from frontend
 * @route   POST /api/payments/failed
 * @access  Private
 * @body    { sessionId, errorMessage }
 */
const paymentFailed = async (req, res) => {
  try {
    const { sessionId, errorMessage } = req.body;

    if (sessionId) {
      await prisma.payment.updateMany({
        where: { stripeSessionId: sessionId },
        data: {
          status: 'failed',
          metadata: { error: errorMessage || 'Payment failed or cancelled' },
        },
      });
    }

    res.json({ success: false, message: 'Payment failure recorded' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Stripe webhook (server-to-server). Must receive raw body.
 *          Registered in server.js BEFORE express.json() middleware.
 * @route   POST /api/payments/webhook
 * @access  Public
 */
const stripeWebhook = async (req, res) => {
  try {
    const config = await getPaymentConfig();
    const stripe = await getStripeInstance();

    let event;

    if (config.webhookSecret) {
      const sig = req.headers['stripe-signature'];
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, config.webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ message: `Webhook Error: ${err.message}` });
      }
    } else {
      // No secret configured – parse body directly (dev/testing only)
      event =
        typeof req.body === 'string' || Buffer.isBuffer(req.body)
          ? JSON.parse(req.body.toString())
          : req.body;
    }

    // --- Handle events ---
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_status === 'paid') {
        const existingPayment = await findPayment({ stripeSessionId: session.id }, { includePlan: true });

        if (existingPayment && existingPayment.status !== 'completed') {
          const payment = await updatePayment(existingPayment._id, {
              status: 'completed',
              stripePaymentIntentId: session.payment_intent || '',
              transactionId: session.payment_intent || session.id,
              paymentMethod: 'card',
            }, true);

          if (payment?.plan || payment?.metadata?.customName) {
            await activatePlanByType(payment.user, payment.plan, payment.metadata, {
              billingRuleSnapshot: payment.billingRuleSnapshot,
              platformCommissionAmount: payment.platformCommissionAmount,
              providerShareAmount: payment.providerShareAmount,
              referralCommissionAmount: payment.referralCommissionAmount,
              cashbackAmount: payment.cashbackAmount,
              netPlatformRevenue: payment.netPlatformRevenue
            }, payment.priceSnapshot);
            await notifyPlanPurchased(payment.user, payment.plan || { name: payment.metadata?.customName }, payment._id);
            await processReferralCommission({ userId: payment.user, plan: payment.plan, payment });
          }

          if (payment?.metadata?.providerId) {
            await processProviderEarning({
              providerId: payment.metadata.providerId,
              amount: payment.amount,
              paymentId: payment._id
            });
          }
        }
      }
    }

    if (
      event.type === 'checkout.session.expired' ||
      event.type === 'payment_intent.payment_failed'
    ) {
      const obj = event.data.object;
      if (obj.id) {
        await prisma.payment.updateMany({ where: { stripeSessionId: obj.id }, data: { status: 'failed' } });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

/**
 * @desc    Get payment history for logged-in user
 * @route   GET /api/payments/my-payments
 * @access  Private
 */
const getMyPayments = async (req, res) => {
  try {
    const paymentResult = await listPayments({
      where: { user: String(req.user._id) }, page: 1, limit: 50, includePlan: true,
    });
    const payments = paymentResult.payments;

    const pSubs = (await prisma.providerSubscription.findMany({
      where: { providerId: String(req.user._id) },
      include: { planIdRecord: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })).map(mapProviderSubscription);

    const formattedSubs = pSubs.map(sub => ({
      _id: sub._id,
      createdAt: sub.createdAt,
      amount: sub.finalAmount || sub.totalAmount || 0,
      currencySymbol: sub.currency === 'USD' ? '$' : '₹',
      status: sub.paymentStatus || 'completed',
      type: 'plan_purchase',
      plan: sub.planId || { name: sub.planSnapshot?.name || 'Custom Plan' },
      transactionId: sub.paymentId || sub.orderId || sub.stripeSubscriptionId,
    }));

    const allHistory = [...payments, ...formattedSubs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);

    res.json(allHistory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get single payment details
 * @route   GET /api/payments/:id
 * @access  Private
 */
const getPaymentById = async (req, res) => {
  try {
    const payment = await findPaymentById(req.params.id, { includePlan: true, includeUser: true });

    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Only allow own payment or admin
      const currentRole = req.user.activeRole || req.user.role;
      if (payment.user._id.toString() !== req.user._id.toString() && currentRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const processProviderEarning = async ({ providerId, amount, paymentId }) => {
  try {
    const result = await withPrismaTransaction(async () => {
    const prisma = getPrismaClient();
    const commissionSetting = await prisma.adminCommissionSetting.findUnique({
      where: { key: 'platform_commission_percentage' },
    });
    const commissionRate = commissionSetting ? commissionSetting.value : 10;

    const commissionAmount = Math.max(0, Math.round((amount * (commissionRate / 100)) * 100) / 100);
    const providerShare = Math.max(0, Math.round((amount - commissionAmount) * 100) / 100);

    const wallet = await prisma.providerWallet.upsert({
      where: { userId: String(providerId) },
      create: {
        userId: String(providerId), totalEarnings: providerShare,
        availableBalance: providerShare, commissionDeducted: commissionAmount,
      },
      update: {
        totalEarnings: { increment: providerShare }, availableBalance: { increment: providerShare },
        commissionDeducted: { increment: commissionAmount },
      },
    });

    await prisma.providerWalletTransaction.create({ data: {
      walletId: wallet.id,
      userId: String(providerId),
      type: 'earning',
      amount: providerShare,
      status: 'credited',
      referenceId: String(paymentId),
      description: `Earning from client payment of ₹${amount} (Platform fee ₹${commissionAmount} deducted at ${commissionRate}%)`
    } });

    return { providerShare, commissionAmount };
    });

    // Create notification for service provider
    try {
      const { createNotification } = require('../services/notificationService');
      await createNotification({
        userId: providerId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Credited',
        message: `You have been credited ₹${result.providerShare} after platform commission fee deduction.`
      });
    } catch (nErr) {
      console.error('Failed to trigger notification:', nErr.message);
    }

    return result;
  } catch (err) {
    console.error('Failed to process provider earning:', err.message);
    throw err;
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { role } = req.body;
    const targetRole = role || req.user.activeRole || req.user.role;

    if (targetRole === 'provider') {
      const sub = await findProviderSubscription({
        providerId: userId,
        subscriptionStatus: 'active',
        endDate: { gt: new Date() }
      });

      if (!sub) {
        return res.status(404).json({ message: 'No active provider subscription found.' });
      }

      Object.assign(sub, await updateProviderSubscription(sub._id, { subscriptionStatus: 'cancelled' }));

      await createNotification({
        userId,
        type: 'ADMIN_ALERT',
        title: 'Subscription Cancelled',
        message: `Your ${sub.planSnapshot?.name || 'Provider'} subscription auto-renewal has been cancelled. It will remain active until ${new Date(sub.endDate).toLocaleDateString()}.`
      });

      return res.json({ success: true, message: 'Provider subscription cancelled successfully.', subscription: sub });
    } else {
      const sub = await findUserSubscription({
        userId,
        role: 'recruiter',
        status: 'active',
      });

      if (!sub) {
        return res.status(404).json({ message: 'No active recruiter subscription found.' });
      }

      Object.assign(sub, await updateUserSubscription(sub._id, { status: 'cancelled', autoRenew: false }));

      await createNotification({
        userId,
        type: 'ADMIN_ALERT',
        title: 'Subscription Cancelled',
        message: `Your subscription auto-renewal has been cancelled. It will remain active until ${new Date(sub.endDate).toLocaleDateString()}.`
      });

      return res.json({ success: true, message: 'Recruiter subscription cancelled successfully.', subscription: sub });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const calculateBreakdown = async (req, res) => {
  try {
    const { amount, context, providerId, jobId, preferredCountry } = req.body;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const activeRule = await getActiveBillingRule();

    // Resolve country and dynamically compute GST rate
    let country = preferredCountry || req.user?.country;
    if (!country) {
      country = 'IN';
    }
    country = country.toUpperCase();

    const config = await prisma.countryConfig.findFirst({ where: { countryCode: country } });
    const currency = config?.currency || 'INR';
    const currencySymbol = config?.currencySymbol || '₹';
    const taxName = config?.defaultTaxName || 'GST';
    const taxPercent = resolveCountryGstPercent(country, activeRule);

    const platformCommissionPercent = activeRule.platformCommissionPercentage ?? 10;

    // Platform commission amount
    const platformCommissionAmount = Math.max(0, Math.round((parsedAmount * (platformCommissionPercent / 100)) * 100) / 100);

    // Provider share
    const providerPayableAmount = Math.max(0, Math.round((parsedAmount - platformCommissionAmount) * 100) / 100);

    // Tax amount
    const taxAmount = Math.max(0, Math.round((parsedAmount * (taxPercent / 100)) * 100) / 100);
    const finalPayableAmount = Math.round((parsedAmount + taxAmount) * 100) / 100;

    res.json({
      success: true,
      data: {
        baseAmount: parsedAmount,
        platformCommissionPercent,
        platformCommissionAmount,
        providerPayableAmount,
        taxPercent,
        taxAmount,
        finalPayableAmount,
        currency,
        currencySymbol,
        taxName,
        breakdown: [
          { label: "Job Amount", amount: parsedAmount },
          { label: `Platform Commission ${platformCommissionPercent}%`, amount: platformCommissionAmount },
          { label: "Provider Payable", amount: providerPayableAmount },
          { label: `${taxName} ${taxPercent}%`, amount: taxAmount },
          { label: "Final Payable", amount: finalPayableAmount }
        ]
      }
    });
  } catch (err) {
    console.error('Calculate breakdown error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


/**
 * @desc    Razorpay Webhook for async payment processing
 * @route   POST /api/payments/razorpay-webhook
 * @access  Public
 */
const razorpayWebhook = async (req, res) => {
  try {
    const config = await getPaymentConfig();
    const signature = req.headers['x-razorpay-signature'];
    
    // Verify signature
    const expectedSignature = crypto.createHmac('sha256', config.webhookSecret)
      .update(req.body.toString())
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === 'subscription.charged') {
      const subscriptionId = event.payload.subscription?.entity?.id;
      const paymentId = event.payload.payment?.entity?.id;

      if (!subscriptionId) return res.status(400).send('No subscription ID');

      let payment = await findPayment(
        { transactionId: subscriptionId },
        { includePlan: true, orderBy: { createdAt: 'desc' } },
      );
      if (!payment) return res.status(404).send('Payment not found');

      // If it's a recurring charge (already completed), we create a new payment record
      if (payment.status === 'completed') {
        const newPayment = await createPayment({
          user: payment.user,
          plan: payment.plan?._id,
          amount: (event.payload.payment?.entity?.amount || 0) / 100,
          currency: event.payload.payment?.entity?.currency || 'INR',
          type: 'subscription_renewal',
          status: 'completed',
          transactionId: subscriptionId,
          stripePaymentIntentId: paymentId,
          paymentMethod: 'razorpay',
          metadata: payment.metadata,
          billingRuleSnapshot: payment.billingRuleSnapshot,
          priceSnapshot: payment.priceSnapshot
        });
        
        if (payment.plan) {
          let durationMultiplier = 1;
          if (payment.metadata.planSlug.includes('-quarterly')) durationMultiplier = 3;
          if (payment.metadata.planSlug.includes('-yearly')) durationMultiplier = 12;
          
          const originalDuration = payment.plan.duration;
          payment.plan.duration = originalDuration * durationMultiplier;
          
          await activatePlanByType(newPayment.user, payment.plan, newPayment.metadata, {
            billingRuleSnapshot: newPayment.billingRuleSnapshot,
            platformCommissionAmount: newPayment.platformCommissionAmount,
            providerShareAmount: newPayment.providerShareAmount,
            referralCommissionAmount: newPayment.referralCommissionAmount,
            cashbackAmount: newPayment.cashbackAmount,
            netPlatformRevenue: newPayment.netPlatformRevenue
          }, newPayment.priceSnapshot);
          
          payment.plan.duration = originalDuration;
        }
        return res.status(200).send('Subscription renewal processed');
      }

      // First time charge handled by verifySubscription usually, but webhook acts as fallback
      const updatedPayment = await completePaymentIfPending(payment._id, {
          status: 'completed',
          stripePaymentIntentId: paymentId,
          paymentMethod: 'razorpay',
        });

      if (updatedPayment && updatedPayment.plan) {
          let durationMultiplier = 1;
          if (updatedPayment.metadata.planSlug.includes('-quarterly')) durationMultiplier = 3;
          if (updatedPayment.metadata.planSlug.includes('-yearly')) durationMultiplier = 12;
          
          const originalDuration = updatedPayment.plan.duration;
          updatedPayment.plan.duration = originalDuration * durationMultiplier;
          
          await activatePlanByType(updatedPayment.user, updatedPayment.plan, updatedPayment.metadata, {
            billingRuleSnapshot: updatedPayment.billingRuleSnapshot,
            platformCommissionAmount: updatedPayment.platformCommissionAmount,
            providerShareAmount: updatedPayment.providerShareAmount,
            referralCommissionAmount: updatedPayment.referralCommissionAmount,
            cashbackAmount: updatedPayment.cashbackAmount,
            netPlatformRevenue: updatedPayment.netPlatformRevenue
          }, updatedPayment.priceSnapshot);
          
          updatedPayment.plan.duration = originalDuration;
          await notifyPlanPurchased(updatedPayment.user, updatedPayment.plan, updatedPayment._id);
          await processReferralCommission({ userId: updatedPayment.user, plan: updatedPayment.plan, payment: updatedPayment });
      }
      return res.status(200).send('Processed');
    }

    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const orderId = event.payload.payment?.entity?.order_id || event.payload.order?.entity?.id;
      const paymentId = event.payload.payment?.entity?.id;

      if (!orderId) return res.status(400).send('No order ID');

      const payment = await findPayment({ transactionId: orderId }, { includePlan: true });
      if (!payment) return res.status(404).send('Payment not found');

      if (payment.status === 'completed') {
        return res.status(200).send('Already processed');
      }

      const updatedPayment = await completePaymentIfPending(payment._id, {
          status: 'completed',
          stripePaymentIntentId: paymentId,
          paymentMethod: 'razorpay',
        });

      if (updatedPayment) {
        if (updatedPayment.plan || updatedPayment.metadata?.customName) {
          await activatePlanByType(updatedPayment.user, updatedPayment.plan, updatedPayment.metadata, {
            billingRuleSnapshot: updatedPayment.billingRuleSnapshot,
            platformCommissionAmount: updatedPayment.platformCommissionAmount,
            providerShareAmount: updatedPayment.providerShareAmount,
            referralCommissionAmount: updatedPayment.referralCommissionAmount,
            cashbackAmount: updatedPayment.cashbackAmount,
            netPlatformRevenue: updatedPayment.netPlatformRevenue
          }, updatedPayment.priceSnapshot);
          await notifyPlanPurchased(updatedPayment.user, updatedPayment.plan || { name: updatedPayment.metadata?.customName }, updatedPayment._id);
          await processReferralCommission({ userId: updatedPayment.user, plan: updatedPayment.plan, payment: updatedPayment });
        }

        if (updatedPayment.metadata?.providerId) {
          await processProviderEarning({
            providerId: updatedPayment.metadata.providerId,
            amount: updatedPayment.amount,
            paymentId: updatedPayment._id
          });
        }
      }
    }

    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    res.status(500).send('Webhook error');
  }
};

module.exports = {
  razorpayWebhook,
  getPaymentPublicConfig,
  createOrder,
  createSubscription,
  verifyPayment,
  verifySubscription,
  paymentFailed,
  stripeWebhook,
  getMyPayments,
  getPaymentById,
  processProviderEarning,
  cancelSubscription,
  calculateBreakdown,
};
