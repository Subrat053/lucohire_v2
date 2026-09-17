const prisma = require('../config/prisma');
const { updateProviderPlanProfile, updateRecruiterPlanProfile } = require('../services/billingPersistenceService');
const { withLegacyIds } = require('../utils/prismaResponse');
const {
  mapUserSubscription,
  updateUserSubscription,
} = require('../services/billingPersistenceService');
const { sendMail } = require('../services/mailService');
const { sendWhatsAppMessage } = require('../utils/messaging');

const DEFAULT_CURRENCY = 'INR';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const formatMoney = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

const getFrontendUrl = (req) => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const protocol = req?.headers?.['x-forwarded-proto'] || req?.protocol || 'http';
  const host = req?.headers?.['x-frontend-host'] || req?.headers?.host || 'localhost:5173';
  return `${protocol}://${host}`;
};

const buildPaymentLink = (req, userId) => `${getFrontendUrl(req)}/plans?userId=${encodeURIComponent(userId)}`;

const pickFirst = (value) => {
  if (Array.isArray(value) && value.length > 0) return value[0];
  return value || '';
};

const resolvePlanCategory = (plan) => {
  if (!plan) return '';
  if (plan.metadata && (plan.metadata.planCategory || plan.metadata.category)) {
    return plan.metadata.planCategory || plan.metadata.category || '';
  }
  return plan.planType || plan.slug || '';
};

const resolveLocation = (profile) => {
  if (!profile) {
    return {
      country: '',
      state: '',
      city: '',
      locality: '',
    };
  }

  const location = profile.location || {};
  const city = profile.city || location.city || '';
  const state = profile.state || location.state || '';
  const country = location.country || profile.country || '';
  const locality = profile.nearestLocation || location.name || location.formattedAddress || '';

  return {
    country,
    state,
    city,
    locality,
  };
};

const resolveReferralType = ({ referral, user, referrer }) => {
  if (referral?.referrerType === 'admin' || user?.referrerType === 'admin') return 'admin_created';
  if (referral?.referrerType === 'partner' || user?.referredByPartnerId || user?.createdByPartnerId || user?.source === 'partner') {
    return 'partner';
  }
  if (referral?.referrerType === 'user' || user?.referredBy) {
    const refRoles = Array.isArray(referrer?.roles) ? referrer.roles : [];
    if (refRoles.includes('recruiter') || referrer?.activeRole === 'recruiter') return 'recruiter';
    if (refRoles.includes('provider') || referrer?.activeRole === 'provider') return 'provider';
    return 'provider';
  }
  if (user?.source === 'referral_link') return user?.firstRegisteredRole || 'provider';
  return 'direct';
};

const resolveCommissionStatus = ({ referral, commission }) => {
  if (!referral && !commission) return 'not_applicable';
  return commission?.status || referral?.commissionStatus || 'pending';
};

const resolveCommissionAmount = ({ referral, commission }) => {
  if (commission?.commissionAmount != null) return formatMoney(commission.commissionAmount);
  if (referral?.commissionAmount != null) return formatMoney(referral.commissionAmount);
  return 0;
};

const normalizeSubscription = ({
  subscription,
  user,
  plan,
  providerProfile,
  recruiterProfile,
  referral,
  referrer,
  commission,
}) => {
  const role = subscription.role || plan?.type || 'provider';
  const profile = role === 'recruiter' ? recruiterProfile : providerProfile;
  const location = resolveLocation(profile);
  const skillName = role === 'provider'
    ? pickFirst(providerProfile?.skills || providerProfile?.specialities?.map((item) => item.name))
    : '';
  const hiringCategoryName = role === 'recruiter'
    ? pickFirst(recruiterProfile?.skillsNeeded)
    : '';

  const referralType = resolveReferralType({ referral, user, referrer });
  const commissionStatus = resolveCommissionStatus({ referral, commission });
  const amount = formatMoney(subscription.totalAmount || subscription.amount || 0);
  const resolvedPaymentStatus = subscription.paymentStatus
    || (subscription.status === 'pending_payment'
      ? 'pending'
      : amount === 0
        ? 'free'
        : 'paid');

  return {
    subscriptionId: subscription._id,
    userId: user?._id || subscription.userId,
    userName: user?.name || '',
    userEmail: user?.email || '',
    userPhone: user?.phone || user?.whatsappNumber || '',
    userRole: role,
    providerProfileId: user?.providerProfileId || providerProfile?._id || null,
    recruiterProfileId: user?.recruiterProfileId || recruiterProfile?._id || null,
    planId: plan?._id || subscription.planId,
    planName: plan?.name || subscription.planSnapshot?.name || '',
    planCategory: resolvePlanCategory(plan),
    planFor: plan?.type || role,
    skillId: null,
    skillName,
    serviceCategory: pickFirst(providerProfile?.specialities?.map((item) => item.name)),
    hiringCategoryId: null,
    hiringCategoryName,
    jobCategory: '',
    industry: recruiterProfile?.businessType || recruiterProfile?.companyType || '',
    country: location.country,
    state: location.state,
    city: location.city,
    locality: location.locality,
    duration: subscription.durationMonths || plan?.duration || null,
    amount,
    currency: subscription.currency || plan?.currency || DEFAULT_CURRENCY,
    paymentStatus: resolvedPaymentStatus,
    subscriptionStatus: subscription.status,
    startDate: subscription.startDate || null,
    endDate: subscription.endDate || null,
    cancelledAt: subscription.cancelledAt || null,
    cancelReason: subscription.cancelReason || '',
    referralType,
    referrerId: referrer?._id || referral?.referrerId || null,
    referrerName: referrer?.name || '',
    referrerRole: referrer?.activeRole || referrer?.role || referral?.referrerType || '',
    commissionPercentage: referral?.commissionPercentage || referral?.commissionRate || 0,
    commissionAmount: resolveCommissionAmount({ referral, commission }),
    commissionStatus,
    transactionId: subscription.paymentId || subscription.orderId || '',
    createdAt: subscription.createdAt,
    userMissing: !user,
    providerProfileMissing: role === 'provider' && !providerProfile,
    recruiterProfileMissing: role === 'recruiter' && !recruiterProfile,
  };
};

const buildFilterValues = (query) => {
  const startDate = query.startDate ? new Date(query.startDate) : null;
  const endDate = query.endDate ? new Date(query.endDate) : null;

  return {
    search: normalizeText(query.search),
    userType: normalizeText(query.userType || query.role),
    planId: query.planId || '',
    planCategory: normalizeText(query.planCategory),
    duration: query.duration ? Number(query.duration) : null,
    paymentStatus: normalizeText(query.paymentStatus),
    subscriptionStatus: normalizeText(query.subscriptionStatus || query.status),
    country: normalizeText(query.country),
    state: normalizeText(query.state),
    city: normalizeText(query.city),
    locality: normalizeText(query.locality),
    referralType: normalizeText(query.referralType),
    referrer: normalizeText(query.referrer),
    amountMin: query.amountMin ? Number(query.amountMin) : null,
    amountMax: query.amountMax ? Number(query.amountMax) : null,
    skill: normalizeText(query.skill),
    serviceCategory: normalizeText(query.serviceCategory),
    visibilityArea: normalizeText(query.visibilityArea),
    hiringCategory: normalizeText(query.hiringCategory),
    jobCategory: normalizeText(query.jobCategory),
    industry: normalizeText(query.industry),
    startDate,
    endDate,
  };
};

const matchesText = (value, query) => {
  if (!query) return true;
  return normalizeText(value).includes(query);
};

const applyFilters = (items, filters) => {
  return items.filter((item) => {
    if (filters.userType && item.userRole !== filters.userType) return false;
    if (filters.planId && String(item.planId) !== String(filters.planId)) return false;
    if (filters.planCategory && !matchesText(item.planCategory, filters.planCategory)) return false;
    if (filters.duration && Number(item.duration) !== filters.duration) return false;
    if (filters.paymentStatus && normalizeText(item.paymentStatus) !== filters.paymentStatus) return false;
    if (filters.subscriptionStatus && normalizeText(item.subscriptionStatus) !== filters.subscriptionStatus) return false;
    if (filters.country && !matchesText(item.country, filters.country)) return false;
    if (filters.state && !matchesText(item.state, filters.state)) return false;
    if (filters.city && !matchesText(item.city, filters.city)) return false;
    if (filters.locality && !matchesText(item.locality, filters.locality)) return false;
    if (filters.referralType && normalizeText(item.referralType) !== filters.referralType) return false;
    if (filters.referrer && !matchesText(item.referrerName, filters.referrer)) return false;
    if (filters.skill && !matchesText(item.skillName, filters.skill)) return false;
    if (filters.serviceCategory && !matchesText(item.serviceCategory, filters.serviceCategory)) return false;
    if (filters.visibilityArea && !matchesText(item.planCategory, filters.visibilityArea)) return false;
    if (filters.hiringCategory && !matchesText(item.hiringCategoryName, filters.hiringCategory)) return false;
    if (filters.jobCategory && !matchesText(item.jobCategory, filters.jobCategory)) return false;
    if (filters.industry && !matchesText(item.industry, filters.industry)) return false;

    if (filters.amountMin != null && Number(item.amount) < filters.amountMin) return false;
    if (filters.amountMax != null && Number(item.amount) > filters.amountMax) return false;

    if (filters.startDate || filters.endDate) {
      const createdAt = item.createdAt ? new Date(item.createdAt) : null;
      if (!createdAt) return false;
      if (filters.startDate && createdAt < filters.startDate) return false;
      if (filters.endDate && createdAt > filters.endDate) return false;
    }

    if (filters.search) {
      const haystack = [
        item.userName,
        item.userEmail,
        item.userPhone,
        item.userId,
        item.transactionId,
        item.planName,
      ].map(normalizeText);
      if (!haystack.some((value) => value.includes(filters.search))) return false;
    }

    return true;
  });
};

const buildSummary = (items) => {
  const summary = {
    totalRevenue: 0,
    providerRevenue: 0,
    recruiterRevenue: 0,
    activeRevenue: 0,
    cancelledRevenue: 0,
    expiredRevenue: 0,
    pausedRevenue: 0,
    referralRevenue: 0,
    directRevenue: 0,
    commissionPayable: 0,
    commissionPaid: 0,
    netRevenue: 0,
  };

  items.forEach((item) => {
    const amount = Number(item.amount || 0);
    summary.totalRevenue += amount;

    if (item.userRole === 'provider') summary.providerRevenue += amount;
    if (item.userRole === 'recruiter') summary.recruiterRevenue += amount;

    if (item.subscriptionStatus === 'active') summary.activeRevenue += amount;
    if (item.subscriptionStatus === 'cancelled') summary.cancelledRevenue += amount;
    if (item.subscriptionStatus === 'expired') summary.expiredRevenue += amount;
    if (item.subscriptionStatus === 'paused') summary.pausedRevenue += amount;

    if (item.referralType && item.referralType !== 'direct') summary.referralRevenue += amount;
    if (item.referralType === 'direct') summary.directRevenue += amount;

    if (item.commissionStatus && item.commissionStatus !== 'not_applicable') {
      summary.commissionPayable += Number(item.commissionAmount || 0);
      if (item.commissionStatus === 'paid') summary.commissionPaid += Number(item.commissionAmount || 0);
    }
  });

  summary.netRevenue = summary.totalRevenue - summary.commissionPayable;

  Object.keys(summary).forEach((key) => {
    summary[key] = formatMoney(summary[key]);
  });

  return summary;
};

const groupBy = (items, key) => {
  const groups = new Map();
  items.forEach((item) => {
    const value = item[key] || 'Unknown';
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(item);
  });
  return groups;
};

const buildBreakdown = (items, key) => {
  const groups = groupBy(items, key);
  const rows = [];
  groups.forEach((groupItems, label) => {
    const revenue = groupItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const activeCount = groupItems.filter((item) => item.subscriptionStatus === 'active').length;
    const cancelledCount = groupItems.filter((item) => item.subscriptionStatus === 'cancelled').length;
    const expiredCount = groupItems.filter((item) => item.subscriptionStatus === 'expired').length;
    const commissionAmount = groupItems.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0);
    const netRevenue = revenue - commissionAmount;

    rows.push({
      label,
      totalRevenue: formatMoney(revenue),
      subscriptionCount: groupItems.length,
      activeCount,
      cancelledCount,
      expiredCount,
      averageRevenue: formatMoney(revenue / Math.max(groupItems.length, 1)),
      commissionAmount: formatMoney(commissionAmount),
      netRevenue: formatMoney(netRevenue),
    });
  });

  return rows.sort((a, b) => b.totalRevenue - a.totalRevenue);
};

const getUserSubscriptions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Number(req.query.limit || 20));

    const baseMatch = {};
    if (req.query.role || req.query.userType) baseMatch.role = req.query.role || req.query.userType;
    if (req.query.status || req.query.subscriptionStatus) baseMatch.status = req.query.status || req.query.subscriptionStatus;
    if (req.query.paymentStatus) baseMatch.paymentStatus = req.query.paymentStatus;
    if (req.query.planId) baseMatch.planId = req.query.planId;
    if (req.query.duration) baseMatch.durationMonths = Number(req.query.duration);

    const subscriptions = (await prisma.userSubscription.findMany({
      where: baseMatch,
      include: { userIdRecord: { select: {
        id: true, name: true, email: true, phone: true, whatsappNumber: true,
        roles: true, activeRole: true, role: true, providerProfileId: true, recruiterProfileId: true,
        source: true, referrerType: true, referredBy: true, referredByPartnerId: true,
        createdByPartnerId: true, firstRegisteredRole: true,
      } }, planIdRecord: true },
      orderBy: { createdAt: 'desc' },
    })).map(mapUserSubscription);

    const userIds = subscriptions.map((sub) => sub.userId?._id).filter(Boolean);
    const subscriptionIds = subscriptions.map((sub) => sub._id);

    const [providerProfiles, recruiterProfiles, referrals, commissions] = await Promise.all([
      prisma.providerProfile.findMany({ where: { user: { in: userIds.map(String) } } }).then(withLegacyIds),
      prisma.recruiterProfile.findMany({ where: { user: { in: userIds.map(String) } } }).then(withLegacyIds),
      prisma.referral.findMany({ where: { referredUserId: { in: userIds.map(String) } } }).then(withLegacyIds),
      prisma.commissionTransaction.findMany({ where: { subscriptionId: { in: subscriptionIds.map(String) } } }).then(withLegacyIds),
    ]);

    const providerByUser = new Map(providerProfiles.map((profile) => [String(profile.user), profile]));
    const recruiterByUser = new Map(recruiterProfiles.map((profile) => [String(profile.user), profile]));
    const referralByUser = new Map(referrals.map((ref) => [String(ref.referredUserId), ref]));
    const commissionBySubscription = new Map(commissions.map((commission) => [String(commission.subscriptionId), commission]));

    const referrerIds = referrals.map((ref) => ref.referrerId).filter(Boolean);
    const referrers = withLegacyIds(await prisma.user.findMany({ where: { id: { in: referrerIds.map(String) } }, select: { id: true, name: true, email: true, roles: true, activeRole: true, role: true } }));
    const referrerById = new Map(referrers.map((ref) => [String(ref._id), ref]));

    const normalized = subscriptions.map((subscription) => {
      const user = subscription.userId || null;
      const plan = subscription.planId || null;
      const referral = user ? referralByUser.get(String(user._id)) : null;
      const referrer = referral ? referrerById.get(String(referral.referrerId)) : null;
      const providerProfile = user ? providerByUser.get(String(user._id)) : null;
      const recruiterProfile = user ? recruiterByUser.get(String(user._id)) : null;
      const commission = commissionBySubscription.get(String(subscription._id)) || null;

      return normalizeSubscription({
        subscription,
        user,
        plan,
        providerProfile,
        recruiterProfile,
        referral,
        referrer,
        commission,
      });
    });

    const filters = buildFilterValues(req.query);
    const filtered = applyFilters(normalized, filters);
    const summary = buildSummary(filtered);

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    res.json({
      subscriptions: paginated,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load subscriptions', error: error.message });
  }
};

const getUserSubscriptionAnalytics = async (req, res) => {
  try {
    const baseMatch = {};
    if (req.query.role || req.query.userType) baseMatch.role = req.query.role || req.query.userType;
    if (req.query.status || req.query.subscriptionStatus) baseMatch.status = req.query.status || req.query.subscriptionStatus;
    if (req.query.paymentStatus) baseMatch.paymentStatus = req.query.paymentStatus;
    if (req.query.planId) baseMatch.planId = req.query.planId;
    if (req.query.duration) baseMatch.durationMonths = Number(req.query.duration);

    const subscriptions = (await prisma.userSubscription.findMany({
      where: baseMatch,
      include: { userIdRecord: { select: {
        id: true, name: true, email: true, phone: true, whatsappNumber: true,
        roles: true, activeRole: true, role: true, providerProfileId: true, recruiterProfileId: true,
        source: true, referrerType: true, referredBy: true, referredByPartnerId: true,
        createdByPartnerId: true, firstRegisteredRole: true,
      } }, planIdRecord: true },
      orderBy: { createdAt: 'desc' },
    })).map(mapUserSubscription);

    const userIds = subscriptions.map((sub) => sub.userId?._id).filter(Boolean);
    const subscriptionIds = subscriptions.map((sub) => sub._id);

    const [providerProfiles, recruiterProfiles, referrals, commissions] = await Promise.all([
      prisma.providerProfile.findMany({ where: { user: { in: userIds.map(String) } } }).then(withLegacyIds),
      prisma.recruiterProfile.findMany({ where: { user: { in: userIds.map(String) } } }).then(withLegacyIds),
      prisma.referral.findMany({ where: { referredUserId: { in: userIds.map(String) } } }).then(withLegacyIds),
      prisma.commissionTransaction.findMany({ where: { subscriptionId: { in: subscriptionIds.map(String) } } }).then(withLegacyIds),
    ]);

    const providerByUser = new Map(providerProfiles.map((profile) => [String(profile.user), profile]));
    const recruiterByUser = new Map(recruiterProfiles.map((profile) => [String(profile.user), profile]));
    const referralByUser = new Map(referrals.map((ref) => [String(ref.referredUserId), ref]));
    const commissionBySubscription = new Map(commissions.map((commission) => [String(commission.subscriptionId), commission]));

    const referrerIds = referrals.map((ref) => ref.referrerId).filter(Boolean);
    const referrers = withLegacyIds(await prisma.user.findMany({ where: { id: { in: referrerIds.map(String) } }, select: { id: true, name: true, email: true, roles: true, activeRole: true, role: true } }));
    const referrerById = new Map(referrers.map((ref) => [String(ref._id), ref]));

    const normalized = subscriptions.map((subscription) => {
      const user = subscription.userId || null;
      const plan = subscription.planId || null;
      const referral = user ? referralByUser.get(String(user._id)) : null;
      const referrer = referral ? referrerById.get(String(referral.referrerId)) : null;
      const providerProfile = user ? providerByUser.get(String(user._id)) : null;
      const recruiterProfile = user ? recruiterByUser.get(String(user._id)) : null;
      const commission = commissionBySubscription.get(String(subscription._id)) || null;

      return normalizeSubscription({
        subscription,
        user,
        plan,
        providerProfile,
        recruiterProfile,
        referral,
        referrer,
        commission,
      });
    });

    const filters = buildFilterValues(req.query);
    const filtered = applyFilters(normalized, filters);

    res.json({
      breakdowns: {
        byUserType: buildBreakdown(filtered, 'userRole'),
        byPlan: buildBreakdown(filtered, 'planName'),
        byPlanCategory: buildBreakdown(filtered, 'planCategory'),
        byProviderSkill: buildBreakdown(filtered.filter((item) => item.userRole === 'provider'), 'skillName'),
        byProviderServiceCategory: buildBreakdown(filtered.filter((item) => item.userRole === 'provider'), 'serviceCategory'),
        byRecruiterHiringCategory: buildBreakdown(filtered.filter((item) => item.userRole === 'recruiter'), 'hiringCategoryName'),
        byRecruiterIndustry: buildBreakdown(filtered.filter((item) => item.userRole === 'recruiter'), 'industry'),
        byCountry: buildBreakdown(filtered, 'country'),
        byState: buildBreakdown(filtered, 'state'),
        byCity: buildBreakdown(filtered, 'city'),
        byLocality: buildBreakdown(filtered, 'locality'),
        byReferralType: buildBreakdown(filtered, 'referralType'),
        byReferrer: buildBreakdown(filtered, 'referrerName'),
        bySubscriptionStatus: buildBreakdown(filtered, 'subscriptionStatus'),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load analytics', error: error.message });
  }
};

const sendSubscriptionReminder = async (req, res) => {
  try {
    const { subscriptionIds = [], channel = 'email', offerCode = '' } = req.body || {};
    if (!Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
      return res.status(400).json({ message: 'subscriptionIds are required' });
    }

    const subscriptions = (await prisma.userSubscription.findMany({
      where: { id: { in: subscriptionIds.map(String) } },
      include: { userIdRecord: { select: { id: true, name: true, email: true, phone: true, whatsappNumber: true, activeRole: true, role: true } }, planIdRecord: true },
    })).map(mapUserSubscription);

    const results = [];

    for (const subscription of subscriptions) {
      const user = subscription.userId;
      if (!user) {
        results.push({ id: subscription._id, status: 'skipped', reason: 'missing_user' });
        continue;
      }

      const role = subscription.role || subscription.planId?.type || user.activeRole || 'provider';
      const planName = subscription.planId?.name || 'plan';
      const endDate = subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A';
      const renewalLink = buildPaymentLink(req, user._id);
      const safeName = user.name || 'there';

      const message = role === 'recruiter'
        ? `Your recruiter plan has expired. Renew now to continue posting jobs and contacting candidates.`
        : `Your provider plan has expired. Renew now to continue getting customer leads and visibility in your service area.`;

      const subject = `Renew your ${planName} subscription`;
      const text = `Hi ${safeName},\n\n${message}\n\nPlan: ${planName}\nExpiry: ${endDate}\nRenew: ${renewalLink}\n${offerCode ? `Offer: ${offerCode}\n` : ''}\nThanks,\nServiceHub Team`;
      const html = `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
          <p>Hi ${safeName},</p>
          <p>${message}</p>
          <p><strong>Plan:</strong> ${planName}<br/>
          <strong>Expiry:</strong> ${endDate}</p>
          <p><a href="${renewalLink}" style="color: #2563eb; font-weight: 600;">Renew now</a></p>
          ${offerCode ? `<p><strong>Offer:</strong> ${offerCode}</p>` : ''}
          <p>Thanks,<br/>ServiceHub Team</p>
        </div>
      `;

      try {
        if (channel === 'whatsapp') {
          const phone = user.whatsappNumber || user.phone;
          if (!phone) {
            results.push({ id: subscription._id, status: 'skipped', reason: 'missing_phone' });
            continue;
          }
          await sendWhatsAppMessage(phone, 'renewal_reminder', { name: safeName });
        } else {
          if (!user.email) {
            results.push({ id: subscription._id, status: 'skipped', reason: 'missing_email' });
            continue;
          }
          await sendMail({ to: user.email, subject, text, html });
        }

        results.push({ id: subscription._id, status: 'sent' });
      } catch (err) {
        results.push({ id: subscription._id, status: 'failed', reason: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send reminders', error: error.message });
  }
};

const bulkAction = async (req, res) => {
  try {
    const { action, subscriptionIds = [] } = req.body || {};
    if (!action) return res.status(400).json({ message: 'action is required' });

    if (action === 'generate_payment_links') {
      const subscriptions = (await prisma.userSubscription.findMany({
        where: { id: { in: subscriptionIds.map(String) } },
        include: { userIdRecord: { select: { id: true, name: true, email: true } } },
      })).map(mapUserSubscription);

      const links = subscriptions
        .filter((sub) => sub.userId)
        .map((sub) => ({
          subscriptionId: sub._id,
          userId: sub.userId._id,
          userName: sub.userId.name || '',
          userEmail: sub.userId.email || '',
          paymentLink: buildPaymentLink(req, sub.userId._id),
        }));

      return res.json({ success: true, links });
    }

    return res.status(400).json({ message: 'Unsupported bulk action' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process bulk action', error: error.message });
  }
};

const updateUserSubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['active', 'expired', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active, expired, or cancelled.' });
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

    const plan = subscription.planId;
    const role = subscription.role || plan?.type || 'provider';
    const userId = subscription.userId?._id || subscription.userId;

    if (status === 'active') {
      const endDate = subscription.endDate || new Date(Date.now() + (plan?.duration || 30) * 24 * 60 * 60 * 1000);

      if (role === 'provider') {
        const visibilityLevel = String(plan?.visibilityLevel || 'basic');
        const boostWeightByLevel = { country_top: 5, city_top: 4, pincode_top: 3, custom: 4, basic: 1 };
        await updateProviderPlanProfile(
          userId,
          {
            currentPlan: plan?.slug || 'basic', activePlanId: plan?._id || null,
            activeSubscriptionId: subscription._id, visibilityLevel,
            boostedUntil: endDate,
            allowedSkillsCount: Number(plan?.maxSkills || 1),
            allowedPincodesCount: Number(plan?.maxPincodes || 1),
            allowedCitiesCount: Number(plan?.maxCities || 1),
            planCoverageType: plan?.coverageType || 'pincode',
            isTopInPincode: visibilityLevel === 'pincode_top',
            isTopInCity: visibilityLevel === 'city_top',
            isTopInCountry: visibilityLevel === 'country_top',
            isActiveSubscription: true, inRotationPool: true,
            boostWeight: Number(boostWeightByLevel[visibilityLevel] || 1),
          },
          { new: true }
        );
      } else if (role === 'recruiter') {
        const creditsToAdd = Number(plan?.unlockCredits || 0);
        await updateRecruiterPlanProfile(
          userId,
          { currentPlan: plan?.slug || 'free', planExpiresAt: endDate, unlocksRemaining: creditsToAdd, unlockPackSize: creditsToAdd },
          { new: true }
        );
      }
    } else {
      if (role === 'provider') {
        await updateProviderPlanProfile(
          userId,
          {
            currentPlan: 'free', activePlanId: null, activeSubscriptionId: null,
            visibilityLevel: 'basic', boostedUntil: null,
            allowedSkillsCount: 1, allowedPincodesCount: 1, allowedCitiesCount: 1,
            planCoverageType: 'pincode', isTopInPincode: false, isTopInCity: false,
            isTopInCountry: false, isActiveSubscription: false, boostWeight: 0,
          },
          { new: true }
        );
      } else if (role === 'recruiter') {
        await updateRecruiterPlanProfile(
          userId,
          { currentPlan: 'free', planExpiresAt: null, unlocksRemaining: 2, unlockPackSize: 2 },
          { new: true }
        );
      }
    }

    res.json({ success: true, subscription: { _id: subscription._id, status: subscription.status, role } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update subscription status', error: error.message });
  }
};

module.exports = {
  getUserSubscriptions,
  getUserSubscriptionAnalytics,
  sendSubscriptionReminder,
  bulkAction,
  updateUserSubscriptionStatus,
};
