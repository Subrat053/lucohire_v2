const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');
const { prepareProviderProfileData } = require('./providerProfilePersistenceService');
const { prepareRecruiterProfileData } = require('./recruiterCompanyPersistenceService');

// Match populated response fields; never include credentials in billing responses.
const userRelation = (option, fields = { id: true, name: true, email: true }) =>
  typeof option === 'object' ? option : { select: fields };
const subscriptionUserFields = { id: true, name: true, email: true, phone: true, country: true };

const ref = (value) => {
  if (value == null) return value;
  if (typeof value === 'object') return String(value.id ?? value._id ?? value);
  return String(value);
};

const json = (value) => {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(json);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .map(([key, nested]) => [key, json(nested)]));
  }
  return value;
};

const date = (value) => value == null || value instanceof Date ? value : new Date(value);

function mapRelation(record, relationKey, responseKey) {
  if (!record || record[relationKey] === undefined) return record;
  record[responseKey] = withLegacyId(record[relationKey]);
  delete record[relationKey];
  return record;
}

function mapPlan(record) {
  return withLegacyId(record);
}

function mapUserSubscription(record) {
  const result = withLegacyId(record);
  mapRelation(result, 'userIdRecord', 'userId');
  mapRelation(result, 'planIdRecord', 'planId');
  return result;
}

function mapProviderSubscription(record) {
  const result = withLegacyId(record);
  mapRelation(result, 'providerIdRecord', 'providerId');
  mapRelation(result, 'planIdRecord', 'planId');
  return result;
}

function mapRecruiterSubscription(record) {
  const result = withLegacyId(record);
  mapRelation(result, 'recruiterIdRecord', 'recruiterId');
  mapRelation(result, 'planIdRecord', 'planId');
  return result;
}

function mapPayment(record) {
  const result = withLegacyId(record);
  mapRelation(result, 'userRecord', 'user');
  mapRelation(result, 'planRecord', 'plan');
  return result;
}

const USER_SUBSCRIPTION_FIELDS = [
  'amount', 'audience', 'autoRenew', 'billingCycle', 'billingRuleSnapshot', 'boostMeta',
  'cashbackAmount', 'currency', 'discountPercent', 'durationMonths', 'endDate', 'expiresAt',
  'expiryDate', 'finalAmount', 'gstAmount', 'isDefault', 'monthlyPrice', 'netPlatformRevenue',
  'paymentId', 'paymentStatus', 'planCode', 'planId', 'platformCommissionAmount', 'priceSnapshot',
  'priorityWeight', 'providerShareAmount', 'referralCommissionAmount', 'role', 'startDate',
  'startedAt', 'status', 'totalAmount', 'unlockCreditsRemaining', 'unlockCreditsTotal',
  'unlockCreditsUsed', 'usage', 'userId',
];

const PROVIDER_SUBSCRIPTION_FIELDS = [
  'benefits', 'coverageLabel', 'currency', 'customConfig', 'customLimits', 'durationMonths',
  'endDate', 'finalAmount', 'gstAmount', 'gstPercent', 'isAutoRenew', 'maxJobApplications',
  'orderId', 'paymentId', 'paymentProvider', 'paymentStatus', 'planCategory', 'planId',
  'planSnapshot', 'priceSnapshot', 'priorityWeight', 'providerId', 'remainingDurationMs',
  'selectedAddons', 'selectedCities', 'selectedPincodes', 'selectedSkills', 'startDate',
  'stripeSubscriptionId', 'subscriptionStatus', 'subtotal', 'totalAmount', 'usageResetCycle',
  'visibilityLevel',
];

const PAYMENT_FIELDS = [
  'amount', 'billingRuleSnapshot', 'cashbackAmount', 'currency', 'isSimulated', 'metadata',
  'netPlatformRevenue', 'paymentMethod', 'plan', 'platformCommissionAmount', 'priceSnapshot',
  'providerShareAmount', 'referralCommissionAmount', 'status', 'stripePaymentIntentId',
  'stripeSessionId', 'transactionId', 'type', 'user',
];

const PLAN_FIELDS = [
  'aiLimits', 'allowedCities', 'allowedPincodes', 'allowedSkills', 'audience', 'availableCountries',
  'billingCycle', 'boostWeight', 'code', 'contactLimit', 'country', 'countryPricing', 'coverageType',
  'currency', 'customConfig', 'description', 'discountedPrice', 'duration', 'features', 'gstPercent',
  'isActive', 'isCustomisable', 'isDefaultFree', 'isPopular', 'isProviderDefault',
  'isRotationEligible', 'maxCities', 'maxJobApplications', 'maxPincodes', 'maxSkills', 'metadata',
  'name', 'planBenefits', 'planCategory', 'planType', 'price', 'priceAED', 'priceMonthly', 'priceUSD',
  'priorityWeight', 'showOnLandingPage', 'slug', 'sortOrder', 'status', 'supportsPerformanceInsights',
  'supportsSmsAlerts', 'supportsWhatsappAlerts', 'type', 'unlockCredits', 'usageResetCycle',
  'visibilityLevel',
];

function pick(source, fields, dateFields = [], jsonFields = [], referenceFields = []) {
  const result = {};
  for (const field of fields) {
    if (source[field] === undefined) continue;
    if (dateFields.includes(field)) result[field] = date(source[field]);
    else if (jsonFields.includes(field)) result[field] = json(source[field]);
    else if (referenceFields.includes(field)) result[field] = ref(source[field]);
    else result[field] = source[field];
  }
  return result;
}

const userSubscriptionData = (source) => pick(source, USER_SUBSCRIPTION_FIELDS,
  ['endDate', 'expiresAt', 'expiryDate', 'startDate', 'startedAt'],
  ['billingRuleSnapshot', 'boostMeta', 'priceSnapshot', 'usage'], ['planId', 'userId']);

const providerSubscriptionData = (source) => pick(source, PROVIDER_SUBSCRIPTION_FIELDS,
  ['endDate', 'startDate'],
  ['benefits', 'customConfig', 'customLimits', 'planSnapshot', 'priceSnapshot', 'selectedAddons'],
  ['planId', 'providerId']);

const recruiterSubscriptionData = (source) => pick(source, [
  'currency', 'durationMonths', 'endDate', 'finalAmount', 'gstAmount', 'gstPercent',
  'isAutoRenew', 'lastUsageResetAt', 'orderId', 'paymentId', 'paymentProvider', 'paymentStatus',
  'planId', 'planSnapshot', 'priceSnapshot', 'razorpaySubscriptionId', 'recruiterId', 'startDate',
  'subscriptionStatus', 'subtotal', 'totalAmount', 'usageResetCycle',
], ['endDate', 'lastUsageResetAt', 'startDate'], ['planSnapshot', 'priceSnapshot'], ['planId', 'recruiterId']);

const paymentData = (source) => pick(source, PAYMENT_FIELDS, [],
  ['billingRuleSnapshot', 'metadata', 'priceSnapshot'], ['plan', 'user']);
const planData = (source) => pick(source, PLAN_FIELDS, [],
  ['aiLimits', 'allowedCities', 'allowedPincodes', 'allowedSkills', 'countryPricing', 'customConfig',
    'metadata', 'planBenefits']);

async function findPlanById(id) {
  if (!id) return null;
  return mapPlan(await prisma.plan.findUnique({ where: { id: ref(id) } }));
}

async function findPlan(where, orderBy) {
  return mapPlan(await prisma.plan.findFirst({ where, ...(orderBy ? { orderBy } : {}) }));
}

async function listPlans(where = {}, orderBy = [{ sortOrder: 'asc' }, { price: 'asc' }]) {
  return withLegacyIds(await prisma.plan.findMany({ where, orderBy }));
}

async function createPlan(data) {
  return mapPlan(await prisma.plan.create({ data: planData(data) }));
}

async function updatePlan(id, data) {
  return mapPlan(await prisma.plan.update({ where: { id: ref(id) }, data: planData(data) }));
}

async function findActiveUserSubscription(userId, role, includePlan = true) {
  const row = await prisma.userSubscription.findFirst({
    where: { userId: ref(userId), role, status: 'active', endDate: { gt: new Date() } },
    ...(includePlan ? { include: { planIdRecord: true } } : {}),
    orderBy: { createdAt: 'desc' },
  });
  return mapUserSubscription(row);
}

async function findUserSubscription(where, { includePlan = false, includeUser = false, orderBy } = {}) {
  const include = {
    ...(includePlan ? { planIdRecord: true } : {}),
    ...(includeUser ? { userIdRecord: userRelation(includeUser, subscriptionUserFields) } : {}),
  };
  const row = await prisma.userSubscription.findFirst({
    where,
    ...(Object.keys(include).length ? { include } : {}),
    ...(orderBy ? { orderBy } : {}),
  });
  return mapUserSubscription(row);
}

async function createUserSubscription(data) {
  return mapUserSubscription(await prisma.userSubscription.create({ data: userSubscriptionData(data) }));
}

async function updateUserSubscription(id, data) {
  return mapUserSubscription(await prisma.userSubscription.update({
    where: { id: ref(id) }, data: userSubscriptionData(data),
  }));
}

async function updateUserSubscriptions(where, data) {
  return prisma.userSubscription.updateMany({ where, data: userSubscriptionData(data) });
}

async function listUserSubscriptions({ where = {}, page = 1, limit = 20, includePlan = false, includeUser = false } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const include = {
    ...(includePlan ? { planIdRecord: true } : {}),
    ...(includeUser ? { userIdRecord: userRelation(includeUser, subscriptionUserFields) } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.userSubscription.findMany({
      where, ...(Object.keys(include).length ? { include } : {}), orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum, take: limitNum,
    }),
    prisma.userSubscription.count({ where }),
  ]);
  return { subscriptions: rows.map(mapUserSubscription), total, page: pageNum, limit: limitNum };
}

async function countUserSubscriptions(where) {
  return prisma.userSubscription.count({ where });
}

async function updateProviderPlanProfile(userId, data) {
  return prisma.providerProfile.updateMany({
    where: { user: ref(userId) }, data: prepareProviderProfileData(data),
  });
}

async function updateRecruiterPlanProfile(userId, data) {
  return prisma.recruiterProfile.updateMany({
    where: { user: ref(userId) }, data: prepareRecruiterProfileData(data),
  });
}

async function createPayment(data) {
  return mapPayment(await prisma.payment.create({ data: paymentData(data) }));
}

async function findPayment(where, { includePlan = false, includeUser = false, orderBy } = {}) {
  const include = {
    ...(includePlan ? { planRecord: true } : {}),
    ...(includeUser ? { userRecord: userRelation(includeUser) } : {}),
  };
  const row = await prisma.payment.findFirst({
    where, ...(Object.keys(include).length ? { include } : {}), ...(orderBy ? { orderBy } : {}),
  });
  return mapPayment(row);
}

async function findPaymentById(id, { includePlan = false, includeUser = false } = {}) {
  const include = {
    ...(includePlan ? { planRecord: true } : {}),
    ...(includeUser ? { userRecord: userRelation(includeUser) } : {}),
  };
  return mapPayment(await prisma.payment.findUnique({
    where: { id: ref(id) }, ...(Object.keys(include).length ? { include } : {}),
  }));
}

async function updatePayment(id, data, includePlan = false) {
  return mapPayment(await prisma.payment.update({
    where: { id: ref(id) }, data: paymentData(data),
    ...(includePlan ? { include: { planRecord: true } } : {}),
  }));
}

async function listPayments({ where = {}, page = 1, limit = 20, includePlan = false, includeUser = false } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const include = {
    ...(includePlan ? { planRecord: true } : {}),
    ...(includeUser ? { userRecord: userRelation(includeUser) } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.payment.findMany({ where, ...(Object.keys(include).length ? { include } : {}),
      orderBy: { createdAt: 'desc' }, skip: (pageNum - 1) * limitNum, take: limitNum }),
    prisma.payment.count({ where }),
  ]);
  return { payments: rows.map(mapPayment), total, page: pageNum, limit: limitNum };
}

async function paymentRevenue(where = {}) {
  const result = await prisma.payment.aggregate({ where, _sum: { amount: true } });
  return Number(result._sum.amount || 0);
}

async function findActiveProviderSubscription(providerId, includePlan = false) {
  const row = await prisma.providerSubscription.findFirst({
    where: { providerId: ref(providerId), subscriptionStatus: 'active', endDate: { gt: new Date() } },
    ...(includePlan ? { include: { planIdRecord: true } } : {}),
    orderBy: { createdAt: 'desc' },
  });
  return mapProviderSubscription(row);
}

async function findProviderSubscription(where, { includePlan = false, includeUser = false, orderBy } = {}) {
  const include = {
    ...(includePlan ? { planIdRecord: true } : {}),
    ...(includeUser ? { providerIdRecord: userRelation(includeUser) } : {}),
  };
  return mapProviderSubscription(await prisma.providerSubscription.findFirst({
    where, ...(Object.keys(include).length ? { include } : {}), ...(orderBy ? { orderBy } : {}),
  }));
}

async function findProviderSubscriptionById(id, includePlan = false) {
  return mapProviderSubscription(await prisma.providerSubscription.findUnique({
    where: { id: ref(id) }, ...(includePlan ? { include: { planIdRecord: true } } : {}),
  }));
}

async function createProviderSubscription(data) {
  return mapProviderSubscription(await prisma.providerSubscription.create({ data: providerSubscriptionData(data) }));
}

async function updateProviderSubscription(id, data) {
  return mapProviderSubscription(await prisma.providerSubscription.update({
    where: { id: ref(id) }, data: providerSubscriptionData(data),
  }));
}

async function updateProviderSubscriptions(where, data) {
  return prisma.providerSubscription.updateMany({ where, data: providerSubscriptionData(data) });
}

async function findRecruiterSubscription(where, { includePlan = false, orderBy } = {}) {
  return mapRecruiterSubscription(await prisma.recruiterSubscription.findFirst({
    where,
    ...(includePlan ? { include: { planIdRecord: true } } : {}),
    ...(orderBy ? { orderBy } : {}),
  }));
}

async function findRecruiterSubscriptionById(id, includePlan = false) {
  return mapRecruiterSubscription(await prisma.recruiterSubscription.findUnique({
    where: { id: ref(id) },
    ...(includePlan ? { include: { planIdRecord: true } } : {}),
  }));
}

async function createRecruiterSubscription(data) {
  return mapRecruiterSubscription(await prisma.recruiterSubscription.create({
    data: recruiterSubscriptionData(data),
  }));
}

async function updateRecruiterSubscription(id, data) {
  return mapRecruiterSubscription(await prisma.recruiterSubscription.update({
    where: { id: ref(id) }, data: recruiterSubscriptionData(data),
  }));
}

async function findProfileUnlock(recruiterId, providerId) {
  return withLegacyId(await prisma.profileUnlock.findUnique({
    where: { recruiterId_providerId: { recruiterId: ref(recruiterId), providerId: ref(providerId) } },
  }));
}

async function upsertProfileUnlock(data) {
  const recruiterId = ref(data.recruiterId);
  const providerId = ref(data.providerId);
  const payload = pick(data,
    ['expiresAt', 'ipAddress', 'jobId', 'otpVerified', 'planId', 'providerId', 'purpose', 'recruiterId',
      'sourcePlanId', 'subscriptionId', 'unlockedAt', 'userAgent'],
    ['expiresAt', 'unlockedAt'], [], ['jobId', 'planId', 'providerId', 'recruiterId', 'sourcePlanId', 'subscriptionId']);
  return withLegacyId(await prisma.profileUnlock.upsert({
    where: { recruiterId_providerId: { recruiterId, providerId } },
    create: payload,
    update: payload,
  }));
}

async function incrementSubscriptionUnlockUsage(id) {
  const current = await prisma.userSubscription.findUnique({ where: { id: ref(id) } });
  if (!current) return null;
  const usage = current.usage && typeof current.usage === 'object' && !Array.isArray(current.usage)
    ? current.usage : {};
  return updateUserSubscription(id, {
    usage: { ...usage, contactsViewed: Number(usage.contactsViewed || 0) + 1 },
    unlockCreditsUsed: Number(current.unlockCreditsUsed || 0) + 1,
    unlockCreditsRemaining: Math.max(0, Number(current.unlockCreditsRemaining || 0) - 1),
  });
}

async function incrementSubscriptionContactsViewed(id) {
  const current = await prisma.userSubscription.findUnique({ where: { id: ref(id) } });
  if (!current) return null;
  const usage = current.usage && typeof current.usage === 'object' && !Array.isArray(current.usage)
    ? current.usage : {};
  return updateUserSubscription(id, {
    usage: { ...usage, contactsViewed: Number(usage.contactsViewed || 0) + 1 },
  });
}

async function consumeSubscriptionUnlockCredit(id) {
  const result = await prisma.userSubscription.updateMany({
    where: { id: ref(id), unlockCreditsRemaining: { gt: 0 } },
    data: { unlockCreditsRemaining: { decrement: 1 }, unlockCreditsUsed: { increment: 1 } },
  });
  if (!result.count) return null;
  return mapUserSubscription(await prisma.userSubscription.findUnique({ where: { id: ref(id) } }));
}

async function listProfileUnlocks({ where = {}, page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const include = {
    recruiterIdRecord: { select: { id: true, name: true, email: true } },
    providerIdRecord: { select: { id: true, name: true, email: true } },
    planIdRecord: { select: { id: true, name: true, slug: true } },
  };
  const [rows, total] = await Promise.all([
    prisma.profileUnlock.findMany({ where, include, orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum, take: limitNum }),
    prisma.profileUnlock.count({ where }),
  ]);
  const unlocks = rows.map((row) => {
    const result = withLegacyId(row);
    mapRelation(result, 'recruiterIdRecord', 'recruiterId');
    mapRelation(result, 'providerIdRecord', 'providerId');
    mapRelation(result, 'planIdRecord', 'planId');
    return result;
  });
  return { unlocks, total, page: pageNum, limit: limitNum };
}

module.exports = {
  countUserSubscriptions,
  consumeSubscriptionUnlockCredit,
  createPayment,
  createPlan,
  createProviderSubscription,
  createRecruiterSubscription,
  createUserSubscription,
  findActiveProviderSubscription,
  findActiveUserSubscription,
  findPayment,
  findPaymentById,
  findPlan,
  findPlanById,
  findProfileUnlock,
  findProviderSubscription,
  findProviderSubscriptionById,
  findRecruiterSubscription,
  findRecruiterSubscriptionById,
  findUserSubscription,
  incrementSubscriptionUnlockUsage,
  incrementSubscriptionContactsViewed,
  listPayments,
  listPlans,
  listProfileUnlocks,
  listUserSubscriptions,
  mapPayment,
  mapPlan,
  mapProviderSubscription,
  mapRecruiterSubscription,
  mapUserSubscription,
  paymentData,
  planData,
  paymentRevenue,
  providerSubscriptionData,
  recruiterSubscriptionData,
  ref,
  updatePayment,
  updateProviderPlanProfile,
  updateRecruiterPlanProfile,
  updatePlan,
  updateProviderSubscription,
  updateProviderSubscriptions,
  updateRecruiterSubscription,
  updateUserSubscription,
  updateUserSubscriptions,
  upsertProfileUnlock,
  userSubscriptionData,
};
