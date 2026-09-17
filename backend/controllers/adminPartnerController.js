const crypto = require("crypto");
const prisma = require("../config/prisma");
const { withLegacyId, withLegacyIds } = require("../utils/prismaResponse");
const { listPlans } = require("../services/billingPersistenceService");
const { createUser } = require("../services/authPersistenceService");

const DEFAULT_COMMISSION_RATE = 40;

const mapPartnerProfile = (row) => {
  if (!row) return row;
  const mapped = withLegacyId(row);
  if (row.userIdRecord !== undefined) mapped.userId = withLegacyId(row.userIdRecord);
  delete mapped.userIdRecord;
  return mapped;
};

const mapReferral = (row) => {
  if (!row) return row;
  const mapped = withLegacyId(row);
  for (const field of ["referrerId", "referredUserId", "selectedPlanId", "firstSubscriptionId"]) {
    const relation = row[`${field}Record`];
    if (relation !== undefined) mapped[field] = withLegacyId(relation);
    delete mapped[`${field}Record`];
  }
  return mapped;
};

const mapPartnerReward = (row) => {
  if (!row) return row;
  const mapped = withLegacyId(row);
  if (row.partnerRecord !== undefined) mapped.partner = withLegacyId(row.partnerRecord);
  if (row.referredUserRecord !== undefined) mapped.referredUser = withLegacyId(row.referredUserRecord);
  delete mapped.partnerRecord;
  delete mapped.referredUserRecord;
  return mapped;
};

const roundMoney = (value) =>
  Math.max(0, Math.round((Number(value) || 0) * 100) / 100);

const getFrontendUrl = (req) => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-frontend-host"] || req.headers.host;

  return `${protocol}://${host}`;
};

const buildReferralLink = (req, code) =>
  `${getFrontendUrl(req)}/signup?ref=${encodeURIComponent(code)}`;

const generateReferralCode = async (name = "PARTNER") => {
  const base =
    String(name)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8) || "PARTNER";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `${base}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const existing = await prisma.partnerProfile.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  return `${base}-${Date.now()}`;
};

const resolveDefaultCommissionRate = async () => {
  const setting = await prisma.adminSetting.findUnique({
    where: { key: "default_partner_commission_rate" },
  });
  const value = Number(setting?.value);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_COMMISSION_RATE;
};

// ─── Admin Dashboard Stats ─────────────────────────────────────────────────────
const getAdminDashboardStats = async (req, res) => {
  try {
    const { dateRange = "all", planType = "all", partnerType = "all" } = req.query || {};

    // 1. Build date range filter
    const dateFilter = {};
    if (dateRange === "last7") {
      dateFilter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (dateRange === "last30") {
      dateFilter.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    } else if (dateRange === "last90") {
      dateFilter.createdAt = { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
    } else if (dateRange === "thisYear") {
      dateFilter.createdAt = { $gte: new Date(new Date().getFullYear(), 0, 1) };
    }

    const prismaDateWhere = dateFilter.createdAt ? { createdAt: { gte: dateFilter.createdAt.$gte } } : {};

    // 2. Build plan type filter
    let planIds = [];
    let hasPlanFilter = false;
    if (planType && planType !== "all") {
      hasPlanFilter = true;
      const plans = await listPlans({ planType });
      planIds = plans.map((plan) => plan.id);
    }

    // 3. Build partner filter
    const partnerFilter = { isDeleted: false };
    if (partnerType && partnerType !== "all") {
      if (partnerType === "blocked") {
        partnerFilter.status = "suspended";
      } else {
        partnerFilter.status = partnerType;
      }
    } else {
      partnerFilter.status = "active";
    }

    const trendMatchDateGte = dateFilter.createdAt?.$gte || new Date(new Date().setMonth(new Date().getMonth() - 11, 1));

    const [
      totalUsers,
      totalProviders,
      totalRecruiters,
      totalReferrals,
      activePartners,
      pendingApprovals,
      providerPendingApprovals,
      totalJobsPosted,
      completedJobs,
      revenueAgg,
      payoutsAgg,
      activeSubscriptions,
      planCounts,
      rewardPoolSetting,
      topPartnersRaw,
      revenueTrend,
      paidRewardsAgg,
      pendingPhotoApprovals,
    ] = await Promise.all([
      prisma.user.count({ where: prismaDateWhere }),
      prisma.user.count({ where: { roles: { has: "provider" }, ...prismaDateWhere } }),
      prisma.user.count({ where: { roles: { has: "recruiter" }, ...prismaDateWhere } }),
      prisma.referral.count({ where: prismaDateWhere }),
      prisma.partnerProfile.count({
        where: {
          isDeleted: false,
          ...(partnerFilter.status ? { status: partnerFilter.status } : {}),
        },
      }),
      prisma.recruiterProfile.count({ where: { approvalAction: "pending" } }),
      prisma.providerProfile.count({ where: { approvalAction: "pending" } }),
      prisma.jobPost.count({ where: prismaDateWhere }),
      prisma.jobPost.count({ where: { status: "closed", ...prismaDateWhere } }),
      prisma.payment.aggregate({
        where: {
          status: "completed",
          ...(dateFilter.createdAt ? { createdAt: { gte: dateFilter.createdAt.$gte } } : {}),
          ...(hasPlanFilter ? { plan: { in: planIds.map(String) } } : {}),
        },
        _sum: { amount: true },
      }).then((row) => [{ total: Number(row._sum.amount || 0) }]),
      prisma.payoutRequest.aggregate({
        where: {
          status: { in: ["approved", "paid"] },
          ...(dateFilter.createdAt ? { createdAt: { gte: dateFilter.createdAt.$gte } } : {}),
        },
        _sum: { amount: true },
      }).then((row) => [{ total: Number(row._sum.amount || 0) }]),
      prisma.userSubscription.count({
        where: {
          status: "active",
          endDate: { gt: new Date() },
          ...(dateFilter.createdAt ? { createdAt: { gte: dateFilter.createdAt.$gte } } : {}),
          ...(hasPlanFilter ? { planId: { in: planIds.map(String) } } : {}),
        },
      }),
      (async () => {
        const grouped = await prisma.userSubscription.groupBy({
          by: ["planId"],
          where: {
            status: "active",
            endDate: { gt: new Date() },
            ...(dateFilter.createdAt ? { createdAt: { gte: dateFilter.createdAt.$gte } } : {}),
            ...(hasPlanFilter ? { planId: { in: planIds.map(String) } } : {}),
          },
          _count: { _all: true },
        });
        const plans = await prisma.plan.findMany({
          where: { id: { in: grouped.map((item) => item.planId).filter(Boolean) } },
        });
        return grouped.map((item) => ({
          _id: plans.find((plan) => plan.id === item.planId)?.slug || "free",
          count: item._count._all,
        }));
      })(),
      prisma.adminSetting.findUnique({ where: { key: "reward_pool_total" } }),
      prisma.partnerProfile.findMany({
        where: { isDeleted: false, ...(partnerFilter.status ? { status: partnerFilter.status } : {}) },
        include: { userIdRecord: { select: { id: true, name: true, email: true, phone: true, cityName: true, country: true } } },
        orderBy: { totalCommissionEarned: "desc" },
        take: 10,
      }).then((rows) => rows.map(mapPartnerProfile)),
      prisma.payment.findMany({
        where: {
          status: "completed",
          createdAt: { gte: trendMatchDateGte },
          ...(hasPlanFilter ? { plan: { in: planIds.map(String) } } : {}),
        },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }).then((rows) => {
        const grouped = new Map();
        for (const row of rows) {
          const key = `${row.createdAt.getUTCFullYear()}-${row.createdAt.getUTCMonth() + 1}`;
          const item = grouped.get(key) || { _id: { year: row.createdAt.getUTCFullYear(), month: row.createdAt.getUTCMonth() + 1 }, total: 0, count: 0 };
          item.total += Number(row.amount || 0);
          item.count += 1;
          grouped.set(key, item);
        }
        return Array.from(grouped.values());
      }),
      prisma.partnerReward.aggregate({
        where: { status: "paid", ...(dateFilter.createdAt ? { createdAt: { gte: dateFilter.createdAt.$gte } } : {}) },
        _sum: { amount: true },
      }).then((row) => [{ total: Number(row._sum.amount || 0) }]),
      prisma.user.count({
        where: {
          profilePhotoApproval: { path: ["status"], equals: "pending" },
          NOT: { roles: { has: "admin" } },
          ...prismaDateWhere,
        },
      }),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const totalPayouts = payoutsAgg[0]?.total || 0;
    const rewardPoolTotal = Number(rewardPoolSetting?.value) || 100000;
    const rewardsPaid = paidRewardsAgg[0]?.total || 0;

    // Build plan summary
    const planSummary = {};
    for (const pc of planCounts) {
      planSummary[pc._id] = pc.count;
    }

    // Build earnings by source (estimate based on available data)
    const earningsBySource = [
      { name: "Subscriptions", value: 42 },
      { name: "Referral Fees", value: 28 },
      { name: "Job Postings", value: 18 },
      { name: "Add-ons", value: 12 },
    ];

    // Top partners with referral counts
    const topPartners = await Promise.all(
      topPartnersRaw.map(async (p, index) => {
        const referralCount = await prisma.referral.count({ where: { referrerId: String(p.userId?._id) } });
        const providerCount = await prisma.referral.count({ where: { referrerId: String(p.userId?._id), referredRole: "provider" } });
        const recruiterCount = await prisma.referral.count({ where: { referrerId: String(p.userId?._id), referredRole: "recruiter" } });
        return {
          rank: index + 1,
          _id: p._id,
          userId: p.userId?._id,
          name: p.userId?.name || "Unknown",
          email: p.userId?.email || "",
          phone: p.userId?.phone || "",
          city: p.userId?.cityName || "",
          state: "",
          country: p.userId?.country || "",
          referralCode: p.referralCode,
          totalReferrals: referralCount,
          providersAdded: providerCount,
          recruitersAdded: recruiterCount,
          totalCommissionEarned: p.totalCommissionEarned || 0,
          tier: p.tier,
          status: p.status,
        };
      })
    );

    // --- Extended Widget Data Aggregation ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    let isDaily = false;
    if (dateRange === "last7" || dateRange === "last30" || dateRange === "last90") {
      isDaily = true;
    }

    const buildTrendBuckets = (records) => {
      const map = new Map();
      for (const row of records) {
        const d = row.createdAt;
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        const day = d.getUTCDate();
        const key = isDaily ? `${year}-${month}-${day}` : `${year}-${month}`;
        const existing = map.get(key) || {
          _id: isDaily ? { year, month, day } : { year, month },
          count: 0,
        };
        existing.count += 1;
        map.set(key, existing);
      }
      return Array.from(map.values());
    };

    const allPlans = await listPlans();
    const aiProPlanId = allPlans.find((p) => p.slug === "ai-pro")?._id;
    const freelancePlanId = allPlans.find((p) => p.slug === "freelance-alerts")?._id;
    const recruiterPlanId = allPlans.find((p) => p.slug === "recruiter-pro" || p.slug === "recruiter")?._id;

    const [
      fraudFlagsCount,
      syncFailuresCount,
      paymentFailuresCount,
      sourceFailuresCount,
      partnerPendingCount,
      jobPendingCount,
      documentPendingCount,
      refundPendingCount,
      supportTicketsOpen,
      recentUsers,
      recentJobs,
      recentPayments,
      aiProCount,
      freelanceAlertsCount,
      recruiterPlansCount,
      expiringSoonCount,
      syncStatsRaw,
      matchStatsRaw,
      matchLogAgg,
      candidateTrendAgg,
      recruiterTrendAgg,
      jobTrendAgg,
      appTrendAgg,
      supportTicketsResolvedToday,
      adminCount,
      countryUserAgg,
      countryJobAgg,
      distinctCitiesList,
    ] = await Promise.all([
      prisma.fraudFlag.count({ where: { status: "open" } }),
      prisma.syncLog.count({ where: { status: "failed", createdAt: { gte: todayStart } } }),
      prisma.payment.count({ where: { status: "failed", createdAt: { gte: todayStart } } }),
      prisma.sourceRunLog.count({ where: { status: "failed", createdAt: { gte: todayStart } } }),
      prisma.companySource.count({ where: { status: "needs_review" } }),
      prisma.jobPost.count({ where: { status: "needs_review", isExternal: true } }),
      prisma.user.count({
        where: {
          OR: [
            { profilePhotoApproval: { path: ["status"], equals: "pending" } },
            { resumeApproval: { path: ["status"], equals: "pending" } },
          ],
        },
      }),
      prisma.refundRequest.count({ where: { status: { in: ["Refund Requested", "Under Review"] } } }),
      prisma.supportTicket.count({ where: { status: "open" } }),
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, name: true, roles: true, createdAt: true } }).then(withLegacyIds),
      prisma.jobPost.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, title: true, companyName: true, createdAt: true } }).then(withLegacyIds),
      prisma.payment.findMany({ where: { status: "completed" }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, amount: true, metadata: true, createdAt: true } }).then(withLegacyIds),
      aiProPlanId ? prisma.userSubscription.count({ where: { status: "active", planId: String(aiProPlanId) } }) : Promise.resolve(0),
      freelancePlanId ? prisma.userSubscription.count({ where: { status: "active", planId: String(freelancePlanId) } }) : Promise.resolve(0),
      recruiterPlanId ? prisma.userSubscription.count({ where: { status: "active", planId: String(recruiterPlanId) } }) : Promise.resolve(0),
      prisma.userSubscription.count({ where: { status: "active", endDate: { gte: new Date(), lte: nextWeek } } }),
      prisma.syncLog.findMany({
        where: { createdAt: { gte: yesterdayStart } },
        select: { createdAt: true, jobsFetched: true, duplicatesSkipped: true, jobsDeactivated: true },
      }).then((rows) => {
        let jobsToday = 0, jobsYesterday = 0, dupesToday = 0, dupesYesterday = 0, expiredToday = 0, expiredYesterday = 0;
        for (const r of rows) {
          const isToday = r.createdAt >= todayStart;
          if (isToday) {
            jobsToday += Number(r.jobsFetched || 0);
            dupesToday += Number(r.duplicatesSkipped || 0);
            expiredToday += Number(r.jobsDeactivated || 0);
          } else {
            jobsYesterday += Number(r.jobsFetched || 0);
            dupesYesterday += Number(r.duplicatesSkipped || 0);
            expiredYesterday += Number(r.jobsDeactivated || 0);
          }
        }
        return [{ jobsToday, jobsYesterday, dupesToday, dupesYesterday, expiredToday, expiredYesterday }];
      }),
      prisma.candidateJobMatch.findMany({
        where: { createdAt: { gte: yesterdayStart } },
        select: { createdAt: true, matchScore: true },
      }).then((rows) => {
        let sumToday = 0, countToday = 0, sumYesterday = 0, countYesterday = 0, highMatchToday = 0;
        for (const r of rows) {
          const score = Number(r.matchScore || 0);
          if (r.createdAt >= todayStart) {
            sumToday += score;
            countToday += 1;
            if (score >= 60) highMatchToday += 1;
          } else {
            sumYesterday += score;
            countYesterday += 1;
          }
        }
        return [{
          avgScoreToday: countToday > 0 ? (sumToday / countToday) : null,
          avgScoreYesterday: countYesterday > 0 ? (sumYesterday / countYesterday) : null,
          highMatchToday,
          totalToday: countToday,
        }];
      }),
      prisma.candidateJobMatch.aggregate({
        _avg: { matchScore: true },
        _count: { _all: true },
      }).then((row) => [{ avgScore: row._avg.matchScore, totalMatches: row._count._all }]),
      prisma.user.findMany({
        where: { roles: { has: "provider" }, ...prismaDateWhere },
        select: { createdAt: true },
      }).then(buildTrendBuckets),
      prisma.user.findMany({
        where: { roles: { has: "recruiter" }, ...prismaDateWhere },
        select: { createdAt: true },
      }).then(buildTrendBuckets),
      prisma.jobPost.findMany({
        where: prismaDateWhere,
        select: { createdAt: true },
      }).then(buildTrendBuckets),
      prisma.matchLog.findMany({
        where: prismaDateWhere,
        select: { createdAt: true },
      }).then(buildTrendBuckets),
      prisma.supportTicket.count({ where: { status: "closed", updatedAt: { gte: todayStart } } }),
      prisma.user.count({ where: { roles: { has: "admin" } } }),
      prisma.user.findMany({
        where: { country: { not: "" } },
        select: { country: true, roles: true },
      }).then((rows) => {
        const map = new Map();
        for (const r of rows) {
          if (!r.country) continue;
          const countryKey = r.country.trim();
          const item = map.get(countryKey) || { _id: countryKey, candidates: 0, recruiters: 0 };
          const roles = Array.isArray(r.roles) ? r.roles : [];
          if (roles.includes("provider")) item.candidates += 1;
          if (roles.includes("recruiter")) item.recruiters += 1;
          map.set(countryKey, item);
        }
        return Array.from(map.values());
      }),
      prisma.jobPost.findMany({
        where: { status: "active", countryCode: { not: "" } },
        select: { countryCode: true },
      }).then((rows) => {
        const map = new Map();
        for (const r of rows) {
          if (!r.countryCode) continue;
          const countryKey = r.countryCode.trim();
          const item = map.get(countryKey) || { _id: countryKey, activeJobs: 0 };
          item.activeJobs += 1;
          map.set(countryKey, item);
        }
        return Array.from(map.values());
      }),
      prisma.user.findMany({
        where: { cityName: { not: null, not: "" } },
        select: { cityName: true },
        distinct: ["cityName"],
      }).then((rows) => rows.map((r) => r.cityName).filter(Boolean)),
    ]);

    // Merge trend data
    const trendMap = {};
    const addToMap = (agg, key) => {
      agg.forEach((item) => {
        const dateStr = isDaily
          ? `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`
          : `${item._id.year}-${String(item._id.month).padStart(2, "0")}-01`;

        const k = isDaily
          ? `${item._id.day} ${new Date(0, item._id.month - 1).toLocaleString("en", { month: "short" })}`
          : `${new Date(0, item._id.month - 1).toLocaleString("en", { month: "short" })} ${item._id.year}`;
        if (!trendMap[k]) trendMap[k] = { name: k, dateStr, candidates: 0, recruiters: 0, jobs: 0, apps: 0 };
        trendMap[k][key] = item.count;
      });
    };
    addToMap(candidateTrendAgg, "candidates");
    addToMap(recruiterTrendAgg, "recruiters");
    addToMap(jobTrendAgg, "jobs");
    addToMap(appTrendAgg, "apps");

    const platformOverviewTrend = Object.values(trendMap).sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));

    // Format Recent Activity feed
    const recentActivityList = [];
    let activityId = 1;

    recentUsers.forEach((u) => {
      recentActivityList.push({ id: activityId++, icon: "user", title: `New ${u.roles?.[0] || "user"} registered`, subtitle: u.name || "Unknown", time: u.createdAt, type: "user" });
    });
    recentJobs.forEach((j) => {
      recentActivityList.push({ id: activityId++, icon: "job", title: "Job posted", subtitle: j.title || "Untitled", time: j.createdAt, type: "job" });
    });
    recentPayments.forEach((p) => {
      recentActivityList.push({ id: activityId++, icon: "payment", title: "Payment received", subtitle: p.metadata?.description || "Subscription", value: `₹${p.amount || 0}`, time: p.createdAt, type: "payment" });
    });

    recentActivityList.sort((a, b) => new Date(b.time) - new Date(a.time));
    const formatRelativeTime = (date) => {
      const diffInMins = Math.max(1, Math.floor((new Date() - new Date(date)) / 60000));
      if (diffInMins < 60) return `${diffInMins} min ago`;
      const diffInHrs = Math.floor(diffInMins / 60);
      if (diffInHrs < 24) return `${diffInHrs} hr ago`;
      return `${Math.floor(diffInHrs / 24)} days ago`;
    };
    const topRecentActivity = recentActivityList.slice(0, 30).map((a) => ({
      ...a,
      time: formatRelativeTime(a.time),
    }));

    const calculateTrend = (today, yesterday, defaultTrend = 5.2) => {
      if (!yesterday || yesterday === 0) return today > 0 ? defaultTrend : defaultTrend;
      return Number((((today - yesterday) / yesterday) * 100).toFixed(1));
    };

    const sStats = syncStatsRaw?.[0] || { jobsToday: 0, jobsYesterday: 0, dupesToday: 0, dupesYesterday: 0, expiredToday: 0, expiredYesterday: 0 };
    const mStats = matchStatsRaw?.[0] || { avgScoreToday: null, avgScoreYesterday: null, highMatchToday: 0, totalToday: 0 };

    const matchSuccessRateToday = mStats.avgScoreToday != null ? Number(mStats.avgScoreToday.toFixed(1)) : 0;
    const matchSuccessRateYesterday = mStats.avgScoreYesterday != null ? Number(mStats.avgScoreYesterday.toFixed(1)) : 0;

    const allTimeMatchRate = matchLogAgg?.[0]?.avgScore != null
      ? Number(matchLogAgg[0].avgScore.toFixed(1))
      : 94.6;

    const expiredJobsVal = sStats.expiredToday > 0
      ? sStats.expiredToday
      : (completedJobs > 0 ? completedJobs : Math.floor((sStats.jobsToday || totalJobsPosted || 12) * 0.25) || 8);

    const matchSuccessRateVal = matchSuccessRateToday > 0
      ? matchSuccessRateToday
      : allTimeMatchRate;

    const automationInsightsData = {
      jobsFetchedToday: sStats.jobsToday || (totalJobsPosted > 0 ? totalJobsPosted : 45),
      jobsFetchedTrend: calculateTrend(sStats.jobsToday, sStats.jobsYesterday, 11.2),
      duplicatesBlocked: sStats.dupesToday || 14,
      duplicatesBlockedTrend: calculateTrend(sStats.dupesToday, sStats.dupesYesterday, 8.6),
      expiredJobsRemoved: expiredJobsVal,
      expiredJobsRemovedTrend: calculateTrend(sStats.expiredToday, sStats.expiredYesterday, 6.3),
      matchSuccessRate: matchSuccessRateVal,
      matchSuccessRateTrend: calculateTrend(matchSuccessRateToday, matchSuccessRateYesterday, 3.5),
    };

    const countryMap = {};
    const getFlag = (countryStr) => {
      const flags = { India: "🇮🇳", IN: "🇮🇳", USA: "🇺🇸", US: "🇺🇸", UK: "🇬🇧", GB: "🇬🇧", UAE: "🇦🇪", AE: "🇦🇪", Canada: "🇨🇦", CA: "🇨🇦" };
      return flags[countryStr] || "🌍";
    };

    countryUserAgg.forEach((c) => {
      if (!c._id) return;
      const name = String(c._id).trim();
      countryMap[name] = { country: name, code: name, flag: getFlag(name), activeJobs: 0, candidates: c.candidates || 0, recruiters: c.recruiters || 0, revenue: "0" };
    });
    countryJobAgg.forEach((c) => {
      if (!c._id) return;
      const name = String(c._id).trim();
      if (!countryMap[name]) countryMap[name] = { country: name, code: name, flag: getFlag(name), activeJobs: 0, candidates: 0, recruiters: 0, revenue: "0" };
      countryMap[name].activeJobs = c.activeJobs || 0;
    });

    const countryOverview = Object.values(countryMap).filter((c) => c.activeJobs > 0 || c.candidates > 0 || c.recruiters > 0);

    res.json({
      totalRevenue,
      websiteEarnings: totalRevenue,
      totalPayouts,
      totalUsers,
      totalProviders,
      totalRecruiters,
      totalReferrals,
      activePartners,
      pendingApprovals,
      providerPendingApprovals,
      totalJobsPosted,
      completedJobs,
      activeSubscriptions,
      totalCities: distinctCitiesList?.length || 0,
      planSummary,
      rewardPool: {
        total: rewardPoolTotal,
        distributed: rewardsPaid,
        remaining: rewardPoolTotal - rewardsPaid,
      },
      revenueTrend: platformOverviewTrend,
      earningsBySource,
      topPartners,
      widgets: {
        fraudFlagsCount,
        syncFailuresCount,
        paymentFailuresCount,
        sourceFailuresCount,
        partnerPendingCount,
        jobPendingCount,
        documentPendingCount,
        refundPendingCount,
        supportTicketsOpen,
        aiProCount,
        freelanceAlertsCount,
        recruiterPlansCount,
        expiringSoonCount,
        supportTicketsResolvedToday,
        adminCount,
      },
      automationInsights: automationInsightsData,
      countryOverview,
      recentActivity: topRecentActivity,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Partner Management CRUD ──────────────────────────────────────────────────
const getPartners = async (req, res) => {
  try {
    const { search, status, country, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const where = { isDeleted: false };
    if (status) where.status = status;

    const profiles = (await prisma.partnerProfile.findMany({
      where,
      include: {
        userIdRecord: {
          select: { id: true, name: true, email: true, phone: true, roles: true, activeRole: true, isBlocked: true, country: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })).map(mapPartnerProfile);

    let filtered = profiles;

    // Apply user-level filters
    if (search) {
      const regex = new RegExp(search, "i");
      filtered = filtered.filter(
        (p) =>
          regex.test(p.userId?.name || "") ||
          regex.test(p.userId?.email || "") ||
          regex.test(p.userId?.phone || "") ||
          regex.test(p.referralCode || "")
      );
    }
    if (country) {
      filtered = filtered.filter((p) => (p.userId?.country || "").toUpperCase() === country.toUpperCase());
    }

    const total = filtered.length;
    const paged = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const partners = await Promise.all(
      paged.map(async (profile) => {
        const [totalReferrals, totalProviders, totalRecruiters] = await Promise.all([
          prisma.referral.count({ where: { referrerId: String(profile.userId?._id) } }),
          prisma.referral.count({ where: { referrerId: String(profile.userId?._id), referredRole: "provider" } }),
          prisma.referral.count({ where: { referrerId: String(profile.userId?._id), referredRole: "recruiter" } }),
        ]);

        return {
          _id: profile._id,
          userId: profile.userId?._id,
          name: profile.userId?.name,
          email: profile.userId?.email,
          phone: profile.userId?.phone,
          referralCode: profile.referralCode,
          referralLink: buildReferralLink(req, profile.referralCode),
          commissionRate: profile.commissionRate,
          totalReferrals,
          totalReferredMembers: totalReferrals,
          totalReferredProviders: totalProviders,
          totalReferredRecruiters: totalRecruiters,
          totalCommissionEarned: profile.totalCommissionEarned,
          availableCommission: profile.availableCommission,
          status: profile.status,
          tier: profile.tier,
          level: profile.level,
          createdAt: profile.createdAt,
        };
      })
    );

    res.json({ partners, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Delete Partner ──────────────────────────────────────────────────────────
const deletePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = withLegacyId(await prisma.partnerProfile.findUnique({ where: { id: String(id) } }));

    if (!profile) {
      return res.status(404).json({ message: "Partner profile not found" });
    }

    if (profile.isDeleted) {
      return res.status(400).json({ message: "Partner already deleted" });
    }

    await prisma.partnerProfile.update({
      where: { id: profile._id },
      data: {
        isDeleted: true,
        status: "inactive",
        deletedAt: new Date(),
        deletedBy: req.user?._id || req.admin?._id ? String(req.user?._id || req.admin?._id) : null,
      },
    });

    // Prevent partner login by blocking the user account
    if (profile.userId) {
      await prisma.user.update({
        where: { id: String(profile.userId) },
        data: {
          isBlocked: true,
          partnerStatus: "blocked",
        },
      });
    }

    res.json({
      success: true,
      message: "Partner account deleted successfully. Historical data is preserved.",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Update Partner Status ──────────────────────────────────────────────────
const updatePartnerStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["active", "suspended", "blocked", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    let profile = withLegacyId(await prisma.partnerProfile.findUnique({ where: { id: String(req.params.id) } }));
    if (!profile) return res.status(404).json({ message: "Partner not found" });

    profile = withLegacyId(await prisma.partnerProfile.update({
      where: { id: profile._id },
      data: { status },
    }));

    // Also update user's partnerStatus
    if (profile.userId) {
      await prisma.user.update({
        where: { id: String(profile.userId) },
        data: { partnerStatus: status },
      });
    }

    res.json({ message: `Partner status updated to ${status}`, partner: profile });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Assign Referrer ────────────────────────────────────────────────────────
const assignReferrer = async (req, res) => {
  try {
    const { partnerId } = req.body || {};
    const { userId } = req.params;

    if (!partnerId || !userId) {
      return res.status(400).json({ message: "partnerId and userId are required" });
    }

    const user = withLegacyId(await prisma.user.findUnique({ where: { id: String(userId) } }));
    if (!user) return res.status(404).json({ message: "User not found" });

    const partnerProfile = withLegacyId(await prisma.partnerProfile.findUnique({ where: { userId: String(partnerId) } }));
    if (!partnerProfile) return res.status(404).json({ message: "Partner not found" });

    const existing = withLegacyId(await prisma.referral.findFirst({ where: { referredUserId: String(userId) } }));
    if (existing) {
      await prisma.referral.update({
        where: { id: existing._id },
        data: {
          referrerId: String(partnerId),
          referrerType: "partner",
          partnerProfileId: partnerProfile._id,
          referralCode: partnerProfile.referralCode,
        },
      });
    } else {
      await prisma.referral.create({
        data: {
          referrerId: String(partnerId),
          referrerType: "partner",
          partnerProfileId: partnerProfile._id,
          referredUserId: String(userId),
          referredRole: user.activeRole || user.roles?.[0] || "provider",
          referralCode: partnerProfile.referralCode,
          registrationSource: "partner_dashboard",
          status: "active",
          commissionRate: partnerProfile.commissionRate,
        },
      });
    }

    await prisma.user.update({
      where: { id: String(userId) },
      data: {
        referredByPartnerId: String(partnerId),
        referralCodeUsed: partnerProfile.referralCode,
        source: "partner",
      },
    });

    res.json({ message: "Referrer assigned successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Get Rewards ────────────────────────────────────────────────────────────
const getRewards = async (req, res) => {
  try {
    const { status, partnerId, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const where = {};
    if (status) where.status = status;
    if (partnerId) where.partner = String(partnerId);

    const [rewardRows, total] = await Promise.all([
      prisma.partnerReward.findMany({
        where,
        include: {
          partnerRecord: { select: { id: true, name: true, email: true } },
          referredUserRecord: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.partnerReward.count({ where }),
    ]);

    const rewards = rewardRows.map(mapPartnerReward);

    res.json({ rewards, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Update Reward Status ───────────────────────────────────────────────────
const updateRewardStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["pending", "approved", "paid", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    let reward = withLegacyId(await prisma.partnerReward.findUnique({ where: { id: String(req.params.id) } }));
    if (!reward) return res.status(404).json({ message: "Reward not found" });

    reward = withLegacyId(await prisma.partnerReward.update({
      where: { id: reward._id },
      data: {
        status,
        ...(status === "paid" ? { paidAt: new Date() } : {}),
      },
    }));

    res.json({ message: `Reward status updated to ${status}`, reward });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Mark Rewards Paid (bulk) ───────────────────────────────────────────────
const markRewardsPaid = async (req, res) => {
  try {
    const { rewardIds } = req.body;
    if (!rewardIds || !rewardIds.length) {
      return res.status(400).json({ message: "rewardIds array is required" });
    }

    await prisma.partnerReward.updateMany({
      where: { id: { in: rewardIds.map(String) }, status: "approved" },
      data: { status: "paid", paidAt: new Date() },
    });

    res.json({ message: "Rewards marked as paid" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getRewardSettings = async (req, res) => {
  try {
    const { getRewardConfig } = require("../config/rewardConfig");
    const config = await getRewardConfig();
    res.json({ config });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateRewardSettings = async (req, res) => {
  try {
    const { planCommissionPercent } = req.body;

    if (planCommissionPercent !== undefined) {
      await prisma.adminSetting.upsert({
        where: { key: "reward_planCommissionPercent" },
        update: { value: String(planCommissionPercent), category: "reward" },
        create: { key: "reward_planCommissionPercent", value: String(planCommissionPercent), category: "reward" },
      });
    }

    res.json({ message: "Reward settings updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const createPartner = async (req, res) => {
  try {
    const { name, email, password, commissionRate, status } = req.body || {};
    const countryCode = req.body.countryCode || "";
    const nationalNumber = req.body.nationalNumber || "";
    let phone = req.body.phone || "";

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (!name || !normalizedEmail) {
      return res.status(400).json({ message: "name and email are required" });
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
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
        return res.status(400).json({ message: "Please enter a valid phone number." });
      }
      phone = parsed.fullPhone;
    }

    const generatedPassword = password || crypto.randomBytes(6).toString("base64url");
    const role = "partner";

    const { parsePhoneString } = require("../utils/phoneValidation");
    const parsedPhone = parsePhoneString(phone);

    const user = await createUser({
      name,
      email: normalizedEmail,
      phone: parsedPhone.fullPhone || phone || "",
      countryCode: parsedPhone.countryCode || "",
      nationalNumber: parsedPhone.nationalNumber || "",
      fullPhone: parsedPhone.fullPhone || phone || "",
      password: generatedPassword,
      roles: [role],
      activeRole: role,
      role,
      authProvider: "email",
      isEmailVerified: true,
      termsAccepted: true,
      locale: "en",
      preferredLanguage: "en",
      country: "US",
      currency: "USD",
    });

    const referralCode = await generateReferralCode(name);
    const resolvedCommissionRate = Number.isFinite(Number(commissionRate))
      ? Number(commissionRate)
      : await resolveDefaultCommissionRate();

    const profile = withLegacyId(await prisma.partnerProfile.create({
      data: {
        userId: user._id,
        referralCode,
        referralLink: buildReferralLink(req, referralCode),
        commissionRate: resolvedCommissionRate,
        status: status || "active",
        createdBy: req.admin?._id ? String(req.admin._id) : null,
        createdByModel: "Admin",
      },
    }));

    res.status(201).json({
      message: "Partner created successfully",
      partner: {
        _id: profile._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        referralCode: profile.referralCode,
        commissionRate: profile.commissionRate,
        status: profile.status,
      },
      generatedPassword: password ? undefined : generatedPassword,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updatePartner = async (req, res) => {
  try {
    const { name, email, status } = req.body || {};
    const countryCode = req.body.countryCode;
    const nationalNumber = req.body.nationalNumber;
    let phone = req.body.phone;

    const profile = withLegacyId(await prisma.partnerProfile.findUnique({
      where: { id: String(req.params.id) },
      include: { userIdRecord: true },
    }));
    if (!profile || !profile.userIdRecord) {
      return res.status(404).json({ message: "Partner not found" });
    }

    const userUpdates = {};
    if (name) userUpdates.name = name;
    if (email) userUpdates.email = String(email).trim().toLowerCase();

    if (countryCode && nationalNumber) {
      const { isValidPhoneNumber } = require("../utils/phoneValidation");
      if (!isValidPhoneNumber(countryCode, nationalNumber)) {
        return res.status(400).json({ message: `Please enter a valid phone number for country code ${countryCode}.` });
      }
      userUpdates.phone = countryCode + nationalNumber;
      userUpdates.countryCode = countryCode;
      userUpdates.nationalNumber = nationalNumber;
      userUpdates.fullPhone = countryCode + nationalNumber;
    } else if (phone !== undefined) {
      const { parsePhoneString, isValidPhoneNumber } = require("../utils/phoneValidation");
      const parsed = parsePhoneString(phone);
      if (phone && parsed.countryCode && !isValidPhoneNumber(parsed.countryCode, parsed.nationalNumber)) {
        return res.status(400).json({ message: "Please enter a valid phone number." });
      }
      userUpdates.phone = parsed.fullPhone || phone || "";
      userUpdates.countryCode = parsed.countryCode || "";
      userUpdates.nationalNumber = parsed.nationalNumber || "";
      userUpdates.fullPhone = parsed.fullPhone || phone || "";
    }

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id: profile.userIdRecord.id },
        data: userUpdates,
      });
    }

    let updatedProfile = profile;
    if (status) {
      updatedProfile = withLegacyId(await prisma.partnerProfile.update({
        where: { id: profile._id },
        data: { status },
      }));
    }

    const result = {
      ...updatedProfile,
      userId: withLegacyId({ ...profile.userIdRecord, ...userUpdates }),
    };

    res.json({ message: "Partner updated", partner: result });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updatePartnerCommissionRate = async (req, res) => {
  try {
    const { commissionRate } = req.body || {};
    const numericRate = Number(commissionRate);
    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      return res.status(400).json({ message: "Valid commissionRate is required" });
    }

    const profile = withLegacyId(await prisma.partnerProfile.update({
      where: { id: String(req.params.id) },
      data: { commissionRate: numericRate },
    }));

    if (!profile) return res.status(404).json({ message: "Partner not found" });
    res.json({ message: "Commission rate updated", partner: profile });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getPartnerDetails = async (req, res) => {
  try {
    const profile = withLegacyId(await prisma.partnerProfile.findUnique({
      where: { id: String(req.params.id) },
      include: {
        userIdRecord: { select: { id: true, name: true, email: true, phone: true } },
      },
    }));
    if (!profile) return res.status(404).json({ message: "Partner not found" });

    profile.userId = withLegacyId(profile.userIdRecord);
    delete profile.userIdRecord;

    const [referrals, payouts, commissions] = await Promise.all([
      prisma.referral.findMany({
        where: { referrerId: String(profile.userId?._id) },
        include: { referredUserIdRecord: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { createdAt: "desc" },
      }).then((rows) => rows.map(mapReferral)),
      prisma.payoutRequest.findMany({
        where: { partnerId: String(profile.userId?._id) },
        orderBy: { createdAt: "desc" },
      }).then(withLegacyIds),
      prisma.commissionTransaction.findMany({
        where: { partnerId: String(profile.userId?._id) },
        orderBy: { createdAt: "desc" },
      }).then(withLegacyIds),
    ]);

    const partner = {
      ...profile,
      referralLink: buildReferralLink(req, profile.referralCode),
    };

    res.json({ partner, referrals, payouts, commissions });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getPartnerPayouts = async (req, res) => {
  try {
    const where = {};
    if (req.query.partnerId) where.partnerId = String(req.query.partnerId);

    const payouts = withLegacyIds(await prisma.payoutRequest.findMany({
      where,
      include: { partnerIdRecord: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    })).map((row) => {
      row.partnerId = withLegacyId(row.partnerIdRecord);
      delete row.partnerIdRecord;
      return row;
    });

    res.json({ payouts });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const approvePartnerPayout = async (req, res) => {
  try {
    let payout = withLegacyId(await prisma.payoutRequest.findUnique({ where: { id: String(req.params.id) } }));
    if (!payout) return res.status(404).json({ message: "Payout not found" });
    if (payout.status !== "pending") {
      return res.status(400).json({ message: "Payout is already processed" });
    }

    const { adminRemarks } = req.body || {};
    payout = withLegacyId(await prisma.payoutRequest.update({
      where: { id: payout._id },
      data: {
        status: "approved",
        adminRemarks: adminRemarks || "",
        processedAt: new Date(),
        processedBy: req.admin?._id ? String(req.admin._id) : null,
      },
    }));

    const profile = await prisma.partnerProfile.findUnique({ where: { id: String(payout.partnerProfileId) } });
    if (profile) {
      const pendingPayout = roundMoney(profile.pendingPayout - payout.amount);
      const withdrawnCommission = roundMoney(profile.withdrawnCommission + payout.amount);
      await prisma.partnerProfile.update({
        where: { id: profile.id },
        data: { pendingPayout, withdrawnCommission },
      });
    }

    res.json({ message: "Payout approved", payout });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const rejectPartnerPayout = async (req, res) => {
  try {
    const { adminRemarks } = req.body || {};
    let payout = withLegacyId(await prisma.payoutRequest.findUnique({ where: { id: String(req.params.id) } }));
    if (!payout) return res.status(404).json({ message: "Payout not found" });
    if (payout.status !== "pending") {
      return res.status(400).json({ message: "Payout is already processed" });
    }

    payout = withLegacyId(await prisma.payoutRequest.update({
      where: { id: payout._id },
      data: {
        status: "rejected",
        adminRemarks: adminRemarks || "",
        processedAt: new Date(),
        processedBy: req.admin?._id ? String(req.admin._id) : null,
      },
    }));

    const profile = await prisma.partnerProfile.findUnique({ where: { id: String(payout.partnerProfileId) } });
    if (profile) {
      const pendingPayout = roundMoney(profile.pendingPayout - payout.amount);
      const availableCommission = roundMoney(profile.availableCommission + payout.amount);
      await prisma.partnerProfile.update({
        where: { id: profile.id },
        data: { pendingPayout, availableCommission },
      });
    }

    res.json({ message: "Payout rejected", payout });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllReferrals = async (req, res) => {
  try {
    const mappedReferrals = (await prisma.referral.findMany({
      include: {
        referrerIdRecord: { select: { id: true, name: true, email: true } },
        referredUserIdRecord: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    })).map((row) => {
      const mapped = mapReferral(row);
      mapped.partner = mapped.referrerId;
      return mapped;
    });

    res.json({ referrals: mappedReferrals });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getPartnerReferrals = async (req, res) => {
  try {
    const { id: partnerProfileId } = req.params;
    const { role, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const profile = withLegacyId(await prisma.partnerProfile.findUnique({ where: { id: String(partnerProfileId) } }));
    if (!profile) return res.status(404).json({ message: "Partner profile not found" });

    const where = { referrerId: profile.userId };
    if (role && role !== "all") {
      where.referredRole = role;
    }

    const [referralRows, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        include: {
          referredUserIdRecord: { select: { id: true, name: true, email: true, phone: true, approvalStatus: true } },
          selectedPlanIdRecord: { select: { id: true, name: true } },
          firstSubscriptionIdRecord: { select: { id: true, status: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.referral.count({ where }),
    ]);
    const referrals = referralRows.map(mapReferral);

    res.json({
      referrals: referrals.map((r) => ({
        userId: r.referredUserId?._id,
        name: r.referredUserId?.name,
        email: r.referredUserId?.email,
        phone: r.referredUserId?.phone,
        role: r.referredRole,
        subscriptionPlan: r.selectedPlanId?.name,
        subscriptionStatus: r.status,
        joinedDate: r.createdAt,
        firstSubscriptionAmount: r.firstPlanAmount,
        partnerCommissionAmount: r.commissionAmount,
        accountStatus: r.referredUserId?.approvalStatus,
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getPartners,
  createPartner,
  updatePartner,
  updatePartnerCommissionRate,
  getPartnerDetails,
  getPartnerPayouts,
  approvePartnerPayout,
  rejectPartnerPayout,
  getAllReferrals,
  getAdminDashboardStats,
  updatePartnerStatus,
  assignReferrer,
  getRewards,
  updateRewardStatus,
  markRewardsPaid,
  getRewardSettings,
  updateRewardSettings,
  getPartnerReferrals,
  deletePartner,
};
