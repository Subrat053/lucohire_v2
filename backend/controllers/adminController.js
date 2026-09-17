const { assignFreePlan } = require("./subscriptionController");
const { clearFeatureFlagCache } = require("../middleware/featureFlag");
const { getPaymentConfig } = require("../utils/stripe");
const { getRazorpayConfig } = require("../utils/razorpay");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinary");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const prisma = require('../config/prisma');
const {
  createUser,
  deleteUser: deleteUserRecord,
  prepareUserData,
  saveUser,
  toAuthUser,
} = require('../services/authPersistenceService');
const {
  prepareSkillCategoryData,
  withMetadataId,
  withMetadataIds,
} = require('../services/jobPersistenceService');
const { deleteApplicationDataForUser } = require('../services/applicationPersistenceService');
const {
  createApprovalLog,
  listApprovalLogs,
  listContactClickLogs,
  listOtpLogs,
  listVisitHistory,
  listWhatsappLogs,
} = require('../services/auditPersistenceService');
const { withLegacyId } = require('../utils/prismaResponse');
const {
  createPlan: createPlanRecord,
  findActiveUserSubscription,
  findPlan,
  findPlanById,
  listPayments,
  listPlans,
  mapProviderSubscription,
  mapUserSubscription,
  paymentRevenue,
  planData,
  updatePlan: updatePlanRecord,
  updateProviderSubscription,
  updateUserSubscription,
} = require('../services/billingPersistenceService');
const {
  ensureRecruiterProfile,
  findRecruiterProfileByUserId,
  saveRecruiterProfile,
} = require('../services/recruiterCompanyPersistenceService');
const {
  ensureProviderProfile,
  findProviderProfileByIdOrUserId,
  findProviderProfileByUserId,
  mapProviderRecord,
  saveProviderProfile,
} = require('../services/providerProfilePersistenceService');

const PLAN_TIERS = new Set(["starter", "business", "enterprise"]);
const LEGACY_PAID_TIERS = new Set(["basic", "pro", "featured"]);
const PLAN_DURATIONS = [30, 90, 180, 365];

const DEFAULT_DISCOUNTS = { 90: 5, 180: 10, 365: 20 };
const ADDON_SLUGS = new Set(['top-in-city', 'one-pincode-top', 'show-top-in-country', 'add-multiple-skills', 'whatsapp-alerts']);

const roundMoney = (value) =>
  Math.max(0, Math.round((Number(value) || 0) * 100) / 100);

const getPlanDiscounts = async () => {
  const keys = ["plan_discount_90", "plan_discount_180", "plan_discount_365"];
  const settings = await prisma.adminSetting.findMany({ where: { key: { in: keys } } });
  const byKey = new Map(settings.map((s) => [s.key, Number(s.value)]));

  return {
    90: Number.isFinite(byKey.get("plan_discount_90"))
      ? byKey.get("plan_discount_90")
      : DEFAULT_DISCOUNTS[90],
    180: Number.isFinite(byKey.get("plan_discount_180"))
      ? byKey.get("plan_discount_180")
      : DEFAULT_DISCOUNTS[180],
    365: Number.isFinite(byKey.get("plan_discount_365"))
      ? byKey.get("plan_discount_365")
      : DEFAULT_DISCOUNTS[365],
  };
};

const derivePriceFromMonthly = (monthlyPrice, duration, discountPercent) => {
  if (duration === 30) return roundMoney(monthlyPrice);
  const months = duration / 30;
  const discountedMultiplier = Math.max(
    0,
    1 - (Number(discountPercent) || 0) / 100,
  );
  return roundMoney(Number(monthlyPrice || 0) * months * discountedMultiplier);
};

const hasPrivilegedRole = (userLike) => {
  if (!userLike) return false;
  const roles = Array.isArray(userLike.roles) ? userLike.roles : [];
  const activeRole = userLike.activeRole || userLike.role;
  return (
    roles.includes("admin") ||
    roles.includes("manager") ||
    activeRole === "admin" ||
    activeRole === "manager"
  );
};

const getExcludedModerationUserIds = async (actorId) => {
  const privilegedUsers = await prisma.user.findMany({
    where: {
      OR: [
        { roles: { hasSome: ["admin", "manager"] } },
        { activeRole: { in: ["admin", "manager"] } },
        { role: { in: ["admin", "manager"] } },
      ],
    },
    select: { id: true },
  });

  const ids = privilegedUsers.map((u) => u.id);
  if (actorId) ids.push(String(actorId));
  return ids;
};

const populateRotationPoolProviders = async (pool) => {
  if (!pool) return pool;
  const legacyPool = withLegacyId(pool);
  const providersArray = Array.isArray(legacyPool.providers) ? legacyPool.providers : [];
  if (providersArray.length === 0) return legacyPool;

  const providerIds = providersArray
    .map(p => (typeof p.provider === 'string' ? p.provider : p.provider?.id || p.provider?._id))
    .filter(Boolean);

  if (providerIds.length === 0) return legacyPool;

  const providerProfiles = await prisma.providerProfile.findMany({
    where: { id: { in: providerIds } },
    include: {
      userRecord: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  const profileMap = new Map();
  for (const prof of providerProfiles) {
    const item = withLegacyId(prof);
    item.user = withLegacyId(prof.userRecord);
    delete item.userRecord;
    profileMap.set(prof.id, item);
  }

  legacyPool.providers = providersArray.map(p => {
    const pId = typeof p.provider === 'string' ? p.provider : p.provider?.id || p.provider?._id;
    return {
      ...p,
      provider: profileMap.get(pId) || p.provider,
    };
  });

  return legacyPool;
};

const applyRecruiterApprovalDecision = async ({ profileId, approved, note, actor }) => {
  const record = await prisma.recruiterProfile.findUnique({
    where: { id: String(profileId) },
    include: {
      userRecord: {
        select: { id: true, name: true, email: true, phone: true, roles: true, activeRole: true, role: true },
      },
    },
  });
  if (!record) return null;

  const user = withLegacyId(record.userRecord);
  if (!user) {
    const error = new Error('Target user not found');
    error.statusCode = 404;
    throw error;
  }
  if (String(user._id) === String(actor?._id)) {
    const error = new Error('You cannot approve or reject your own profile.');
    error.statusCode = 403;
    throw error;
  }
  if (hasPrivilegedRole(user)) {
    const error = new Error('Admin/manager profiles are not eligible for approval actions.');
    error.statusCode = 400;
    throw error;
  }

  const isApproved = approved !== false;
  const updated = withLegacyId(await prisma.recruiterProfile.update({
    where: { id: String(profileId) },
    data: {
      isApproved,
      isVerified: isApproved,
      approvalAction: isApproved ? 'approved' : 'rejected',
      approvalNote: typeof note === 'string' ? note.trim() : '',
      approvedBy: actor?._id ? String(actor._id) : null,
      approvedByRole: actor?.activeRole || actor?.role || null,
      approvedAt: new Date(),
    },
  }));
  const profile = { ...updated, user };

  await createApprovalLog({
    targetType: 'recruiter',
    targetProfileId: profile._id,
    targetUserId: user._id,
    targetName: user.name || '',
    action: isApproved ? 'approved' : 'rejected',
    note: profile.approvalNote,
    actorId: actor?._id,
    actorName: actor?.name || '',
    actorRole: actor?.activeRole || actor?.role || 'admin',
  });

  return profile;
};

const applyProviderApprovalDecision = async ({ profileId, approved, note, actor }) => {
  const record = await prisma.providerProfile.findUnique({
    where: { id: String(profileId) },
    include: {
      userRecord: {
        select: { id: true, name: true, email: true, phone: true, roles: true, activeRole: true, role: true },
      },
    },
  });
  if (!record) return null;
  const profile = mapProviderRecord(record);
  const user = profile.user;
  if (!user) {
    const error = new Error('Target user not found');
    error.statusCode = 404;
    throw error;
  }
  if (String(user._id) === String(actor?._id)) {
    const error = new Error('You cannot approve or reject your own profile.');
    error.statusCode = 403;
    throw error;
  }
  if (hasPrivilegedRole(user)) {
    const error = new Error('Admin/manager profiles are not eligible for approval actions.');
    error.statusCode = 400;
    throw error;
  }

  const isApproved = approved !== false;
  const updated = withLegacyId(await prisma.providerProfile.update({
    where: { id: String(profileId) },
    data: {
      isApproved,
      isVerified: isApproved,
      approvalAction: isApproved ? 'approved' : 'rejected',
      approvalNote: typeof note === 'string' ? note.trim() : '',
      approvedBy: actor?._id ? String(actor._id) : null,
      approvedByRole: actor?.activeRole || actor?.role || null,
      approvedAt: new Date(),
    },
  }));
  const responseProfile = { ...updated, user };
  await createApprovalLog({
    targetType: 'provider',
    targetProfileId: responseProfile._id,
    targetUserId: user._id,
    targetName: user.name || '',
    action: isApproved ? 'approved' : 'rejected',
    note: responseProfile.approvalNote,
    actorId: actor?._id,
    actorName: actor?.name || '',
    actorRole: actor?.activeRole || actor?.role || 'admin',
  });
  return responseProfile;
};

const normalizeRoleIntent = (user) => {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const hasProvider = roles.includes("provider") || user.role === "provider";
  const hasRecruiter = roles.includes("recruiter") || user.role === "recruiter";
  if (hasProvider && hasRecruiter) return "both";
  if (hasRecruiter) return "recruiter";
  return "provider";
};

const buildPlanSummary = async (userId, role) => {
  const subscription = await findActiveUserSubscription(userId, role, true);

  if (!subscription || !subscription.planId) return null;
  const plan = subscription.planId;
  return {
    planId: plan._id,
    code: plan.code || plan.slug,
    name: plan.name,
    planType: plan.planType || (Number(plan.price || 0) > 0 ? "paid" : "free"),
    price: plan.price,
    billingCycle: plan.billingCycle || "monthly",
    durationDays: plan.durationDays || plan.duration,
    contactLimit: plan.contactLimit || null,
    visibility: plan.visibility || null,
    limits: plan.limits || null,
    status: subscription.status,
    startedAt: subscription.startDate,
    expiresAt: subscription.endDate,
  };
};

const ensurePanelAccessWithFreePlan = async (user, role) => {
  const activeSubscription = await findActiveUserSubscription(user._id, role, false);

  if (!activeSubscription) {
    await assignFreePlan(user._id, role);
  }

  user.panelAccess = user.panelAccess || {
    provider: { enabled: false, source: "none" },
    recruiter: { enabled: false, source: "none" },
  };
  if (role === "provider") {
    user.panelAccess.provider.enabled = true;
    user.panelAccess.provider.source =
      user.panelAccess.provider.source === "paid_plan"
        ? "paid_plan"
        : "free_plan";
  }
  if (role === "recruiter") {
    user.panelAccess.recruiter.enabled = true;
    user.panelAccess.recruiter.source =
      user.panelAccess.recruiter.source === "paid_plan"
        ? "paid_plan"
        : "free_plan";
  }
};

const syncTierPlanFamily = async ({ payload, currentPlan }) => {
  const type = payload.type || currentPlan?.type;
  const slug = payload.slug || currentPlan?.slug;

  if (!type || !slug) {
    throw new Error("type and slug are required");
  }

  const isPaidTier = PLAN_TIERS.has(slug) && Number(payload.price) > 0;
  if (!isPaidTier) return null;

  const discounts = await getPlanDiscounts();

  let monthlyPrice;
  if (Number(payload.duration) === 30) {
    monthlyPrice = Number(payload.price);
  } else {
    const existingMonthly = await findPlan({ type, slug, duration: 30 });
    if (existingMonthly) {
      monthlyPrice = Number(existingMonthly.price);
    } else {
      const currentDuration = Number(payload.duration) || 30;
      const discount =
        currentDuration === 30 ? 0 : discounts[currentDuration] || 0;
      const multiplier = (currentDuration / 30) * (1 - discount / 100);
      monthlyPrice =
        multiplier > 0
          ? Number(payload.price) / multiplier
          : Number(payload.price);
    }
  }

  const base = {
    ...payload,
    type,
    slug,
    name: payload.name || currentPlan?.name || slug,
    sortOrder:
      payload.sortOrder ??
      currentPlan?.sortOrder ??
      (slug === "starter" ? 1 : slug === "business" ? 2 : 3),
  };
  delete base._id;
  delete base.__v;
  delete base.createdAt;
  delete base.updatedAt;

  const upserts = [];
  for (const duration of PLAN_DURATIONS) {
    const discount = duration === 30 ? 0 : discounts[duration] || 0;
    const price = derivePriceFromMonthly(monthlyPrice, duration, discount);

    let durationUnlockCredits = base.unlockCredits;
    let durationFeatures = [...(base.features || [])];

    if (type === "recruiter" && base.unlockCredits) {
      const scaleFactor = Math.round(duration / 30);
      durationUnlockCredits = Math.round(Number(base.unlockCredits) * scaleFactor);

      const monthlyCredits = Number(base.unlockCredits);
      durationFeatures = durationFeatures.map(f =>
        f.replace(new RegExp(`\\b${monthlyCredits}\\b`, 'g'), durationUnlockCredits)
      );
    }

    let durationCode = base.code;
    if (base.code) {
      const baseCodeWithoutSuffix = base.code.replace(/_(30|90|180|365)$/, '');
      durationCode = `${baseCodeWithoutSuffix}_${duration}`;
    }

    let durationCountryPricing = undefined;
    if (base.countryPricing && base.countryPricing.length > 0) {
      const sourceDuration = Number(payload.duration) || 30;
      durationCountryPricing = base.countryPricing.map(entry => {
        let monthlyCountryBase = entry.basePrice;
        let monthlyCountryDiscounted = entry.discountedPrice;
        
        if (sourceDuration !== 30) {
          const sourceDiscount = sourceDuration === 30 ? 0 : discounts[sourceDuration] || 0;
          const sourceMultiplier = (sourceDuration / 30) * (1 - sourceDiscount / 100);
          if (sourceMultiplier > 0) {
            monthlyCountryBase = entry.basePrice / sourceMultiplier;
            monthlyCountryDiscounted = entry.discountedPrice / sourceMultiplier;
          }
        }

        const durationCountryBase = derivePriceFromMonthly(monthlyCountryBase, duration, discount);
        const durationCountryDiscounted = entry.discountedPrice > 0 
          ? derivePriceFromMonthly(monthlyCountryDiscounted, duration, discount)
          : 0;

        const entryObj = entry.toObject ? entry.toObject() : { ...entry };
        delete entryObj._id;
        return {
          ...entryObj,
          basePrice: durationCountryBase,
          discountedPrice: durationCountryDiscounted
        };
      });
    }

    const durationPlanData = planData({
        ...base,
        duration,
        price,
        code: durationCode,
        unlockCredits: durationUnlockCredits,
        features: durationFeatures,
        isActive: base.isActive !== false,
        ...(durationCountryPricing ? { countryPricing: durationCountryPricing } : {})
      });
    const doc = withLegacyId(await prisma.plan.upsert({
      where: { type_slug_duration: { type, slug, duration } },
      create: durationPlanData,
      update: durationPlanData,
    }));
    upserts.push(doc);
    upserts.push(doc);
  }

  return upserts;
};

// @desc    Admin dashboard stats
// @route   GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalUsers,
      totalProviders,
      totalRecruiters,
      pendingProviderApprovals,
      pendingRecruiterApprovals,
      pendingPhotoApprovals,
      totalRevenueAgg,
      monthlyRevenueAgg,
      totalPayoutsAgg,
      planSummaryAgg,
      revenueTrendAgg,
      earningsBySourceAgg,
      topPartners,
      rewardPoolSetting,
      totalExternalJobs,
      totalCompanySources,
      totalRecruiterLeads,
      lastSyncLog,
      recentUsersRaw
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { OR: [{ role: "provider" }, { roles: { has: "provider" } }] } }),
      prisma.user.count({ where: { OR: [{ role: "recruiter" }, { roles: { has: "recruiter" } }] } }),
      prisma.providerProfile.count({ where: { isApproved: false } }),
      prisma.recruiterProfile.count({ where: { isApproved: false } }),
      prisma.user.count({
        where: {
          profilePhotoApproval: {
            path: ['status'],
            equals: 'pending',
          },
        },
      }),
      paymentRevenue({ status: 'completed' }),
      paymentRevenue({ status: 'completed', createdAt: { gte: startOfMonth } }),
      prisma.payoutRequest.aggregate({ where: { status: 'completed' }, _sum: { amount: true } })
        .then((result) => Number(result._sum.amount || 0)),
      (async () => {
        const groups = await prisma.userSubscription.groupBy({
          by: ['planId'], where: { status: 'active', endDate: { gt: today }, planId: { not: null } },
          _count: { _all: true },
        });
        const plans = await prisma.plan.findMany({
          where: { id: { in: groups.map((group) => group.planId).filter(Boolean) } },
          select: { id: true, name: true },
        });
        const planById = new Map(plans.map((plan) => [plan.id, plan]));
        return groups.map((group) => ({ plan: planById.get(group.planId), count: group._count._all }))
          .filter((item) => item.plan);
      })(),
      prisma.payment.findMany({
        where: { status: 'completed' }, select: { amount: true, createdAt: true }, orderBy: { createdAt: 'desc' },
      }).then((rows) => {
        const grouped = new Map();
        for (const row of rows) {
          const key = `${row.createdAt.getUTCFullYear()}-${row.createdAt.getUTCMonth() + 1}`;
          grouped.set(key, (grouped.get(key) || 0) + Number(row.amount || 0));
        }
        return [...grouped.entries()].map(([key, revenue]) => {
          const [year, month] = key.split('-').map(Number);
          return { year, month, revenue };
        }).sort((a, b) => b.year - a.year || b.month - a.month).slice(0, 6);
      }),
      prisma.payment.groupBy({ by: ['type'], where: { status: 'completed' }, _sum: { amount: true } }),
      prisma.user.findMany({
        where: { OR: [{ role: "partner" }, { roles: { has: "partner" } }] },
        orderBy: { referredUsersCount: 'desc' },
        take: 5,
        select: { id: true, name: true, referredUsersCount: true },
      }).then(rows => rows.map(withLegacyId)),
      prisma.adminSetting.findUnique({ where: { key: "reward_pool_amount" } }),
      prisma.externalJob.count({ where: { isActive: true } }),
      prisma.companySource.count(),
      prisma.recruiterLead.count(),
      prisma.syncLog.findFirst({ orderBy: { startedAt: 'desc' } }).then(r => r ? withLegacyId(r) : null),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, email: true, role: true, roles: true, createdAt: true },
      }),
    ]);

    const totalRevenue = totalRevenueAgg;
    const totalPayouts = totalPayoutsAgg;
    const websiteEarnings = Math.max(0, totalRevenue - totalPayouts);

    // Format revenue trend for frontend
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueTrend = revenueTrendAgg.map(item => ({
      month: months[item.month - 1],
      revenue: item.revenue
    })).reverse();

    // Format plan summary
    const planSummary = {};
    planSummaryAgg.forEach(item => {
      planSummary[item.plan.name] = item.count;
    });

    // Format earnings by source
    const earningsBySource = earningsBySourceAgg.map(item => ({
      name: item.type || "Other",
      value: Number(item._sum.amount || 0)
    }));

    res.json({
      totalUsers,
      totalProviders,
      totalRecruiters,
      pendingApprovals: pendingProviderApprovals + pendingRecruiterApprovals,
      pendingPhotoApprovals,
      totalRevenue,
      monthlyRevenue: monthlyRevenueAgg,
      totalPayouts,
      websiteEarnings,
      revenueTrend,
      earningsBySource,
      topPartners: topPartners.map(p => ({
        name: p.name,
        referrals: p.referredUsersCount || 0,
        earnings: (p.referredUsersCount || 0) * 100 // Mock earning logic
      })),
      planSummary,
      rewardPool: {
        total: Number(rewardPoolSetting?.value) || 500000,
        distributed: 0, // Placeholder or calculate if possible
        remaining: Number(rewardPoolSetting?.value) || 500000,
      },
      recentUsers: recentUsersRaw.map(withLegacyId),
      totalExternalJobs,
      totalCompanySources,
      totalRecruiterLeads,
      lastSyncLog
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users?role=&page=&limit=&search=
const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search, status } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const where = {};
    if (role) {
      where.OR = [{ role }, { roles: { has: role } }];
    }
    if (status) where.approvalStatus = status;
    if (search) {
      const searchCond = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchCond }];
        delete where.OR;
      } else {
        where.OR = searchCond;
      }
    }

    const [usersRaw, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    const users = usersRaw.map((u) => {
      const item = withLegacyId(u);
      delete item.password;
      return item;
    });

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Block/Unblock user
// @route   PUT /api/admin/users/:id/block
const toggleBlockUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.params.id;
    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) return res.status(404).json({ message: "User not found" });
    const updated = await prisma.user.update({
      where: { id: String(userId) },
      data: { isBlocked: !user.isBlocked },
    });
    res.json({
      message: `User ${updated.isBlocked ? "blocked" : "unblocked"}`,
      user: withLegacyId(updated),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Approve/reject provider
// @route   PUT /api/admin/providers/:id/approve
const approveProvider = async (req, res) => {
  try {
    const { approved, note } = req.body;
    const profile = await applyProviderApprovalDecision({
      profileId: req.params.id,
      approved,
      note,
      actor: req.user,
    });
    if (!profile)
      return res.status(404).json({ message: "Provider not found" });
    if (profile.user?._id || profile.user?.id) {
      const uId = String(profile.user.id || profile.user._id);
      const user = await prisma.user.findUnique({ where: { id: uId } });
      if (user) {
        const legacyUser = withLegacyId(user);
        legacyUser.approvalStatus = profile.isApproved ? "approved" : "rejected";
        legacyUser.approvedAt = profile.isApproved ? new Date() : null;
        legacyUser.approvedBy = profile.isApproved ? (req.user?.id || req.user?._id ? String(req.user.id || req.user._id) : null) : null;
        legacyUser.rejectionReason = profile.isApproved
          ? ""
          : profile.approvalNote || "";
        legacyUser.roleIntent = legacyUser.roleIntent || normalizeRoleIntent(legacyUser);
        if (profile.isApproved) {
          await ensurePanelAccessWithFreePlan(legacyUser, "provider");
          if (!legacyUser.activePanel) legacyUser.activePanel = "provider";
        }
        await saveUser(legacyUser);
      }
    }
    res.json({
      message: `Provider ${profile.isApproved ? "approved" : "rejected"}`,
      profile,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json({ message: error.message || "Server error", error: error.message });
  }
};

// @desc    Approve/reject recruiter
// @route   PUT /api/admin/recruiters/:id/approve
const approveRecruiter = async (req, res) => {
  try {
    const { approved, note } = req.body;
    const profile = await applyRecruiterApprovalDecision({
      profileId: req.params.id,
      approved,
      note,
      actor: req.user,
    });
    if (!profile)
      return res.status(404).json({ message: "Recruiter not found" });
    if (profile.user?._id || profile.user?.id) {
      const uId = String(profile.user.id || profile.user._id);
      const user = await prisma.user.findUnique({ where: { id: uId } });
      if (user) {
        const legacyUser = withLegacyId(user);
        legacyUser.approvalStatus = profile.isApproved ? "approved" : "rejected";
        legacyUser.approvedAt = profile.isApproved ? new Date() : null;
        legacyUser.approvedBy = profile.isApproved ? (req.user?.id || req.user?._id ? String(req.user.id || req.user._id) : null) : null;
        legacyUser.rejectionReason = profile.isApproved
          ? ""
          : profile.approvalNote || "";
        legacyUser.roleIntent = legacyUser.roleIntent || normalizeRoleIntent(legacyUser);
        if (profile.isApproved) {
          await ensurePanelAccessWithFreePlan(legacyUser, "recruiter");
          if (!legacyUser.activePanel) legacyUser.activePanel = "recruiter";
        }
        await saveUser(legacyUser);
      }
    }
    res.json({
      message: `Recruiter ${profile.isApproved ? "approved" : "rejected"}`,
      profile,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json({ message: error.message || "Server error", error: error.message });
  }
};

// @desc    Create manager (admin only)
// @route   POST /api/admin/managers
const createManager = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const countryCode = req.body.countryCode || '';
    const nationalNumber = req.body.nationalNumber || '';
    let phone = req.body.phone || '';

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (!name || !normalizedEmail) {
      return res.status(400).json({ message: "name and email are required" });
    }

    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    if (countryCode && nationalNumber) {
      const { isValidPhoneNumber } = require("../utils/phoneValidation");
      if (!isValidPhoneNumber(countryCode, nationalNumber)) {
        return res.status(400).json({ message: `Please enter a valid phone number for country code ${countryCode}.` });
      }
      phone = countryCode + nationalNumber;
    } else if (phone) {
      const { parsePhoneString, isValidPhoneNumber } = require("../utils/phoneValidation");
      const parsed = parsePhoneString(phone);
      if (parsed.countryCode && !isValidPhoneNumber(parsed.countryCode, parsed.nationalNumber)) {
        return res.status(400).json({ message: 'Please enter a valid phone number.' });
      }
      phone = parsed.fullPhone;
    }

    const generatedPassword =
      password || crypto.randomBytes(6).toString("base64url");

    const { parsePhoneString } = require("../utils/phoneValidation");
    const parsedPhone = parsePhoneString(phone);

    const manager = await createUser({
      name,
      email: normalizedEmail,
      phone: parsedPhone.fullPhone || phone || "",
      countryCode: parsedPhone.countryCode || "",
      nationalNumber: parsedPhone.nationalNumber || "",
      fullPhone: parsedPhone.fullPhone || phone || "",
      password: generatedPassword,
      roles: ["manager"],
      activeRole: "manager",
      role: "manager",
      authProvider: "email",
      isEmailVerified: true,
      termsAccepted: true,
      locale: "en",
      preferredLanguage: "en",
      country: "US",
      currency: "USD",
    });

    res.status(201).json({
      message: "Manager created successfully",
      manager: {
        _id: manager._id,
        name: manager.name,
        email: manager.email,
        phone: manager.phone,
        roles: manager.roles,
        activeRole: manager.activeRole,
        createdAt: manager.createdAt,
      },
      generatedPassword: password ? undefined : generatedPassword,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    List managers (admin only)
// @route   GET /api/admin/managers
const getManagers = async (req, res) => {
  try {
    const managersRaw = await prisma.user.findMany({
      where: {
        OR: [
          { activeRole: "manager" },
          { role: "manager" },
          { roles: { has: "manager" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isBlocked: true,
        activeRole: true,
        roles: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const managers = managersRaw.map(withLegacyId);
    res.json({ managers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete manager (admin only)
// @route   DELETE /api/admin/managers/:id
const deleteManager = async (req, res) => {
  try {
    if (String(req.user?._id || req.user?.id) === String(req.params.id)) {
      return res
        .status(400)
        .json({ message: "Admin cannot remove own account" });
    }

    const managerRaw = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
    if (!managerRaw) return res.status(404).json({ message: "Manager not found" });
    const manager = withLegacyId(managerRaw);

    const roles = Array.isArray(manager.roles) ? manager.roles : [];
    const activeRole = manager.activeRole || manager.role;
    const isManager =
      roles.includes("manager") ||
      activeRole === "manager" ||
      manager.role === "manager";
    if (!isManager) {
      return res
        .status(400)
        .json({ message: "Target user is not a manager account" });
    }

    await deleteUserRecord(manager.id);

    res.json({ message: "Manager deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Approval audit log (admin only)
// @route   GET /api/admin/approval-logs
const getApprovalLogs = async (req, res) => {
  try {
    const { actorId, targetType, action, search, startDate, endDate, page = 1, limit = 50 } = req.query;
    const result = await listApprovalLogs({
      actorId,
      targetType,
      action,
      search,
      startDate,
      endDate,
      page,
      limit,
    });

    res.json({
      logs: result.logs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all providers (admin view)
// @route   GET /api/admin/providers
const getProviders = async (req, res) => {
  try {
    const { page = 1, limit = 20, approved, search, level, source, country, skills, joinedDate } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 20);
    const excludedUserIds = (await getExcludedModerationUserIds(req.user?._id)).map(String);
    const andConditions = [{ user: { notIn: excludedUserIds } }];
    if (approved === 'true') andConditions.push({ isApproved: true });
    if (approved === 'false') andConditions.push({ isApproved: false });
    if (search) {
      andConditions.push({ OR: [
        { skills: { has: search } },
        { city: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ] });
    }
    if (level) {
      andConditions.push({ OR: [
        { tier: { contains: level, mode: 'insensitive' } },
        { skillLevel: { contains: level, mode: 'insensitive' } },
      ] });
    }
    if (source) andConditions.push({ location: { path: ['source'], string_contains: source } });
    if (country) andConditions.push({ location: { path: ['country'], string_contains: country } });
    if (skills) andConditions.push({ skills: { has: skills } });
    if (joinedDate) {
      const startOfDay = new Date(joinedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(joinedDate);
      endOfDay.setHours(23, 59, 59, 999);
      andConditions.push({ createdAt: { gte: startOfDay, lte: endOfDay } });
    }
    const where = { AND: andConditions };
    const [records, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where,
        include: {
          userRecord: { select: {
            id: true, name: true, email: true, phone: true, approvalStatus: true,
            roleIntent: true, panelAccess: true, activePanel: true, roles: true,
            activeRole: true, isEmailVerified: true, createdAt: true,
          } },
          approvedByRecord: { select: { id: true, name: true, email: true, activeRole: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.providerProfile.count({ where }),
    ]);
    const providers = records.map(mapProviderRecord);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const statsRecords = await prisma.providerProfile.findMany({
      where: { user: { notIn: excludedUserIds } },
      select: { isApproved: true, uploadedAssets: true, createdAt: true, userRecord: { select: { approvalStatus: true } } },
    });
    const totals = { total: statsRecords.length, verified: 0, pending: 0, rejected: 0, withResume: 0, newThisWeek: 0, newLastWeek: 0 };
    for (const record of statsRecords) {
      if (record.isApproved) totals.verified += 1; else totals.pending += 1;
      if (['rejected', 'blocked'].includes(record.userRecord?.approvalStatus)) totals.rejected += 1;
      if (Array.isArray(record.uploadedAssets) && record.uploadedAssets.length) totals.withResume += 1;
      if (record.createdAt >= sevenDaysAgo) totals.newThisWeek += 1;
      else if (record.createdAt >= fourteenDaysAgo) totals.newLastWeek += 1;
    }

    res.json({
      providers,
      stats: {
        totals,
        sources: statsRecords.length ? [{ _id: 'organic', count: statsRecords.length }] : []
      },
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all recruiters (admin view)
// @route   GET /api/admin/recruiters
const getRecruiters = async (req, res) => {
  try {
    const { page = 1, limit = 20, approved, search, source, country, joinedDate } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 20);
    const excludedUserIds = (await getExcludedModerationUserIds(req.user?._id)).map(String);
    const andConditions = [{ user: { notIn: excludedUserIds } }];

    if (approved === 'true') andConditions.push({ isApproved: true });
    if (approved === 'false') andConditions.push({ isApproved: false });
    if (search) {
      andConditions.push({ OR: ['companyName', 'companyType', 'city', 'state', 'description'].map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      })) });
    }
    if (source) {
      andConditions.push({ location: { path: ['source'], string_contains: source } });
    }
    if (country) {
      andConditions.push({ OR: [
        { countryCode: { contains: country, mode: 'insensitive' } },
        { location: { path: ['country'], string_contains: country } },
      ] });
    }
    if (joinedDate) {
      const startOfDay = new Date(joinedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(joinedDate);
      endOfDay.setHours(23, 59, 59, 999);
      andConditions.push({ createdAt: { gte: startOfDay, lte: endOfDay } });
    }
    const where = { AND: andConditions };
    const userSelect = {
      id: true, name: true, email: true, phone: true, approvalStatus: true,
      roleIntent: true, panelAccess: true, activePanel: true, roles: true,
      activeRole: true, isEmailVerified: true, authProvider: true, createdAt: true,
    };
    const approvedBySelect = { id: true, name: true, email: true, activeRole: true, role: true };

    const [records, total] = await Promise.all([
      prisma.recruiterProfile.findMany({
        where,
        include: { userRecord: { select: userSelect }, approvedByRecord: { select: approvedBySelect } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.recruiterProfile.count({ where }),
    ]);
    const recruiters = records.map(({ userRecord, approvedByRecord, ...record }) => ({
      ...withLegacyId(record),
      user: withLegacyId(userRecord),
      approvedBy: withLegacyId(approvedByRecord),
    }));

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const statsRecords = await prisma.recruiterProfile.findMany({
      where: { user: { notIn: excludedUserIds } },
      select: {
        isApproved: true, createdAt: true,
        userRecord: { select: { approvalStatus: true } },
      },
    });
    const totals = { total: statsRecords.length, verified: 0, pending: 0, rejected: 0, suspended: 0, newThisWeek: 0, newLastWeek: 0 };
    const sourceCounts = new Map();
    for (const record of statsRecords) {
      if (record.isApproved) totals.verified += 1; else totals.pending += 1;
      if (record.userRecord?.approvalStatus === 'rejected') totals.rejected += 1;
      if (['blocked', 'suspended'].includes(record.userRecord?.approvalStatus)) totals.suspended += 1;
      if (record.createdAt >= sevenDaysAgo) totals.newThisWeek += 1;
      else if (record.createdAt >= fourteenDaysAgo) totals.newLastWeek += 1;
      const provider = 'organic';
      sourceCounts.set(provider, (sourceCounts.get(provider) || 0) + 1);
    }
    const sources = [...sourceCounts.entries()]
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      recruiters,
      stats: {
        totals,
        sources
      },
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    CRUD Plans
// @route   GET /api/admin/plans
const getAllPlans = async (req, res) => {
  try {
    // Seed default recruiter free plan if it doesn't exist
    const hasRecruiterFree = await findPlan({ type: 'recruiter', slug: 'free' });
    if (!hasRecruiterFree) {
      await createPlanRecord({
        name: "Free",
        slug: "free",
        type: "recruiter",
        price: 0,
        duration: 3650, // 10 years effectively
        features: ["5 Profile Unlocks", "1 Active Job Post"],
        unlockCredits: 5,
        isActive: true,
        sortOrder: 0
      });
    }

    const plans = await listPlans({}, [{ type: 'asc' }, { duration: 'asc' }, { sortOrder: 'asc' }]);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route   POST /api/admin/plans
const createPlan = async (req, res) => {
  try {
    const payload = req.body || {};
    
    // Enforce 3-plan limit per audience type (only for active non-addon plans)
    const planCount = await prisma.plan.count({
      where: { type: payload.type, isActive: true, slug: { notIn: Array.from(ADDON_SLUGS) } },
    });
    if (planCount >= 3) {
      return res.status(400).json({ message: `Maximum of 3 active plans allowed for ${payload.type}. Please edit or deactivate an existing plan instead.` });
    }

    const slug = String(payload.slug || "").toLowerCase();
    const isPaidTier = PLAN_TIERS.has(slug) || LEGACY_PAID_TIERS.has(slug);

    if (isPaidTier && Number(payload.price) <= 0) {
      return res
        .status(400)
        .json({ message: "Paid plan price must be greater than 0" });
    }

    if (slug === "free" && payload.type === "provider") {
      payload.price = 0;
      payload.jobApplyLimit = 2;
      payload.sortOrder = 0;
    }
    if (slug === "free" && payload.type === "recruiter") {
      payload.price = 0;
      payload.unlockCredits = 2;
      payload.sortOrder = 0;
    }

    // Check for duplicate plan to avoid index unique key violations
    const checkDuration = Number(payload.duration || 30);
    const existingPlan = await findPlan({
      type: payload.type,
      slug,
      duration: checkDuration,
    });
    if (existingPlan) {
      return res.status(400).json({
        message: `A plan with type '${payload.type}', slug '${slug}', and duration '${checkDuration}' already exists.`,
      });
    }

    if (PLAN_TIERS.has(slug) && Number(payload.price) > 0) {
      const family = await syncTierPlanFamily({ payload });
      return res.status(201).json({
        message: "Plan family synced from monthly price with discounts",
        plans: family,
      });
    }

    const plan = await createPlanRecord(payload);
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const syncPlanToSubscriptions = async (plans) => {
  const planArray = Array.isArray(plans) ? plans : [plans];
  if (!planArray || planArray.length === 0) return;

  for (const plan of planArray) {
    // 1. Update ProviderSubscriptions
    if (plan.type === 'provider') {
      const pSubs = (await prisma.providerSubscription.findMany({
        where: {
          planId: String(plan._id || plan.id),
          subscriptionStatus: { in: ['active', 'pending', 'paused'] },
        },
      })).map(mapProviderSubscription);

      for (const sub of pSubs) {
        sub.planSnapshot = {
          ...sub.planSnapshot,
          name: plan.name,
          slug: plan.slug,
          type: plan.type,
          priceMonthly: plan.priceMonthly || plan.price,
          description: plan.description,
          coverageType: plan.coverageType,
          maxSkills: plan.maxSkills,
          maxPincodes: plan.maxPincodes,
          maxCities: plan.maxCities,
          visibilityLevel: plan.visibilityLevel,
          features: plan.features,
          isPopular: plan.isPopular,
          priorityWeight: plan.priorityWeight,
          planBenefits: plan.planBenefits,
          planCategory: plan.planCategory,
          planType: plan.planType,
          billingCycle: plan.billingCycle,
          price: plan.price,
          discountedPrice: plan.discountedPrice,
          duration: plan.duration,
          maxJobApplications: plan.maxJobApplications,
          usageResetCycle: plan.usageResetCycle,
          isCustomisable: plan.isCustomisable,
          boostWeight: plan.boostWeight,
          supportsWhatsappAlerts: plan.supportsWhatsappAlerts,
          supportsSmsAlerts: plan.supportsSmsAlerts,
          supportsPerformanceInsights: plan.supportsPerformanceInsights,
          aiLimits: plan.aiLimits,
        };

        const effective = plan.discountedPrice > 0 ? plan.discountedPrice : plan.price;
        let taxPercent = 18;
        let taxName = 'GST';
        let base = effective;
        let discount = plan.discountedPrice > 0 ? plan.discountedPrice : 0;

        if (sub.priceSnapshot && plan.countryPricing) {
          const cp = plan.countryPricing.find(c => c.countryCode === sub.priceSnapshot.countryCode && c.isActive);
          if (cp) {
            taxPercent = cp.taxPercent || 0;
            taxName = cp.taxName || 'GST';
            base = cp.basePrice;
            discount = cp.discountedPrice || 0;
          }
        }

        const countryEffective = discount > 0 ? discount : base;
        const durMult = sub.durationMonths || 1;
        sub.subtotal = countryEffective * durMult;
        sub.gstPercent = taxPercent;
        sub.gstAmount = (sub.subtotal * taxPercent) / 100;
        sub.totalAmount = sub.subtotal + sub.gstAmount;
        sub.finalAmount = sub.totalAmount;

        if (sub.priceSnapshot) {
          sub.priceSnapshot.basePrice = base * durMult;
          sub.priceSnapshot.discountedPrice = discount * durMult;
          sub.priceSnapshot.taxPercent = taxPercent;
          sub.priceSnapshot.taxName = taxName;
          sub.priceSnapshot.taxAmount = sub.gstAmount;
          sub.priceSnapshot.finalAmount = sub.finalAmount;
        }

        await updateProviderSubscription(sub._id, sub);
      }
    }

    // 2. Update UserSubscriptions (Recruiter)
    if (plan.type === 'recruiter') {
      const uSubs = (await prisma.userSubscription.findMany({
        where: {
          planId: String(plan._id || plan.id),
          status: { in: ['active', 'pending_payment'] },
        },
      })).map(mapUserSubscription);

      for (const sub of uSubs) {
        sub.planCode = plan.code || plan.slug;
        const effective = plan.discountedPrice > 0 ? plan.discountedPrice : plan.price;
        let taxPercent = 18;
        let taxName = 'GST';
        let base = effective;
        let discount = plan.discountedPrice > 0 ? plan.discountedPrice : 0;

        if (sub.priceSnapshot && plan.countryPricing) {
          const cp = plan.countryPricing.find(c => c.countryCode === sub.priceSnapshot.countryCode && c.isActive);
          if (cp) {
            taxPercent = cp.taxPercent || 0;
            taxName = cp.taxName || 'GST';
            base = cp.basePrice;
            discount = cp.discountedPrice || 0;
          }
        }

        const countryEffective = discount > 0 ? discount : base;
        const durMult = sub.durationMonths || 1;
        sub.amount = countryEffective * durMult;
        sub.gstAmount = (sub.amount * taxPercent) / 100;
        sub.totalAmount = sub.amount + sub.gstAmount;
        sub.finalAmount = sub.totalAmount;

        if (sub.priceSnapshot) {
          sub.priceSnapshot.basePrice = base * durMult;
          sub.priceSnapshot.discountedPrice = discount * durMult;
          sub.priceSnapshot.taxPercent = taxPercent;
          sub.priceSnapshot.taxName = taxName;
          sub.priceSnapshot.taxAmount = sub.gstAmount;
          sub.priceSnapshot.finalAmount = sub.finalAmount;
        }

        await updateUserSubscription(sub._id, sub);
      }
    }
  }
};

// @route   PUT /api/admin/plans/:id
const updatePlan = async (req, res) => {
  try {
    const existing = await findPlanById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Plan not found" });

    const payload = {
      ...req.body,
      type: req.body.type || existing.type,
      slug: req.body.slug || existing.slug,
    };
    const slug = String(payload.slug || "").toLowerCase();
    const effectivePrice = Number(payload.price ?? existing.price);
    const isPaidTier = PLAN_TIERS.has(slug) || LEGACY_PAID_TIERS.has(slug);

    if (isPaidTier && effectivePrice <= 0) {
      return res
        .status(400)
        .json({ message: "Paid plan price must be greater than 0" });
    }

    if (slug === "free" && payload.type === "provider") {
      payload.price = 0;
      payload.jobApplyLimit = 2;
      payload.sortOrder = 0;
    }
    if (slug === "free" && payload.type === "recruiter") {
      payload.price = 0;
      payload.unlockCredits = 2;
      payload.sortOrder = 0;
    }

    if (PLAN_TIERS.has(slug) && Number(payload.price || existing.price) > 0) {
      const family = await syncTierPlanFamily({
        payload: { ...existing, ...payload },
        currentPlan: existing,
      });
      await syncPlanToSubscriptions(family);
      return res.json({
        message: "Plan family synced from monthly price with discounts",
        plans: family,
      });
    }

    const plan = await updatePlanRecord(req.params.id, payload);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    
    await syncPlanToSubscriptions([plan]);
    
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route   DELETE /api/admin/plans/:id
const deletePlan = async (req, res) => {
  try {
    await prisma.plan.delete({ where: { id: String(req.params.id) } });
    res.json({ message: "Plan deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const setPlanDefault = async (req, res) => {
  try {
    let plan = await findPlanById(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    if (plan.type !== 'provider') {
      return res.status(400).json({ message: "Only provider plans can be marked as provider defaults." });
    }

    if (plan.status !== 'active') {
      return res.status(400).json({ message: "Default plan must be active." });
    }

    // Unset all other defaults
    await prisma.plan.updateMany({
      where: { type: 'provider' }, data: { isProviderDefault: false, isDefaultFree: false },
    });

    plan = await updatePlanRecord(plan._id, {
      isProviderDefault: true,
      isDefaultFree: plan.price === 0 || plan.planType === 'free',
    });

    res.json({ message: "Plan marked as default successfully", plan });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const setPlanPopular = async (req, res) => {
  try {
    const { isPopular } = req.body;
    const plan = await updatePlanRecord(req.params.id, { isPopular: isPopular === true });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Plan popularity updated", plan });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updatePlanStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'archived'].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const plan = await updatePlanRecord(req.params.id, { status, isActive: status === 'active' });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Plan status updated successfully", plan });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Plan status updated successfully", plan });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Admin settings CRUD
// @route   GET /api/admin/settings
const getSettings = async (req, res) => {
  try {
    // Ensure free_cv_view_limit exists in DB
    await prisma.adminSetting.upsert({
      where: { key: 'free_cv_view_limit' },
      update: {},
      create: {
        key: 'free_cv_view_limit',
        value: 2,
        description: 'Max free CV views/downloads for recruiter',
        category: 'general',
      },
    });

    const settings = await prisma.adminSetting.findMany({ orderBy: { category: 'asc' } });
    res.json(settings.map(withLegacyId));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route   PUT /api/admin/settings
const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body; // array of { key, value, description, category }
    for (const s of (settings || [])) {
      await prisma.adminSetting.upsert({
        where: { key: s.key },
        update: { value: s.value, description: s.description || '', category: s.category || 'general' },
        create: { key: s.key, value: s.value, description: s.description || '', category: s.category || 'general' },
      });
    }
    res.json({ message: "Settings updated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get terms, privacy, or faq content
// @route   GET /api/admin/content/:type
const getContent = async (req, res) => {
  try {
    const { type } = req.params; // terms, privacy, faq
    const setting = await prisma.adminSetting.findFirst({ where: { category: type } });
    res.json(setting ? setting.value : "");
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update terms, privacy, or faq content
// @route   PUT /api/admin/content/:type
const updateContent = async (req, res) => {
  try {
    const { type } = req.params;
    const value = req.body.value !== undefined ? req.body.value : req.body;
    const existing = await prisma.adminSetting.findFirst({ where: { category: type } });
    if (existing) {
      await prisma.adminSetting.update({
        where: { id: existing.id },
        data: { value, key: `static_${type}` },
      });
    } else {
      await prisma.adminSetting.create({
        data: { category: type, key: `static_${type}`, value },
      });
    }
    res.json({ message: `${type} updated` });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Rotation pool management
// @route   GET /api/admin/rotation-pools
const getRotationPools = async (req, res) => {
  try {
    const pools = await prisma.rotationPool.findMany({ orderBy: { createdAt: 'desc' } });
    const populated = await Promise.all(pools.map(populateRotationPoolProviders));
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create new rotation pool
// @route   POST /api/admin/rotation-pools
const createRotationPool = async (req, res) => {
  try {
    const { skill, city, maxPoolSize, rotationInterval, rotationStrategy } = req.body;
    if (!skill || !city) {
      return res.status(400).json({ message: "Skill and City are required" });
    }

    const existing = await prisma.rotationPool.findUnique({
      where: { skill_city: { skill, city } },
    });
    if (existing) {
      return res.status(400).json({ message: `Rotation pool for ${skill} in ${city} already exists` });
    }

    const pool = withLegacyId(await prisma.rotationPool.create({
      data: {
        skill,
        city,
        maxPoolSize: maxPoolSize || 5,
        rotationInterval: rotationInterval || 60,
        rotationStrategy: rotationStrategy || 'round_robin',
        status: 'running',
        history: [{ action: 'CREATED', details: `Created rotation pool for ${skill} in ${city}` }],
      },
    }));

    res.status(201).json(pool);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route   PUT /api/admin/rotation-pools/:id
const updateRotationPool = async (req, res) => {
  try {
    const pool = await prisma.rotationPool.findUnique({ where: { id: String(req.params.id) } });
    if (!pool) return res.status(404).json({ message: "Rotation pool not found" });

    const updateData = {};
    if (req.body.maxPoolSize !== undefined) updateData.maxPoolSize = Number(req.body.maxPoolSize);
    if (req.body.rotationInterval !== undefined) updateData.rotationInterval = Number(req.body.rotationInterval);
    if (req.body.rotationStrategy !== undefined) updateData.rotationStrategy = req.body.rotationStrategy;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.providers !== undefined) updateData.providers = req.body.providers;
    if (req.body.currentIndex !== undefined) updateData.currentIndex = Number(req.body.currentIndex);

    const history = Array.isArray(pool.history) ? [...pool.history] : [];
    history.push({
      action: 'UPDATED',
      details: `Updated configuration (Strategy: ${updateData.rotationStrategy || pool.rotationStrategy}, Size: ${updateData.maxPoolSize || pool.maxPoolSize}, Interval: ${updateData.rotationInterval || pool.rotationInterval}s, Providers: ${(updateData.providers || pool.providers || []).length})`,
    });
    updateData.history = history;

    const updated = await prisma.rotationPool.update({
      where: { id: String(req.params.id) },
      data: updateData,
    });

    res.json(await populateRotationPoolProviders(updated));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Start rotation pool
// @route   POST /api/admin/rotation-pools/:id/start
const startRotationPool = async (req, res) => {
  try {
    const pool = await prisma.rotationPool.findUnique({ where: { id: String(req.params.id) } });
    if (!pool) return res.status(404).json({ message: "Rotation pool not found" });

    const history = Array.isArray(pool.history) ? [...pool.history] : [];
    history.push({ action: 'STARTED', details: 'Rotation pool STARTED' });

    const updated = await prisma.rotationPool.update({
      where: { id: String(req.params.id) },
      data: { status: 'running', history },
    });

    res.json({ message: "Rotation pool STARTED", pool: withLegacyId(updated) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Pause rotation pool
// @route   POST /api/admin/rotation-pools/:id/pause
const pauseRotationPool = async (req, res) => {
  try {
    const pool = await prisma.rotationPool.findUnique({ where: { id: String(req.params.id) } });
    if (!pool) return res.status(404).json({ message: "Rotation pool not found" });

    const history = Array.isArray(pool.history) ? [...pool.history] : [];
    history.push({ action: 'PAUSED', details: 'Rotation pool PAUSED' });

    const updated = await prisma.rotationPool.update({
      where: { id: String(req.params.id) },
      data: { status: 'paused', history },
    });

    res.json({ message: "Rotation pool PAUSED", pool: withLegacyId(updated) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Stop rotation pool
// @route   POST /api/admin/rotation-pools/:id/stop
const stopRotationPool = async (req, res) => {
  try {
    const pool = await prisma.rotationPool.findUnique({ where: { id: String(req.params.id) } });
    if (!pool) return res.status(404).json({ message: "Rotation pool not found" });

    const history = Array.isArray(pool.history) ? [...pool.history] : [];
    history.push({ action: 'STOPPED', details: 'Rotation pool STOPPED' });

    const updated = await prisma.rotationPool.update({
      where: { id: String(req.params.id) },
      data: { status: 'stopped', history },
    });

    res.json({ message: "Rotation pool STOPPED", pool: withLegacyId(updated) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Manually advance rotation step
// @route   POST /api/admin/rotation-pools/:id/advance
const advanceRotationPool = async (req, res) => {
  try {
    const pool = await prisma.rotationPool.findUnique({ where: { id: String(req.params.id) } });
    if (!pool) return res.status(404).json({ message: "Rotation pool not found" });

    const providers = Array.isArray(pool.providers) ? pool.providers : [];
    if (providers.length === 0) {
      return res.status(400).json({ message: "No providers in pool to rotate" });
    }

    const nextIndex = (Number(pool.currentIndex || 0) + 1) % providers.length;
    const updatedProviders = providers.map((p, idx) => {
      if (idx === nextIndex) {
        return { ...p, lastShown: new Date() };
      }
      return p;
    });

    const history = Array.isArray(pool.history) ? [...pool.history] : [];
    history.push({ action: 'MANUAL_ADVANCE', details: `Manually rotated to index #${nextIndex}` });

    const updated = await prisma.rotationPool.update({
      where: { id: String(req.params.id) },
      data: {
        currentIndex: nextIndex,
        providers: updatedProviders,
        history,
      },
    });

    res.json({ message: `Rotated to index #${nextIndex}`, pool: await populateRotationPoolProviders(updated) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete rotation pool
// @route   DELETE /api/admin/rotation-pools/:id
const deleteRotationPool = async (req, res) => {
  try {
    const pool = await prisma.rotationPool.delete({ where: { id: String(req.params.id) } }).catch(() => null);
    if (!pool) return res.status(404).json({ message: "Rotation pool not found" });
    res.json({ message: "Rotation pool deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all payments
// @route   GET /api/admin/payments
const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await listPayments({ page, limit, includeUser: true, includePlan: true });
    res.json({
      payments: result.payments,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all jobs (admin)
// @route   GET /api/admin/jobs
const getAllJobs = async (req, res) => {
  try {
    const jobs = await prisma.jobPost.findMany({
      include: { recruiterRecord: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(jobs.map((job) => {
      const mapped = withMetadataId(job);
      mapped.recruiter = withMetadataId(mapped.recruiterRecord);
      delete mapped.recruiterRecord;
      return mapped;
    }));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Upload admin profile photo (Cloudinary)
// @route   POST /api/admin/profile/photo
const uploadProfilePhoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  try {
    let url;
    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: "servicehub/admin",
        public_id: `admin_${req.user?._id || req.user?.id}_${Date.now()}`,
      });
      url = result.secure_url;
    } catch (cloudErr) {
      return res
        .status(500)
        .json({ message: "Cloudinary upload failed", error: cloudErr.message });
    }
    await prisma.user.update({
      where: { id: String(req.user?.id || req.user?._id) },
      data: {
        profilePhoto: url,
        avatar: url,
      },
    });
    res.json({ url });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getProfilePhoto = async (req, res) => {
  const admin = await prisma.user.findUnique({ where: { id: String(req.user?.id || req.user?._id) } });
  if (!admin) return res.status(404).json({ message: "Admin not found" });
  res.json({
    _id: admin.id,
    id: admin.id,
    name: admin.name,
    email: admin.email,
    profilePhoto: admin.profilePhoto || "",
  });
};

// @desc    Get payment gateway settings
// @route   GET /api/admin/payment-settings
const getPaymentSettings = async (req, res) => {
  try {
    const settings = await prisma.adminSetting.findMany({ where: { category: 'payment' } });
    const config = await getPaymentConfig();
    const rzpConfig = await getRazorpayConfig();
    const hasDbConfig = settings.some((s) => s.value && String(s.value).trim());
    const configured = Boolean(
      config.simulationMode || config.secretKey || config.publishableKey || rzpConfig.keyId || rzpConfig.keySecret
    );
    const source = hasDbConfig
      ? "database"
      : configured
        ? "env"
        : "none";

    const maskSecret = (value) =>
      value ? "********" + String(value).slice(-4) : "";

    res.json({
      stripe_publishable_key: config.publishableKey || "",
      stripe_secret_key: maskSecret(config.secretKey),
      stripe_webhook_secret: maskSecret(config.webhookSecret),
      stripe_simulation_mode: config.simulationMode || false,
      razorpay_key_id: rzpConfig.keyId || "",
      razorpay_key_secret: maskSecret(rzpConfig.keySecret),
      configured,
      source,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update payment gateway settings
// @route   PUT /api/admin/payment-settings
const updatePaymentSettings = async (req, res) => {
  try {
    const {
      stripe_publishable_key,
      stripe_secret_key,
      stripe_webhook_secret,
      stripe_simulation_mode,
      razorpay_key_id,
      razorpay_key_secret,
    } = req.body;

    const updates = [
      {
        key: "stripe_publishable_key",
        value: stripe_publishable_key,
        description: "Stripe Publishable Key",
      },
      {
        key: "stripe_simulation_mode",
        value:
          stripe_simulation_mode === true || stripe_simulation_mode === "true",
        description: "Enable payment simulation mode",
      },
      {
        key: "razorpay_key_id",
        value: razorpay_key_id,
        description: "Razorpay Key ID",
      },
    ];

    // Only update secrets if they are not masked placeholder values
    if (stripe_secret_key && !stripe_secret_key.startsWith("********") && !stripe_secret_key.startsWith("â€¢â€¢")) {
      updates.push({
        key: "stripe_secret_key",
        value: stripe_secret_key,
        description: "Stripe Secret Key",
      });
    }
    if (stripe_webhook_secret && !stripe_webhook_secret.startsWith("********") && !stripe_webhook_secret.startsWith("â€¢â€¢")) {
      updates.push({
        key: "stripe_webhook_secret",
        value: stripe_webhook_secret,
        description: "Stripe Webhook Secret",
      });
    }
    if (razorpay_key_secret && !razorpay_key_secret.startsWith("********") && !razorpay_key_secret.startsWith("••••") && !razorpay_key_secret.startsWith("â€¢â€¢")) {
      updates.push({
        key: "razorpay_key_secret",
        value: razorpay_key_secret,
        description: "Razorpay Key Secret",
      });
    }

    for (const item of updates) {
      await prisma.adminSetting.upsert({
        where: { key: item.key },
        create: { key: item.key, value: item.value, description: item.description, category: 'payment' },
        update: { value: item.value, description: item.description, category: 'payment' },
      });
    }

    res.json({ message: "Payment settings updated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete user (permanent deletion)
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const actorId = req.user?._id || req.user?.id;
    if (
      actorId &&
      String(actorId) === String(req.params.id)
    ) {
      return res
        .status(400)
        .json({ message: "Admin cannot remove own account" });
    }

    const userRaw = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
    if (!userRaw) return res.status(404).json({ message: "User not found" });
    const user = withLegacyId(userRaw);

    const userRoles = Array.isArray(user.roles) ? user.roles : [];
    const effectiveRole = user.activeRole || user.role || userRoles[0];

    // Delete associated profiles
    if (effectiveRole === "provider") {
      await prisma.providerProfile.deleteMany({ where: { user: String(user.id) } });
      await deleteApplicationDataForUser(user.id);
      await prisma.review.deleteMany({
        where: {
          OR: [
            { provider: String(user.id) },
            { revieweeId: String(user.id) },
            { reviewerId: String(user.id) },
          ],
        },
      });
    } else if (effectiveRole === "recruiter") {
      await prisma.recruiterProfile.deleteMany({ where: { user: String(user.id) } });
      await deleteApplicationDataForUser(user.id);
      await prisma.jobPost.deleteMany({ where: { recruiter: String(user.id) } });
      await prisma.review.deleteMany({
        where: {
          OR: [
            { recruiter: String(user.id) },
            { revieweeId: String(user.id) },
            { reviewerId: String(user.id) },
          ],
        },
      });
    }

    // Delete user
    await deleteUserRecord(user.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete provider profile
// @route   DELETE /api/admin/providers/:id
const deleteProvider = async (req, res) => {
  try {
    const profile = withLegacyId(await prisma.providerProfile.findUnique({ where: { id: String(req.params.id) } }));
    if (!profile)
      return res.status(404).json({ message: "Provider not found" });

    // Delete associated data
    await prisma.lead.deleteMany({ where: { provider: String(profile.user) } });
    await prisma.review.deleteMany({
      where: {
        OR: [
          { provider: String(profile.user) },
          { revieweeId: String(profile.user) },
          { reviewerId: String(profile.user) },
        ],
      },
    });

    // Remove from rotation pools
    const allPools = await prisma.rotationPool.findMany();
    for (const p of allPools) {
      if (Array.isArray(p.providers)) {
        const filtered = p.providers.filter(item => {
          const pid = typeof item === 'string' ? item : item?.provider?.id || item?.provider?._id || item?.provider;
          return pid !== profile._id && pid !== profile.id;
        });
        if (filtered.length !== p.providers.length) {
          await prisma.rotationPool.update({
            where: { id: p.id },
            data: { providers: filtered },
          });
        }
      }
    }

    // Delete provider profile
    await prisma.providerProfile.delete({ where: { id: String(req.params.id) } });

    // Delete user account
    await deleteUserRecord(profile.user);

    res.json({ message: "Provider deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete recruiter profile
// @route   DELETE /api/admin/recruiters/:id
const deleteRecruiter = async (req, res) => {
  try {
    const profile = withLegacyId(await prisma.recruiterProfile.findUnique({
      where: { id: String(req.params.id) },
    }));
    if (!profile)
      return res.status(404).json({ message: "Recruiter not found" });

    await deleteApplicationDataForUser(profile.user);
    await prisma.jobPost.deleteMany({ where: { recruiter: String(profile.user) } });
    await prisma.review.deleteMany({
      where: {
        OR: [
          { recruiter: String(profile.user) },
          { revieweeId: String(profile.user) },
          { reviewerId: String(profile.user) },
        ],
      },
    });

    await prisma.recruiterProfile.delete({ where: { id: String(req.params.id) } });

    // Delete user account
    await deleteUserRecord(profile.user);

    res.json({ message: "Recruiter deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc  GET all skill categories (public)
// @route GET /api/admin/skills  (admin)  |  GET /api/skills (public route added in server.js)
const getSkillCategories = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) {
      filter.isActive =
        req.query.isActive === "true" || req.query.isActive === true;
    }
    const cats = await prisma.skillCategory.findMany({
      where: filter,
      orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json(withMetadataIds(cats));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  CREATE a new skill category
// @route POST /api/admin/skills
const createSkillCategory = async (req, res) => {
  try {
    const cat = await prisma.skillCategory.create({ data: prepareSkillCategoryData(req.body) });
    res.status(201).json(withMetadataId(cat));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc  UPDATE a skill category (name, icon, skills, sortOrder, isActive)
// @route PUT /api/admin/skills/:id
const updateSkillCategory = async (req, res) => {
  try {
    const exists = await prisma.skillCategory.findUnique({ where: { id: String(req.params.id) } });
    const cat = exists ? await prisma.skillCategory.update({
      where: { id: String(req.params.id) },
      data: prepareSkillCategoryData(req.body),
    }) : null;
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(withMetadataId(cat));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc  ADD a skill to a category
// @route POST /api/admin/skills/:id/skills
const addSkillToCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "name required" });
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const current = await prisma.skillCategory.findUnique({ where: { id: String(req.params.id) } });
    const skills = Array.isArray(current?.skills) ? current.skills : [];
    const cat = current ? await prisma.skillCategory.update({
      where: { id: String(req.params.id) },
      data: { skills: [...skills, { _id: crypto.randomUUID(), name, slug, isActive: true }] },
    }) : null;
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(withMetadataId(cat));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc  REMOVE a skill from a category
// @route DELETE /api/admin/skills/:id/skills/:skillId
const removeSkillFromCategory = async (req, res) => {
  try {
    const current = await prisma.skillCategory.findUnique({ where: { id: String(req.params.id) } });
    const skills = Array.isArray(current?.skills) ? current.skills : [];
    const cat = current ? await prisma.skillCategory.update({
      where: { id: String(req.params.id) },
      data: { skills: skills.filter((skill) => String(skill?._id || skill?.id) !== String(req.params.skillId)) },
    }) : null;
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(withMetadataId(cat));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc  DELETE a skill category
// @route DELETE /api/admin/skills/:id
const deleteSkillCategory = async (req, res) => {
  try {
    await prisma.skillCategory.delete({ where: { id: String(req.params.id) } });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── User Detail View (admin sees everything) ──────────────────────────────────

// @desc    Get detailed user profile (admin can see any user)
// @route   GET /api/admin/users/:id
const getUserDetail = async (req, res) => {
  try {
    const targetId = req.params.id || req.params.userId;
    const userRaw = await prisma.user.findUnique({ where: { id: String(targetId) } });
    if (!userRaw) return res.status(404).json({ message: "User not found" });
    const user = withLegacyId(userRaw);
    delete user.password;

    let providerProfile = null;
    let recruiterProfile = null;
    let providerLeads = [];
    let recruiterLeads = [];
    let history = [];
    let payments = [];

    const isProvider = user.role === "provider" || (user.roles && user.roles.includes("provider")) || user.activeRole === "provider";
    const isRecruiter = user.role === "recruiter" || (user.roles && user.roles.includes("recruiter")) || user.activeRole === "recruiter";

    if (isProvider) {
      providerProfile = await findProviderProfileByUserId(user._id);
      const rawPLeads = await prisma.lead.findMany({
        where: { provider: String(user.id) },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          recruiterRecord: { select: { id: true, name: true, email: true } },
        },
      });
      providerLeads = rawPLeads.map((item) => {
        const mapped = withLegacyId(item);
        mapped.recruiter = withLegacyId(item.recruiterRecord) || null;
        delete mapped.recruiterRecord;
        return mapped;
      });
    }
    if (isRecruiter) {
      recruiterProfile = await findRecruiterProfileByUserId(user._id);
      const rawRLeads = await prisma.lead.findMany({
        where: { recruiter: String(user.id) },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          providerRecord: { select: { id: true, name: true, email: true } },
        },
      });
      recruiterLeads = rawRLeads.map((item) => {
        const mapped = withLegacyId(item);
        mapped.provider = withLegacyId(item.providerRecord) || null;
        delete mapped.providerRecord;
        return mapped;
      });
    }

    const profile = providerProfile || recruiterProfile;
    const leads = [...providerLeads, ...recruiterLeads]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    history = await listVisitHistory({ user: user._id }, 30);
    payments = (await listPayments({
      where: { user: String(user._id) },
      page: 1,
      limit: 20,
      includePlan: true,
    })).payments;

    res.json({
      user,
      profile,
      providerProfile,
      recruiterProfile,
      leads,
      history,
      payments
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Currency Settings ─────────────────────────────────────────────────────────────

// @desc    Get currency configuration
// @route   GET /api/admin/currency-settings
const getCurrencySettings = async (req, res) => {
  try {
    const settings = await prisma.adminSetting.findMany({ where: { category: "currency" } });
    const config = {};
    settings.forEach((s) => {
      config[s.key] = s.value;
    });
    res.json({
      default_currency_IN: config.default_currency_IN || "INR",
      default_currency_AE: config.default_currency_AE || "AED",
      exchange_rate_INR_AED: config.exchange_rate_INR_AED || 0.044,
      exchange_rate_INR_USD: config.exchange_rate_INR_USD || 0.012,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update currency configuration
// @route   PUT /api/admin/currency-settings
const updateCurrencySettings = async (req, res) => {
  try {
    const {
      default_currency_IN,
      default_currency_AE,
      exchange_rate_INR_AED,
      exchange_rate_INR_USD,
    } = req.body;
    const updates = [
      {
        key: "default_currency_IN",
        value: default_currency_IN || "INR",
        description: "Default currency for India",
      },
      {
        key: "default_currency_AE",
        value: default_currency_AE || "AED",
        description: "Default currency for UAE",
      },
      {
        key: "exchange_rate_INR_AED",
        value: parseFloat(exchange_rate_INR_AED) || 0.044,
        description: "INR to AED exchange rate",
      },
      {
        key: "exchange_rate_INR_USD",
        value: parseFloat(exchange_rate_INR_USD) || 0.012,
        description: "INR to USD exchange rate",
      },
    ];
    for (const item of updates) {
      await prisma.adminSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          value: item.value,
          description: item.description,
          category: "currency",
        },
        update: {
          value: item.value,
          description: item.description,
          category: "currency",
        },
      });
    }
    res.json({ message: "Currency settings updated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ————————————————————————————————————————————————————————————————

// @desc    Get Cloudinary configuration
// @route   GET /api/admin/cloudinary-settings
const getCloudinarySettings = async (req, res) => {
  try {
    const settings = await prisma.adminSetting.findMany({ where: { category: "cloudinary" } });
    const config = {};
    settings.forEach((s) => {
      if (s.key === "cloudinary_api_secret") {
        config[s.key] = s.value ? "••••••••" + String(s.value).slice(-4) : "";
      } else {
        config[s.key] = s.value;
      }
    });
    res.json({
      cloudinary_cloud_name: config.cloudinary_cloud_name || "",
      cloudinary_api_key: config.cloudinary_api_key || "",
      cloudinary_api_secret: config.cloudinary_api_secret || "",
      cloudinary_account_name: config.cloudinary_account_name || "LucoHire Media Cloud",
      cloudinary_folder_prefix: config.cloudinary_folder_prefix || "lucohire_media",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update Cloudinary configuration
// @route   PUT /api/admin/cloudinary-settings
const updateCloudinarySettings = async (req, res) => {
  try {
    const { cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret } =
      req.body;
    const updates = [
      {
        key: "cloudinary_cloud_name",
        value: cloudinary_cloud_name,
        description: "Cloudinary Cloud Name",
      },
      {
        key: "cloudinary_api_key",
        value: cloudinary_api_key,
        description: "Cloudinary API Key",
      },
    ];
    if (cloudinary_api_secret && !cloudinary_api_secret.startsWith("••••")) {
      updates.push({
        key: "cloudinary_api_secret",
        value: cloudinary_api_secret,
        description: "Cloudinary API Secret",
      });
    }
    for (const item of updates) {
      await prisma.adminSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          value: item.value,
          description: item.description,
          category: "cloudinary",
        },
        update: {
          value: item.value,
          description: item.description,
          category: "cloudinary",
        },
      });
    }
    res.json({ message: "Cloudinary settings updated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get WhatsApp logs
// @route   GET /api/admin/whatsapp-logs
const getWhatsappLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const result = await listWhatsappLogs({ page, limit });
    res.json({
      logs: result.logs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// â”€â”€â”€ WhatsApp Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// @desc    Get WhatsApp configuration
// @route   GET /api/admin/whatsapp-settings
const getWhatsappSettings = async (req, res) => {
  try {
    const settings = await prisma.adminSetting.findMany({ where: { category: 'whatsapp' } });
    const config = {};
    settings.forEach((s) => {
      if (s.key === "whatsapp_access_token") {
        config[s.key] = s.value ? "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" + String(s.value).slice(-4) : "";
      } else {
        config[s.key] = s.value;
      }
    });
    res.json({
      whatsapp_phone_number_id: config.whatsapp_phone_number_id || "",
      whatsapp_access_token: config.whatsapp_access_token || "",
      whatsapp_dev_mode: config.whatsapp_dev_mode || false,
      whatsapp_otp_template: config.whatsapp_otp_template || "",
      whatsapp_welcome_template: config.whatsapp_welcome_template || "",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update WhatsApp configuration
// @route   PUT /api/admin/whatsapp-settings
const updateWhatsappSettings = async (req, res) => {
  try {
    const {
      whatsapp_phone_number_id,
      whatsapp_access_token,
      whatsapp_dev_mode,
      whatsapp_otp_template,
      whatsapp_welcome_template,
    } = req.body;
    const updates = [
      {
        key: "whatsapp_phone_number_id",
        value: whatsapp_phone_number_id || "",
        description: "WhatsApp Phone Number ID",
      },
      {
        key: "whatsapp_dev_mode",
        value: whatsapp_dev_mode === true || whatsapp_dev_mode === "true",
        description: "WhatsApp dev mode",
      },
      {
        key: "whatsapp_otp_template",
        value: whatsapp_otp_template || "",
        description: "WhatsApp OTP template name",
      },
      {
        description: "WhatsApp Phone Number ID",
      },
      {
        key: "whatsapp_dev_mode",
        value: whatsapp_dev_mode === true || whatsapp_dev_mode === "true",
        description: "WhatsApp dev mode",
      },
      {
        key: "whatsapp_otp_template",
        value: whatsapp_otp_template || "",
        description: "WhatsApp OTP template name",
      },
      {
        key: "whatsapp_welcome_template",
        value: whatsapp_welcome_template || "",
        description: "WhatsApp welcome template",
      },
    ];
    if (whatsapp_access_token && !whatsapp_access_token.startsWith("â€¢â€¢")) {
      updates.push({
        key: "whatsapp_access_token",
        value: whatsapp_access_token,
        description: "WhatsApp Access Token",
      });
    }
    for (const item of updates) {
      await prisma.adminSetting.upsert({
        where: { key: item.key },
        create: { key: item.key, value: item.value, description: item.description, category: 'whatsapp' },
        update: { value: item.value, description: item.description, category: 'whatsapp' },
      });
    }
    res.json({ message: "WhatsApp settings updated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get feature flags
// @route   GET /api/admin/feature-flags
const getFeatureFlags = async (req, res) => {
  try {
    const rawFlags = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });
    const flags = rawFlags.map((f) => withLegacyId(f));
    res.json({ flags });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update feature flag
// @route   PUT /api/admin/feature-flags/:key
const updateFeatureFlag = async (req, res) => {
  try {
    const key = String(req.params.key || "").trim();
    if (!key) return res.status(400).json({ message: "Flag key is required" });

    const enabled = req.body.enabled === true || req.body.enabled === "true";
    const scope = req.body.scope || "global";
    const config =
      req.body.config && typeof req.body.config === "object"
        ? req.body.config
        : {};

    const rawFlag = await prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, scope, config },
      update: { enabled, scope, config },
    });
    const flag = withLegacyId(rawFlag);

    clearFeatureFlagCache(key);

    res.json({ message: "Feature flag updated", flag });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const findUserFromUserOrProfileId = async (id) => {
  if (!id) return null;

  let userRaw = await prisma.user.findUnique({ where: { id: String(id) } });
  if (userRaw) return withLegacyId(userRaw);

  const providerProfile = await prisma.providerProfile.findUnique({ where: { id: String(id) } });
  if (providerProfile?.user) {
    const raw = await prisma.user.findUnique({ where: { id: String(providerProfile.user) } });
    if (raw) return withLegacyId(raw);
  }

  const recruiterProfile = await prisma.recruiterProfile.findUnique({ where: { id: String(id) } });
  if (recruiterProfile?.user) {
    const raw = await prisma.user.findUnique({ where: { id: String(recruiterProfile.user) } });
    if (raw) return withLegacyId(raw);
  }

  return null;
};

const ensureRoleProfileExists = async (userId, role) => {
  if (role === "provider") {
    await ensureProviderProfile(userId);
  }

  if (role === "recruiter") {
    await ensureRecruiterProfile(userId, {
      unlocksRemaining: 2,
      unlockPackSize: 2,
      freeViewResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      freeUnlockResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }
};

const approveUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.params.id;
    const user = await findUserFromUserOrProfileId(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        receivedId: userId,
      });
    }

    if (hasPrivilegedRole(user)) {
      return res.status(400).json({
        message: "Admin/manager accounts cannot be approved from this flow.",
      });
    }

    user.approvalStatus = "approved";
    user.approvedAt = new Date();
    user.approvedBy = req.user?._id || null;
    user.rejectionReason = "";

    user.roles = Array.isArray(user.roles) ? user.roles : [];

    if (!user.roles.includes("provider")) user.roles.push("provider");
    if (!user.roles.includes("recruiter")) user.roles.push("recruiter");

    user.roleIntent = "both";

    await ensureRoleProfileExists(user._id, "provider");
    await ensureRoleProfileExists(user._id, "recruiter");

    await ensurePanelAccessWithFreePlan(user, "provider");
    await ensurePanelAccessWithFreePlan(user, "recruiter");

    user.activePanel = user.activePanel || "provider";
    user.activeRole = user.activeRole || "provider";

    await saveUser(user);

     const providerProfile = await findProviderProfileByUserId(user._id);
    const recruiterProfile = await findRecruiterProfileByUserId(user._id);

    if (providerProfile) {
      await createApprovalLog({
        targetType: "provider",
        targetProfileId: providerProfile._id,
        targetUserId: user._id,
        targetName: user.name || "",
        action: "approved",
        note: "Single user-level approval enabled provider access",
        actorId: req.user?._id,
        actorName: req.user?.name || "",
        actorRole: req.user?.activeRole || req.user?.role || "admin",
      });
    }

    if (recruiterProfile) {
      await createApprovalLog({
        targetType: "recruiter",
        targetProfileId: recruiterProfile._id,
        targetUserId: user._id,
        targetName: user.name || "",
        action: "approved",
        note: "Single user-level approval enabled recruiter access",
        actorId: req.user?._id,
        actorName: req.user?.name || "",
        actorRole: req.user?.activeRole || req.user?.role || "admin",
      });
    }

    const providerPlanSummary = await buildPlanSummary(user._id, "provider");
    const recruiterPlanSummary = await buildPlanSummary(user._id, "recruiter");

    res.json({
      message: "User approved successfully for provider and recruiter panels",
      user,
      providerPlanSummary,
      recruiterPlanSummary,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const rejectUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.params.id;
    const { reason } = req.body || {};

    const user = await findUserFromUserOrProfileId(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        receivedId: userId,
      });
    }

    user.approvalStatus = "rejected";
    user.rejectionReason =
      typeof reason === "string" && reason.trim()
        ? reason.trim()
        : "Rejected by admin";
    user.approvedAt = null;
    user.approvedBy = null;

    user.panelAccess = {
      provider: { enabled: false, source: "none" },
      recruiter: { enabled: false, source: "none" },
    };
    await saveUser(user);

    const rejectMeta = {
      isApproved: false,
      isVerified: false,
      approvalAction: "rejected",
      approvalNote: user.rejectionReason,
      approvedBy: req.user?._id || null,
      approvedByRole: req.user?.activeRole || req.user?.role || "admin",
      approvedAt: new Date(),
    };

    await prisma.providerProfile.updateMany({
      where: { user: String(user._id) },
      data: { ...rejectMeta, approvedBy: rejectMeta.approvedBy ? String(rejectMeta.approvedBy) : null },
    });

    await prisma.recruiterProfile.updateMany({
      where: { user: String(user._id) },
      data: { ...rejectMeta, approvedBy: rejectMeta.approvedBy ? String(rejectMeta.approvedBy) : null },
    });

    const providerProfile = await findProviderProfileByUserId(user._id);
    const recruiterProfile = await findRecruiterProfileByUserId(user._id);

    if (providerProfile) {
      await createApprovalLog({
        targetType: "provider",
        targetProfileId: providerProfile._id,
        targetUserId: user._id,
        targetName: user.name || "",
        action: "rejected",
        note: user.rejectionReason,
        actorId: req.user?._id,
        actorName: req.user?.name || "",
        actorRole: req.user?.activeRole || req.user?.role || "admin",
      });
    }

    if (recruiterProfile) {
      await createApprovalLog({
        targetType: "recruiter",
        targetProfileId: recruiterProfile._id,
        targetUserId: user._id,
        targetName: user.name || "",
        action: "rejected",
        note: user.rejectionReason,
        actorId: req.user?._id,
        actorName: req.user?.name || "",
        actorRole: req.user?.activeRole || req.user?.role || "admin",
      });
    }

    res.json({
      message: "User rejected successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
// ==================================
// ===========================================

// @desc    Update Skill Category Status
// @route   PATCH /api/admin/skills/:id/status
const updateSkillCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    const category = await prisma.skillCategory.findUnique({ where: { id: String(id) } });
    if (!category)
      return res.status(404).json({ message: "Skill Category not found" });

    const update = { isActive: Boolean(isActive) };
    if (!isActive) {
      update.deactivatedAt = new Date();
      update.deactivatedBy = String(req.user._id);
      update.deactivationReason = reason || "Temporarily disabled";
    } else {
      update.reactivatedAt = new Date();
      update.reactivatedBy = String(req.user._id);
    }

    const updatedCategory = withMetadataId(await prisma.skillCategory.update({
      where: { id: String(id) },
      data: update,
    }));

    res.json({ message: "Skill Category status updated", category: updatedCategory });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get profile photo approval stats
// @route   GET /api/admin/profile-approvals/stats
const getProfileApprovalStats = async (req, res) => {
  try {
    const baseFilter = {
      NOT: [
        { role: 'admin' },
        { roles: { has: 'admin' } },
      ],
    };

    const [pendingReview, approved, rejected, totalProfiles] = await Promise.all([
      prisma.user.count({
        where: {
          ...baseFilter,
          profilePhotoApproval: {
            path: ['status'],
            equals: 'pending',
          },
        },
      }),
      prisma.user.count({
        where: {
          ...baseFilter,
          profilePhotoApproval: {
            path: ['status'],
            equals: 'approved',
          },
        },
      }),
      prisma.user.count({
        where: {
          ...baseFilter,
          profilePhotoApproval: {
            path: ['status'],
            equals: 'rejected',
          },
        },
      }),
      prisma.user.count({ where: baseFilter }),
    ]);

    res.json({ pendingReview, approved, rejected, totalProfiles });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get profile photo approvals with filters
// @route   GET /api/admin/profile-approvals

const getProfilePhotoApprovals = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get pending requests from ProviderProfile
    const providerRequests = (await prisma.providerProfile.findMany({
      where: { profilePhotoApproval: { path: ['status'], equals: 'pending' } },
      include: { userRecord: { select: { id: true, name: true, email: true, phone: true } } },
    })).map(mapProviderRecord);

    // Get pending requests from RecruiterProfile through Prisma.
    const recruiterRecords = await prisma.recruiterProfile.findMany({
      where: { profilePhotoApproval: { path: ['status'], equals: 'pending' } },
      include: { userRecord: { select: { id: true, name: true, email: true, phone: true } } },
    });
    const recruiterRequests = recruiterRecords.map(({ userRecord, ...profile }) => ({
      ...withLegacyId(profile),
      user: withLegacyId(userRecord),
    }));

    // Combine and format
    const allRequests = [
      ...providerRequests.map((r) => ({
        ...r,
        role: "provider",
        displayName: r.profileName || r.user?.name || "Provider",
      })),
      ...recruiterRequests.map((r) => ({
        ...r,
        role: "recruiter",
        displayName: r.profileName || r.user?.name || "Recruiter",
      })),
    ].sort((a, b) => b.updatedAt - a.updatedAt);

    const paginated = allRequests.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      users: paginated,
      pagination: {
        total: allRequests.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(allRequests.length / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const approveProfilePhoto = async (req, res) => {
  try {
    const { userId, role } = req.params;
    let profile;
    if (role === "provider") {
      profile = await findProviderProfileByUserId(userId);
    } else if (role === "recruiter") {
      profile = await findRecruiterProfileByUserId(userId);
    } else {
      return res.status(400).json({ message: "Invalid role specified" });
    }
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const pendingUrl = profile.profilePhotoApproval?.pendingUrl;
    if (!pendingUrl) {
      return res
        .status(400)
        .json({ message: "No pending profile photo found" });
    }

    // Update Profile
    profile.profilePhoto = pendingUrl;
    if (role === "provider") profile.photo = pendingUrl; // Legacy field
    profile.profilePhotoApproval = {
      ...(profile.profilePhotoApproval || {}),
      status: "approved",
      approvedUrl: pendingUrl,
      pendingUrl: "",
      rejectionReason: "",
      reviewedBy: req.admin?._id || req.user?._id ? String(req.admin?._id || req.user?._id) : null,
      reviewedAt: new Date(),
    };

    if (role === 'recruiter') profile = await saveRecruiterProfile(profile);
    else profile = await saveProviderProfile(profile);

    // Sync to User model (for navbar etc.)
    const userRaw = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (userRaw) {
      const user = withLegacyId(userRaw);
      user.profilePhoto = pendingUrl;
      user.avatar = pendingUrl;
      user.profilePhotoApproval = {
        status: "approved",
        approvedUrl: pendingUrl,
        pendingUrl: "",
        rejectionReason: "",
        reviewedBy: req.admin?._id || req.user?._id ? String(req.admin?._id || req.user?._id) : null,
        reviewedAt: new Date(),
      };
      await saveUser(user);
    }

    res.json({
      success: true,
      message: `${role} profile photo approved`,
      data: {
        profilePhoto: profile.profilePhoto,
        status: profile.profilePhotoApproval.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const rejectProfilePhoto = async (req, res) => {
  try {
    const { userId, role } = req.params;
    const { reason } = req.body || {};
    if (!reason || !reason.trim()) {
      return res
        .status(400)
        .json({ message: "Rejection reason is required" });
    }

    let profile;
    if (role === "provider") {
      profile = await findProviderProfileByUserId(userId);
    } else if (role === "recruiter") {
      profile = await findRecruiterProfileByUserId(userId);
    } else {
      return res.status(400).json({ message: "Invalid role specified" });
    }
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    if (
      profile.profilePhotoApproval?.status !== "pending" ||
      !profile.profilePhotoApproval?.pendingUrl
    ) {
      return res.status(400).json({ message: "No pending photo to reject" });
    }

    profile.profilePhotoApproval = {
      ...(profile.profilePhotoApproval || {}),
      status: "rejected",
      pendingUrl: "",
      rejectionReason: reason.trim(),
      reviewedBy: req.admin?._id || req.user?._id ? String(req.admin?._id || req.user?._id) : null,
      reviewedAt: new Date(),
    };

    if (role === 'recruiter') profile = await saveRecruiterProfile(profile);
    else profile = await saveProviderProfile(profile);

    // Sync to User model (for navbar etc.)
    const userRaw = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (userRaw) {
      const user = withLegacyId(userRaw);
      user.profilePhotoApproval = {
        status: "rejected",
        approvedUrl: user.profilePhotoApproval?.approvedUrl || "",
        pendingUrl: "",
        rejectionReason: reason.trim(),
        reviewedBy: req.admin?._id || req.user?._id ? String(req.admin?._id || req.user?._id) : null,
        reviewedAt: new Date(),
      };
      await saveUser(user);
    }

    res.json({
      success: true,
      message: `${role} profile photo rejected`,
      data: {
        status: profile.profilePhotoApproval.status,
        reason: profile.profilePhotoApproval.rejectionReason,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// @desc    Get all referrals (admin only)
// @route   GET /api/v1/admin/referrals
const getAllReferrals = async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const [rows, total] = await Promise.all([
      prisma.referral.findMany({
        where: filter,
        include: {
          referredUserIdRecord: { select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true } },
          referrerIdRecord: { select: { id: true, name: true, email: true, role: true, phone: true } },
          partnerProfileIdRecord: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.referral.count({ where: filter }),
    ]);

    const referrals = rows.map((row) => {
      const ref = withLegacyId(row);
      ref.referredUserId = withLegacyId(row.referredUserIdRecord);
      ref.referrerId = withLegacyId(row.referrerIdRecord);
      ref.partnerProfileId = withLegacyId(row.partnerProfileIdRecord);
      delete ref.referredUserIdRecord;
      delete ref.referrerIdRecord;
      delete ref.partnerProfileIdRecord;
      return ref;
    });

    // Map fields for frontend consistency
    const formattedReferrals = referrals.map(ref => {
      const partner = ref.referrerId ? { ...ref.referrerId } : null;
      if (partner && (!partner.name || partner.name.trim() === '')) {
        const role = partner.role || (Array.isArray(partner.roles) ? partner.roles[0] : '') || 'user';
        partner.name = role.charAt(0).toUpperCase() + role.slice(1);
      }
      return {
        ...ref,
        referredUser: ref.referredUserId,
        partner: partner,
        userReferrer: ref.referrerType === 'user' ? ref.referrerId : null,
        rewardEligible: ref.commissionStatus === 'paid' || ref.status === 'subscribed'
      };
    });

    res.json({
      referrals: formattedReferrals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getImportBatches = async (req, res) => {
  try {
    const rawBatches = await prisma.importBatch.findMany({
      select: {
        id: true,
        fileName: true,
        originalSize: true,
        status: true,
        totalRows: true,
        processedRows: true,
        successCount: true,
        failedCount: true,
        errors: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(rawBatches.map(b => withLegacyId(b)));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching batches', error: error.message });
  }
};

const getImportBatchStatus = async (req, res) => {
  try {
    const batch = await prisma.importBatch.findUnique({
      where: { id: String(req.params.id) },
      select: {
        id: true,
        fileName: true,
        originalSize: true,
        status: true,
        totalRows: true,
        processedRows: true,
        successCount: true,
        failedCount: true,
        errors: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json(withLegacyId(batch));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching batch status', error: error.message });
  }
};

const updateImportBatchAction = async (req, res) => {
  try {
    const { action } = req.body; // 'pause', 'resume', 'stop'
    const { processProviderBatch } = require('../services/pipeline/batchImportService');
    
    const batchRaw = await prisma.importBatch.findUnique({ where: { id: String(req.params.id) } });
    if (!batchRaw) return res.status(404).json({ message: 'Batch not found' });

    let newStatus = null;
    if (action === 'pause') {
      if (batchRaw.status === 'processing' || batchRaw.status === 'pending') {
        newStatus = 'paused';
      }
    } else if (action === 'stop') {
      if (['processing', 'pending', 'paused'].includes(batchRaw.status)) {
        newStatus = 'stopped';
      }
    } else if (action === 'resume') {
      if (batchRaw.status === 'paused') {
        newStatus = 'processing';
      }
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    let batch = withLegacyId(batchRaw);
    if (newStatus) {
      const updated = await prisma.importBatch.update({
        where: { id: batchRaw.id },
        data: { status: newStatus },
      });
      batch = withLegacyId(updated);
      if (action === 'resume') {
        processProviderBatch(batch._id || batch.id).catch(err => {
          console.error(`Failed to resume batch ${batch._id || batch.id}:`, err);
        });
      }
    }

    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: 'Error updating batch action', error: error.message });
  }
};

const uploadProvidersCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No CSV file uploaded" });
    
    let csvData = req.file.buffer.toString('utf8');
    if (csvData.startsWith('\ufeff')) {
      csvData = csvData.slice(1);
    }

    const lines = csvData.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return res.status(400).json({ message: "CSV is empty or missing headers" });

    const { processProviderBatch } = require('../services/pipeline/batchImportService');

    const created = await prisma.importBatch.create({
      data: {
        fileName: req.file.originalname || 'upload.csv',
        originalSize: Number(req.file.size) || 0,
        status: 'pending',
        totalRows: lines.length - 1,
        csvData: csvData,
        startedAt: new Date(),
        createdBy: req.user?._id ? String(req.user._id) : (req.user?.id ? String(req.user.id) : null),
      },
    });
    const batch = withLegacyId(created);

    processProviderBatch(batch._id || batch.id).catch(err => {
      console.error(`Failed to start batch ${batch._id || batch.id}:`, err);
    });

    res.status(202).json({ 
      message: 'Batch import started successfully', 
      batchId: batch._id || batch.id,
      totalRows: batch.totalRows
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const uploadRecruitersCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No CSV file uploaded" });
    
    let csvData = req.file.buffer.toString('utf8');
    if (csvData.startsWith('\ufeff')) {
      csvData = csvData.slice(1);
    }

    const lines = csvData.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return res.status(400).json({ message: "CSV is empty or missing headers" });

    const { processRecruiterBatch } = require('../services/pipeline/batchImportService');

    const created = await prisma.importBatch.create({
      data: {
        fileName: req.file.originalname || 'upload.csv',
        originalSize: Number(req.file.size) || 0,
        status: 'pending',
        totalRows: lines.length - 1,
        csvData: csvData,
        startedAt: new Date(),
        createdBy: req.user?._id ? String(req.user._id) : (req.user?.id ? String(req.user.id) : null),
      },
    });
    const batch = withLegacyId(created);

    processRecruiterBatch(batch._id || batch.id).catch(err => {
      console.error(`Failed to start recruiter batch ${batch._id || batch.id}:`, err);
    });

    res.status(202).json({ 
      message: 'Batch import started successfully', 
      batchId: batch._id || batch.id,
      totalRows: batch.totalRows
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getPortfolioApprovals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const allProfiles = (await prisma.providerProfile.findMany({
      include: { userRecord: { select: { id: true, name: true, email: true, phone: true, role: true, avatar: true } } },
      orderBy: { updatedAt: 'desc' },
    })).map(mapProviderRecord).filter((profile) =>
      Array.isArray(profile.portfolioLinks)
      && profile.portfolioLinks.some((link) => link?.status === 'pending'));
    const total = allProfiles.length;
    const profiles = allProfiles.slice(skip, skip + limit);

    // Group all pending links under their user
    const users = profiles.map((profile) => {
      const pendingLinks = profile.portfolioLinks
        .filter((l) => l.status === "pending")
        .map((link) => {
          const currentApproved = profile.portfolioLinks.find(
            (l) => l.platform === link.platform && l.status === "approved"
          );
          return {
            linkId: link._id,
            platform: link.platform,
            url: link.url,
            currentApprovedUrl: currentApproved ? currentApproved.url : null,
            submittedAt: link.submittedAt,
          };
        });

      return {
        profileId: profile._id,
        userId: profile.user?._id,
        userName: profile.user?.name || profile.profileName || "Provider",
        email: profile.user?.email || "",
        role: "provider",
        profilePhoto: profile.profilePhoto || profile.photo || profile.user?.avatar || "",
        resumeUrl: profile.resumeApproval?.pendingUrl || profile.resumeUrl || "",
        pendingLinks,
      };
    });

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const approvePortfolioLink = async (req, res) => {
  try {
    const { profileId, linkId } = req.params;

    const profile = await findProviderProfileByIdOrUserId(profileId);
    if (!profile) return res.status(404).json({ message: "Provider profile not found" });

    let link = (profile.portfolioLinks || []).find((item) => String(item?._id || item?.id) === String(linkId));
    if (!link) return res.status(404).json({ message: "Portfolio link not found" });

    if (link.status !== "pending") {
      return res.status(400).json({ message: "Portfolio link is not in pending status" });
    }

    const platform = link.platform;
    const oldApprovedIndex = profile.portfolioLinks.findIndex(
      l => l.platform === platform && l.status === "approved"
    );

    if (oldApprovedIndex > -1) {
      profile.portfolioLinks.splice(oldApprovedIndex, 1);
    }

    link.status = "approved";
    link.reviewedAt = new Date();
    link.reviewedBy = req.admin?._id || req.user?._id || null;
    link.rejectionReason = "";

    const savedProfile = await saveProviderProfile(profile);
    link = savedProfile.portfolioLinks.find((item) => String(item?._id || item?.id) === String(linkId));

    res.json({
      success: true,
      message: `Portfolio link for platform '${platform}' approved successfully`,
      data: link
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const rejectPortfolioLink = async (req, res) => {
  try {
    const { profileId, linkId } = req.params;
    const { reason } = req.body || {};

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const profile = await findProviderProfileByIdOrUserId(profileId);
    if (!profile) return res.status(404).json({ message: "Provider profile not found" });

    let link = (profile.portfolioLinks || []).find((item) => String(item?._id || item?.id) === String(linkId));
    if (!link) return res.status(404).json({ message: "Portfolio link not found" });

    if (link.status !== "pending") {
      return res.status(400).json({ message: "Portfolio link is not in pending status" });
    }

    link.status = "rejected";
    link.rejectionReason = reason.trim();
    link.reviewedAt = new Date();
    link.reviewedBy = req.admin?._id || req.user?._id || null;

    const savedProfile = await saveProviderProfile(profile);
    link = savedProfile.portfolioLinks.find((item) => String(item?._id || item?.id) === String(linkId));

    res.json({
      success: true,
      message: `Portfolio link for platform '${link.platform}' rejected successfully`,
      data: link
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getResumeApprovalStats = async (req, res) => {
  try {
    const [pendingReview, approved, rejected, totalProfiles] = await Promise.all([
      prisma.providerProfile.count({ where: { resumeApproval: { path: ['status'], equals: 'pending' } } }),
      prisma.providerProfile.count({ where: { resumeApproval: { path: ['status'], equals: 'approved' } } }),
      prisma.providerProfile.count({ where: { resumeApproval: { path: ['status'], equals: 'rejected' } } }),
      prisma.providerProfile.count(),
    ]);

    res.json({ pendingReview, approved, rejected, totalProfiles });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getResumeApprovals = async (req, res) => {
  try {
    const { page = 1, limit = 50, role = "all" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const providerRequests = (await prisma.providerProfile.findMany({
      where: { resumeApproval: { path: ['status'], equals: 'pending' } },
      include: { userRecord: { select: { id: true, name: true, email: true, phone: true } } },
    })).map(mapProviderRecord);

    const allRequests = providerRequests.map((r) => ({
      ...r,
      role: "provider",
      displayName: r.profileName || r.user?.name || "Provider",
    })).sort((a, b) => b.updatedAt - a.updatedAt);

    const paginated = allRequests.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      users: paginated,
      pagination: {
        total: allRequests.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(allRequests.length / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const approveResume = async (req, res) => {
  try {
    const { userId } = req.params;
    
    let profile = await findProviderProfileByUserId(userId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const pendingUrl = profile.resumeApproval?.pendingUrl;
    if (!pendingUrl) {
      return res.status(400).json({ message: "No pending resume found" });
    }

    // Update Profile
    profile.resumeUrl = pendingUrl;
    profile.resumeApproval = {
      ...(profile.resumeApproval || {}),
      status: "approved",
      approvedUrl: pendingUrl,
      pendingUrl: "",
      rejectionReason: "",
      reviewedBy: req.admin?._id || req.user?._id ? String(req.admin?._id || req.user?._id) : null,
      reviewedAt: new Date(),
    };

    profile = await saveProviderProfile(profile);

    // Sync to User model
    const userRaw = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (userRaw) {
      const user = withLegacyId(userRaw);
      user.resumeApproval = {
        status: "approved",
        approvedUrl: pendingUrl,
        pendingUrl: "",
        rejectionReason: "",
        reviewedBy: req.admin?._id || req.user?._id ? String(req.admin?._id || req.user?._id) : null,
        reviewedAt: new Date(),
      };
      await saveUser(user);
    }

    res.json({
      success: true,
      message: "Resume approved",
      data: {
        resumeUrl: profile.resumeUrl,
        status: profile.resumeApproval.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const rejectResume = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body || {};
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    let profile = await findProviderProfileByUserId(userId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    if (
      profile.resumeApproval?.status !== "pending" ||
      !profile.resumeApproval?.pendingUrl
    ) {
      return res.status(400).json({ message: "No pending resume to reject" });
    }

    profile.resumeApproval = {
      ...(profile.resumeApproval || {}),
      status: "rejected",
      pendingUrl: "",
      rejectionReason: reason.trim(),
      reviewedBy: req.admin?._id || req.user?._id ? String(req.admin?._id || req.user?._id) : null,
      reviewedAt: new Date(),
    };

    profile = await saveProviderProfile(profile);

    const userRaw = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (userRaw) {
      const user = withLegacyId(userRaw);
      user.resumeApproval = {
        status: "rejected",
        approvedUrl: profile.resumeApproval?.approvedUrl || "",
        pendingUrl: "",
        rejectionReason: reason.trim(),
        reviewedBy: req.admin?._id || req.user?._id ? String(req.admin?._id || req.user?._id) : null,
        reviewedAt: new Date(),
      };
      await saveUser(user);
    }

    res.json({
      success: true,
      message: "Resume rejected",
      data: { status: profile.resumeApproval.status },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const prepareCountryConfigData = (payload = {}) => {
  const data = {};
  if (payload.countryCode !== undefined) data.countryCode = String(payload.countryCode).toUpperCase().trim();
  if (payload.countryName !== undefined) data.countryName = String(payload.countryName).trim();
  if (payload.currency !== undefined) data.currency = String(payload.currency).trim();
  if (payload.currencySymbol !== undefined) data.currencySymbol = String(payload.currencySymbol).trim();
  if (payload.defaultLanguage !== undefined) data.defaultLanguage = String(payload.defaultLanguage).trim();
  if (payload.phoneCode !== undefined) data.phoneCode = payload.phoneCode ? String(payload.phoneCode).trim() : null;
  if (payload.slug !== undefined) data.slug = payload.slug ? String(payload.slug).trim() : null;
  if (payload.timezone !== undefined) data.timezone = payload.timezone ? String(payload.timezone).trim() : null;
  if (payload.defaultTaxName !== undefined) data.defaultTaxName = String(payload.defaultTaxName).trim();
  if (payload.defaultTaxPercent !== undefined) data.defaultTaxPercent = Number(payload.defaultTaxPercent) || 0;
  if (payload.isActive !== undefined) data.isActive = Boolean(payload.isActive);
  if (payload.isJobSyncEnabled !== undefined) data.isJobSyncEnabled = Boolean(payload.isJobSyncEnabled);
  if (payload.isNotificationEnabled !== undefined) data.isNotificationEnabled = Boolean(payload.isNotificationEnabled);
  if (payload.isPricingEnabled !== undefined) data.isPricingEnabled = Boolean(payload.isPricingEnabled);
  if (payload.isSeoEnabled !== undefined) data.isSeoEnabled = Boolean(payload.isSeoEnabled);
  if (payload.validationStatus !== undefined) data.validationStatus = String(payload.validationStatus);
  if (payload.allowedLanguages !== undefined) data.allowedLanguages = Array.isArray(payload.allowedLanguages) ? payload.allowedLanguages : [];
  if (payload.categories !== undefined) data.categories = Array.isArray(payload.categories) ? payload.categories : [];
  if (payload.jobTypes !== undefined) data.jobTypes = Array.isArray(payload.jobTypes) ? payload.jobTypes : [];
  if (payload.skills !== undefined) data.skills = Array.isArray(payload.skills) ? payload.skills : [];
  if (payload.supportedAtsSources !== undefined) data.supportedAtsSources = Array.isArray(payload.supportedAtsSources) ? payload.supportedAtsSources : [];
  if (payload.supportedJobSources !== undefined) data.supportedJobSources = Array.isArray(payload.supportedJobSources) ? payload.supportedJobSources : [];
  if (payload.pricingRules !== undefined) data.pricingRules = payload.pricingRules;
  if (payload.seoRules !== undefined) data.seoRules = payload.seoRules;
  if (payload.syncRules !== undefined) data.syncRules = payload.syncRules;
  if (payload.notificationRules !== undefined) data.notificationRules = payload.notificationRules;
  if (payload.salaryFormat !== undefined) data.salaryFormat = payload.salaryFormat;
  if (payload.createdBy !== undefined) data.createdBy = payload.createdBy ? String(payload.createdBy) : null;
  return data;
};

const getCountries = async (req, res) => {
  try {
    const rawCountries = await prisma.countryConfig.findMany({
      orderBy: { countryName: 'asc' },
    });
    const countries = rawCountries.map(c => withLegacyId(c));
    res.json({ countries });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const createCountryConfig = async (req, res) => {
  try {
    const { validateCountrySetup } = require("../modules/countries/countryValidation.service");
    const payload = req.body || {};
    const code = String(payload.countryCode || '').toUpperCase().trim();
    const existing = await prisma.countryConfig.findFirst({
      where: { countryCode: code },
    });
    if (existing) {
      return res.status(400).json({ message: "Country code already configured" });
    }
    
    const validation = validateCountrySetup(payload);
    payload.validationStatus = validation.isValid ? 'draft' : 'setup_incomplete';
    payload.isActive = false;
    if (payload.createdBy === undefined && req.user?.id) {
      payload.createdBy = req.user.id;
    }
    
    const created = await prisma.countryConfig.create({
      data: prepareCountryConfigData(payload),
    });
    res.status(201).json(withLegacyId(created));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateCountryConfig = async (req, res) => {
  try {
    const { validateCountrySetup } = require("../modules/countries/countryValidation.service");
    
    const existing = await prisma.countryConfig.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) return res.status(404).json({ message: "Country not found" });
    
    const merged = { ...withLegacyId(existing), ...req.body };
    const validation = validateCountrySetup(merged);
    merged.validationStatus = validation.isValid ? (merged.isActive ? 'active' : 'draft') : 'setup_incomplete';
    if (!validation.isValid) {
      merged.isActive = false;
    }
    
    const updated = await prisma.countryConfig.update({
      where: { id: String(req.params.id) },
      data: prepareCountryConfigData(merged),
    });
    res.json(withLegacyId(updated));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteCountryConfig = async (req, res) => {
  try {
    const existing = await prisma.countryConfig.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) return res.status(404).json({ message: "Country not found" });

    await prisma.countryConfig.delete({
      where: { id: String(req.params.id) },
    });
    res.json({ message: "Country config deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const validateCountryConfig = async (req, res) => {
  try {
    const { validateCountrySetup } = require("../modules/countries/countryValidation.service");
    
    const existing = await prisma.countryConfig.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) return res.status(404).json({ message: "Country not found" });
    
    const country = withLegacyId(existing);
    const validation = validateCountrySetup(country);
    country.validationStatus = validation.isValid ? (country.isActive ? 'active' : 'draft') : 'setup_incomplete';
    if (!validation.isValid) {
      country.isActive = false;
    }
    const updated = await prisma.countryConfig.update({
      where: { id: String(req.params.id) },
      data: {
        validationStatus: country.validationStatus,
        isActive: country.isActive,
      },
    });
    
    res.json({
      isValid: validation.isValid,
      errors: validation.errors,
      country: withLegacyId(updated),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const activateCountryConfig = async (req, res) => {
  try {
    const { validateCountrySetup } = require("../modules/countries/countryValidation.service");
    
    const existing = await prisma.countryConfig.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) return res.status(404).json({ message: "Country not found" });
    
    const country = withLegacyId(existing);
    const validation = validateCountrySetup(country);
    if (!validation.isValid) {
      country.validationStatus = 'setup_incomplete';
      country.isActive = false;
      const updated = await prisma.countryConfig.update({
        where: { id: String(req.params.id) },
        data: {
          validationStatus: 'setup_incomplete',
          isActive: false,
        },
      });
      return res.status(400).json({
        message: "Cannot activate country. Setup checklist is incomplete.",
        errors: validation.errors,
        country: withLegacyId(updated),
      });
    }
    
    const updated = await prisma.countryConfig.update({
      where: { id: String(req.params.id) },
      data: {
        validationStatus: 'active',
        isActive: true,
      },
    });
    res.json({ message: "Country activated successfully", country: withLegacyId(updated) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deactivateCountryConfig = async (req, res) => {
  try {
    const existing = await prisma.countryConfig.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) return res.status(404).json({ message: "Country not found" });

    const newValidationStatus = existing.validationStatus === 'active' ? 'draft' : existing.validationStatus;
    const updated = await prisma.countryConfig.update({
      where: { id: String(req.params.id) },
      data: {
        isActive: false,
        validationStatus: newValidationStatus,
      },
    });
    res.json({ message: "Country deactivated successfully", country: withLegacyId(updated) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const startCountrySync = async (req, res) => {
  try {
    const existing = await prisma.countryConfig.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) return res.status(404).json({ message: "Country not found" });

    const syncRules = {
      ...(typeof existing.syncRules === 'object' && existing.syncRules ? existing.syncRules : {}),
      dailySyncEnabled: true,
      syncState: 'running',
    };

    const updated = await prisma.countryConfig.update({
      where: { id: String(req.params.id) },
      data: {
        isJobSyncEnabled: true,
        syncRules,
      },
    });

    res.json({ message: `Job ingestion pipeline STARTED for ${updated.countryName}`, country: withLegacyId(updated) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const pauseCountrySync = async (req, res) => {
  try {
    const existing = await prisma.countryConfig.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) return res.status(404).json({ message: "Country not found" });

    const syncRules = {
      ...(typeof existing.syncRules === 'object' && existing.syncRules ? existing.syncRules : {}),
      syncState: 'paused',
    };

    const updated = await prisma.countryConfig.update({
      where: { id: String(req.params.id) },
      data: {
        isJobSyncEnabled: true,
        syncRules,
      },
    });

    res.json({ message: `Job ingestion pipeline PAUSED for ${updated.countryName}`, country: withLegacyId(updated) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const stopCountrySync = async (req, res) => {
  try {
    const existing = await prisma.countryConfig.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) return res.status(404).json({ message: "Country not found" });

    const syncRules = {
      ...(typeof existing.syncRules === 'object' && existing.syncRules ? existing.syncRules : {}),
      dailySyncEnabled: false,
      syncState: 'stopped',
    };

    const updated = await prisma.countryConfig.update({
      where: { id: String(req.params.id) },
      data: {
        isJobSyncEnabled: false,
        syncRules,
      },
    });

    res.json({ message: `Job ingestion pipeline STOPPED for ${updated.countryName}`, country: withLegacyId(updated) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getImportBatches,
  getImportBatchStatus,
  updateImportBatchAction,
  getDashboard,
  getUsers,
  getUserDetail,
  toggleBlockUser,
  createManager,
  getManagers,
  deleteManager,
  getApprovalLogs,
  approveUser,
  rejectUser,
  getProviders,
  getRecruiters,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getSettings,
  updateSettings,
  getRotationPools,
  createRotationPool,
  updateRotationPool,
  startRotationPool,
  pauseRotationPool,
  stopRotationPool,
  advanceRotationPool,
  deleteRotationPool,
  getPayments,
  getAllJobs,
  getContent,
  updateContent,
  uploadProfilePhoto,
  getProfilePhoto,
  deleteUser,
  deleteProvider,
  deleteRecruiter,
  getPaymentSettings,
  updatePaymentSettings,
  getCurrencySettings,
  updateCurrencySettings,
  getCloudinarySettings,
  updateCloudinarySettings,
  getWhatsappLogs,
  getWhatsappSettings,
  updateWhatsappSettings,
  getFeatureFlags,
  updateFeatureFlag,
  getSkillCategories,
  createSkillCategory,
  updateSkillCategory,
  updateSkillCategoryStatus,
  addSkillToCategory,
  removeSkillFromCategory,
  deleteSkillCategory,
  getProfilePhotoApprovals,
  approveProfilePhoto,
  rejectProfilePhoto,
  getResumeApprovalStats,
  getResumeApprovals,
  approveResume,
  rejectResume,
  getProfileApprovalStats,
  getAllReferrals,
  uploadProvidersCSV,
  uploadRecruitersCSV,
  getPortfolioApprovals,
  approvePortfolioLink,
  rejectPortfolioLink,
  setPlanDefault,
  setPlanPopular,
  updatePlanStatus,
  getCountries,
  createCountryConfig,
  updateCountryConfig,
  deleteCountryConfig,
  validateCountryConfig,
  activateCountryConfig,
  deactivateCountryConfig,
  startCountrySync,
  pauseCountrySync,
  stopCountrySync,
  
  // Custom Plan Requests
  getCustomPlanRequests: async (req, res) => {
    try {
      const requests = await prisma.customPlanRequest.findMany({
        include: { recruiterIdRecord: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      });
        
      const recruiterIds = requests.map((request) => request.recruiterId).filter(Boolean);
      const profiles = await prisma.recruiterProfile.findMany({
        where: { user: { in: recruiterIds } },
      });
      
      const data = requests.map((request) => {
        const profile = profiles.find((item) => item.user === request.recruiterId);
        const mapped = withLegacyId(request);
        mapped.recruiterId = withLegacyId(mapped.recruiterIdRecord);
        delete mapped.recruiterIdRecord;
        return {
          ...mapped,
          company: profile ? profile.companyName : null,
          designation: profile ? profile.designation : null
        };
      });
      
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error fetching custom plan requests:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  updateCustomPlanRequestStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'contacted', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const existing = await prisma.customPlanRequest.findUnique({ where: { id: String(id) } });
      const request = existing
        ? withLegacyId(await prisma.customPlanRequest.update({ where: { id: String(id) }, data: { status } }))
        : null;

      if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      res.status(200).json({ success: true, message: 'Status updated successfully', data: request });
    } catch (error) {
      console.error('Error updating custom plan request status:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  generateCustomPlanOffer: async (req, res) => {
    try {
      const { id } = req.params;
      const { price, durationMonths, features } = req.body;

      if (price == null || !durationMonths) {
        return res.status(400).json({ success: false, message: 'Price and duration are required' });
      }

      const requestRecord = await prisma.customPlanRequest.findUnique({
        where: { id: String(id) },
        include: { recruiterIdRecord: { select: { id: true, name: true, email: true } } },
      });
      if (!requestRecord) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }
      let request = withLegacyId(requestRecord);
      request.recruiterId = withLegacyId(request.recruiterIdRecord);
      delete request.recruiterIdRecord;

      const customPlanSlug = `custom-${request.recruiterId._id}-${Date.now()}`;
      
      const customPlan = await createPlanRecord({
        name: 'Custom Plan',
        slug: customPlanSlug,
        type: 'recruiter',
        price: price,
        duration: durationMonths * 30,
        unlockCredits: request.profileUnlocks || 0,
        features: features || request.selectedFeatures,
        planType: 'custom',
        isActive: true
      });

      const offerDetails = {
        price,
        durationMonths,
        features: features || request.selectedFeatures,
        status: 'pending',
        stripePriceId: customPlanSlug,
        planId: customPlan._id,
        createdAt: new Date().toISOString()
      };
      
      request = withLegacyId(await prisma.customPlanRequest.update({
        where: { id: String(id) },
        data: { offerDetails, status: 'resolved' },
      }));
      request.recruiterId = withLegacyId(requestRecord.recruiterIdRecord);

      try {
        const { sendMail } = require("../services/mailService");
        const planUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/recruiter/plans`;
        await sendMail(
          request.recruiterId.email,
          'Your Lucohire Custom Plan Offer is Ready!',
          `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#4a24ba">Your Custom Plan Offer is Ready 🎉</h2>
            <p style="margin:0 0 24px;color:#64748b">Hi ${request.recruiterId.name || 'there'}, our team has reviewed your request and prepared a tailored offer just for you.</p>
            
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px">
              <div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0">
                <span style="color:#64748b;font-size:14px">Plan Duration</span>
                <span style="font-weight:700;font-size:14px">${durationMonths} Month${durationMonths > 1 ? 's' : ''}</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:#64748b;font-size:14px">Offer Price</span>
                <span style="font-weight:800;font-size:20px;color:#4a24ba">₹${Number(price).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <p style="color:#64748b;font-size:13px;margin-bottom:20px">This is a one-time custom price set by our team specifically for your business needs. Click below to review and complete your secure checkout.</p>
            
            <a href="${planUrl}" style="display:inline-block;background:#4a24ba;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px">
              View Offer & Checkout →
            </a>
            
            <p style="margin-top:32px;color:#94a3b8;font-size:12px">If you have questions, reply to this email or contact our support team. The offer will remain active until fulfilled.</p>
            <p style="color:#94a3b8;font-size:12px;margin:4px 0 0">— The Lucohire Team</p>
          </div>`
        );
      } catch (emailErr) {
        console.error('Failed to send custom plan offer email:', emailErr);
      }

      res.status(200).json({ success: true, message: 'Offer generated successfully', data: request });
    } catch (error) {
      console.error('Error generating custom plan offer:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  clearAllCustomPlanRequests: async (req, res) => {
    try {
      const result = await prisma.customPlanRequest.deleteMany({});
      res.status(200).json({ success: true, message: `Cleared ${result.count} custom plan request(s).` });
    } catch (error) {
      console.error('Error clearing custom plan requests:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  activateCountryConfig,
  deactivateCountryConfig,
  startCountrySync,
  pauseCountrySync,
  stopCountrySync,

  getCustomPlanPricingSettings: async (req, res) => {
    try {
      let setting = await prisma.adminSetting.findUnique({ where: { key: 'custom_plan_pricing' } });
      if (!setting) {
        // Defaults
        const defaultValue = {
          copilot: 2000,
          resume_parser: 3000,
          interview_kits: 1500,
          automated_email: 2500,
          data_export: 500,
          jobPrice: 500,
          unlockPrice: 10,
          campaignPrice: 1500,
          boostJobPrice: 1000,
          boostDayPrice: 50
        };
        setting = await prisma.adminSetting.create({ data: {
          key: 'custom_plan_pricing',
          value: defaultValue,
          category: 'pricing',
          description: 'Base pricing for custom plan features'
        } });
      }
      res.status(200).json({ success: true, data: setting.value });
    } catch (error) {
      console.error('Error fetching custom plan pricing:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  updateCustomPlanPricingSettings: async (req, res) => {
    try {
      const { pricing } = req.body;
      if (!pricing) return res.status(400).json({ success: false, message: 'Pricing data required' });

      const setting = await prisma.adminSetting.upsert({
        where: { key: 'custom_plan_pricing' },
        create: { key: 'custom_plan_pricing', category: 'pricing', value: pricing },
        update: { value: pricing },
      });

      res.status(200).json({ success: true, data: setting.value, message: 'Pricing updated successfully' });
    } catch (error) {
      console.error('Error updating custom plan pricing:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getOtpLogs: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const { search, status, channel } = req.query;
      const result = await listOtpLogs({ search, status, channel, page, limit });

      res.status(200).json({
        success: true,
        data: {
          logs: result.logs,
          total: result.total,
          page: result.page,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('Error fetching OTP logs:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getContactLogs: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const result = await listContactClickLogs({ page, limit });

      res.status(200).json({
        success: true,
        data: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('Error fetching contact logs:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};
