const crypto = require('crypto');
const Razorpay = require('razorpay');
const {
  createRecruiterSubscription,
  findPlanById,
  findRecruiterSubscription,
  findRecruiterSubscriptionById,
  listPlans,
  updateRecruiterSubscription,
} = require('./billingPersistenceService');
const {
  ensureRecruiterProfile,
  saveRecruiterProfile,
} = require('./recruiterCompanyPersistenceService');

let razorpay = null;

function getRazorpayClient() {
  if (razorpay) return razorpay;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay is not configured');
  }
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return razorpay;
}

const RAZORPAY_RECRUITER_PLAN_MAP = {
  'recruiter-basic-monthly': 'plan_TMtucG9tlEEh8R',
  'recruiter-basic-quarterly': 'plan_TMtvJKGG6vjyM6',
  'recruiter-basic-yearly': 'plan_TMtvlTjPZfiS2l',

  'recruiter-pro-monthly': 'plan_TMtwYFORTX4bTR',
  'recruiter-pro-quarterly': 'plan_TMtx0nbXpO0rmZ',
  'recruiter-pro-yearly': 'plan_TMtxTX56eYWq17',

  'recruiter-max-monthly': 'plan_TMty7Zb2PNIsWl',
  'recruiter-max-quarterly': 'plan_TMtyjIOrd6IhQE',
  'recruiter-max-yearly': 'plan_TMtz7A6GEEh308',
};

exports.getAvailablePlans = async () => {
  return listPlans({ audience: 'recruiter', isActive: true }, { sortOrder: 'asc' });
};

exports.getMyPlan = async (recruiterId) => {
  const subscription = await findRecruiterSubscription({
    recruiterId: String(recruiterId),
    subscriptionStatus: { in: ['active', 'paused'] },
    endDate: { gte: new Date() },
  }, { orderBy: { createdAt: 'desc' } });

  return subscription || null;
};

exports.generateCheckoutSession = async (user, planId, durationMonths = 1, isAutoRenew = false) => {
  const plan = await findPlanById(planId);
  if (!plan) throw new Error('Plan not found');

  // Pricing logic
  let basePrice = plan.priceMonthly;
  let discountedPrice = basePrice;
  let finalPrice = basePrice * durationMonths;

  let durationSuffix = 'monthly';
  if (durationMonths === 3) {
    // 10% discount
    discountedPrice = Math.round(basePrice * 0.9);
    finalPrice = discountedPrice * durationMonths;
    durationSuffix = 'quarterly';
  } else if (durationMonths === 12) {
    // 20% discount
    discountedPrice = Math.round(basePrice * 0.8);
    finalPrice = discountedPrice * durationMonths;
    durationSuffix = 'yearly';
  }

  // Create pending subscription
  let newSub = await createRecruiterSubscription({
    recruiterId: user._id,
    planId: plan._id,
    durationMonths,
    subtotal: finalPrice,
    gstPercent: 0,
    gstAmount: 0,
    totalAmount: finalPrice,
    finalAmount: finalPrice,
    isAutoRenew,
    planSnapshot: {
      name: plan.name,
      slug: plan.slug,
      type: 'recruiter',
      priceMonthly: plan.priceMonthly,
      description: plan.description,
      features: plan.features,
      unlockCredits: plan.unlockCredits,
      aiLimits: plan.aiLimits,
      planType: plan.planType,
      billingCycle: plan.billingCycle,
    },
    paymentProvider: 'razorpay',
    subscriptionStatus: 'pending'
  });

  if (isAutoRenew) {
    const internalSlug = `${plan.slug}-${durationSuffix}`;
    const razorpayPlanId = RAZORPAY_RECRUITER_PLAN_MAP[internalSlug];
    if (!razorpayPlanId) {
      throw new Error(`Razorpay mapping not found for ${internalSlug}`);
    }

    let totalCount = 120; // 10 years for monthly
    if (durationSuffix === 'quarterly') {
      totalCount = 40; // 10 years
    } else if (durationSuffix === 'yearly') {
      totalCount = 10; // 10 years
    }

    const subscriptionOptions = {
      plan_id: razorpayPlanId,
      customer_notify: 1,
      total_count: totalCount,
      notes: {
        subscriptionId: String(newSub._id),
        recruiterId: String(user._id),
      },
    };

    const razorpaySubscription = await getRazorpayClient().subscriptions.create(subscriptionOptions);
    newSub = await updateRecruiterSubscription(newSub._id, {
      razorpaySubscriptionId: razorpaySubscription.id,
      orderId: razorpaySubscription.id,
    });

    return {
      success: true,
      checkoutType: 'subscription',
      subscriptionId: razorpaySubscription.id,
      amount: finalPrice,
      currency: 'INR',
      backendSubscriptionId: newSub._id
    };

  } else {
    // One time payment via Orders API
    const orderOptions = {
      amount: Math.round(finalPrice * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${newSub._id}`,
      notes: {
        subscriptionId: String(newSub._id),
        recruiterId: String(user._id),
      }
    };

    const order = await getRazorpayClient().orders.create(orderOptions);
    newSub = await updateRecruiterSubscription(newSub._id, { orderId: order.id });

    return {
      success: true,
      checkoutType: 'order',
      orderId: order.id,
      amount: finalPrice,
      currency: 'INR',
      backendSubscriptionId: newSub._id
    };
  }
};

exports.verifyAndActivate = async (user, data) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, razorpay_subscription_id, backendSubscriptionId } = data;

  let sub = await findRecruiterSubscriptionById(backendSubscriptionId);
  if (!sub) throw new Error('Subscription record not found');

  if (sub.subscriptionStatus === 'active') return sub;

  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (razorpay_subscription_id) {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(razorpay_payment_id + '|' + razorpay_subscription_id)
      .digest('hex');
    
    if (expectedSig !== razorpay_signature) throw new Error('Invalid signature');
    sub.razorpaySubscriptionId = razorpay_subscription_id;
  } else {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
      
    if (expectedSig !== razorpay_signature) throw new Error('Invalid signature');
    sub.orderId = razorpay_order_id;
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + sub.durationMonths);

  sub = await updateRecruiterSubscription(sub._id, {
    razorpaySubscriptionId: razorpay_subscription_id || sub.razorpaySubscriptionId,
    orderId: razorpay_order_id || sub.orderId,
    paymentId: razorpay_payment_id,
    paymentStatus: 'paid',
    subscriptionStatus: 'active',
    startDate,
    endDate,
    lastUsageResetAt: startDate,
  });

  // Sync limits to RecruiterProfile
  let profile = await ensureRecruiterProfile(user._id);

  profile.currentPlan = sub.planSnapshot.slug;
  profile.planExpiresAt = endDate;
  
  // Combine limits (override based on business logic)
  // We reset them exactly to the monthly quota as per the plan's 'reset cycle'
  profile.unlocksRemaining = sub.planSnapshot.unlockCredits;
  profile.boostJobsRemaining = sub.planSnapshot.aiLimits.jobBoostJobsLimit;
  profile.boostDaysRemaining = sub.planSnapshot.aiLimits.jobBoostDaysLimit;
  profile.jobPostLimitRemaining = sub.planSnapshot.aiLimits.jobPostLimit;
  profile.outreachCampaignsRemaining = sub.planSnapshot.aiLimits.outreachCampaigns;
  profile.directMessagingRemaining = sub.planSnapshot.aiLimits.directMessaging;
  profile.aiJdGeneratorRemaining = sub.planSnapshot.aiLimits.aiJdGenerator;
  profile.aiJdParsingRemaining = sub.planSnapshot.aiLimits.aiJdParsing;
  profile.aiCopilotRemaining = sub.planSnapshot.aiLimits.aiCopilot;
  profile.interviewKitsRemaining = sub.planSnapshot.aiLimits.interviewKits;
  profile.customReportsRemaining = sub.planSnapshot.aiLimits.customReports;

  await saveRecruiterProfile(profile);

  return sub;
};
