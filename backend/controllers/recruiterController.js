const prisma = require('../config/prisma');
const {
  createResumeAccessLog,
  createVisitHistory,
  createWhatsappLog,
  listVisitHistory,
} = require('../services/auditPersistenceService');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');
const { prepareUserData } = require('../services/authPersistenceService');
const {
  ensureRecruiterProfile,
  findRecruiterProfileByUserId,
  saveRecruiterProfile,
  updateRecruiterProfile: updateRecruiterProfileByUser,
} = require('../services/recruiterCompanyPersistenceService');
const {
  findProviderProfileByIdOrUserId,
  findProviderProfileByUserId,
  saveProviderProfile,
} = require('../services/providerProfilePersistenceService');
const {
  createJob,
  findJobById: findJobRecordById,
  findOwnedJob,
  mapJobs,
  updateJob: updateJobRecord,
  updateOwnedJob,
} = require('../services/jobPersistenceService');
const {
  deleteApplicationForRecruiter,
  ensureCandidateLead,
  listCandidateLeads,
  listShortlistedCandidates: listShortlistedCandidateLeads,
  mapLead,
  mapApplications,
  removeShortlistedCandidate: removeShortlistedCandidateLead,
  updateApplicationForRecruiter,
} = require('../services/applicationPersistenceService');
const {
  createPayment,
  findActiveUserSubscription,
  findPlan,
  incrementSubscriptionContactsViewed,
  listPayments,
  listPlans,
} = require('../services/billingPersistenceService');
const { sendWhatsAppMessage } = require("../utils/messaging");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinary");
const {
  createNotification,
  notifyProvidersOfNewJob,
} = require("../services/notificationService");
const { findNotification } = require('../services/communicationPersistenceService');
const { generateJobDescription } = require("../services/aiAssistService");
const { enqueueJob } = require("../services/queueService");
const { JOB_QUEUES, JOB_NAMES } = require("../queues/jobNames");
const { getActiveSubscription } = require("../middleware/subscription");
const {
  assignPlanToUser,
  assignFreePlan,
} = require("./subscriptionController");
const {
  getCoordinatesFromText,
  upsertLocationRecord,
} = require("../services/locationService");
const {
  resolveGooglePlace,
  normalizeGooglePlace,
  classifyJobMobility,
  getMatchingStrategy,
  generateJobEmbedding,
} = require("../services/providerIntelligenceService");
const {
  rankProvidersForIntent,
} = require("../services/providerRankingService");
const {
  logBusinessEvent,
  logLeadEvent,
} = require("../services/eventLogService");
const {
  getProvidersByLocation,
  filterActiveSubscriptions,
  separateProviders,
  applyRotation,
  mergeFinalList,
} = require("../services/providerService");
const path = require("path");
const fs = require("fs");

const enabled = (name) => String(process.env[name] || '').toLowerCase() === 'true';

const buildRecruiterPlanSummary = async (userId) => {
  const subscription = await findActiveUserSubscription(userId, 'recruiter', true);

  if (!subscription || !subscription.planId)
    return { plan: null, remaining: 0, used: 0, limit: 0, unlockCreditsRemaining: 0, unlockCreditsTotal: 0, unlockCreditsUsed: 0 };

  const plan = subscription.planId;
  const limit = Number(plan.contactLimit || 0);
  const used = Number(subscription.usage?.contactsViewed || 0);
  const remaining = limit > 0 ? Math.max(0, limit - used) : 0;

  return {
    plan,
    remaining,
    used,
    limit,
    unlockCreditsRemaining: subscription.unlockCreditsRemaining || 0,
    unlockCreditsTotal: subscription.unlockCreditsTotal || 0,
    unlockCreditsUsed: subscription.unlockCreditsUsed || 0,
    expiryDate: subscription.expiryDate || subscription.endDate || null,
  };
};

const toCoordinate = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const ensureRecruiterMonthlyFreeQuota = async (profile) => {
  if (!profile) return;
  if (profile.currentPlan !== "free") return;

  const now = new Date();
  const needsReset =
    !profile.freeUnlockResetAt ||
    new Date(profile.freeUnlockResetAt).getTime() <= now.getTime();

  if (needsReset) {
    profile.unlocksRemaining = 2;
    profile.unlockPackSize = 2;
    profile.freeUnlockResetAt = new Date(now.getTime() + THIRTY_DAYS_MS);
    Object.assign(profile, await saveRecruiterProfile(profile));
  }
};

// @desc    Get recruiter dashboard
// @route   GET /api/recruiter/dashboard
const getDashboard = async (req, res) => {
  try {
    const recruiterId = String(req.user._id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let profile = req.recruiterProfile;
    if (!profile) {
      profile = await ensureRecruiterProfile(req.user._id, {
        freeViewResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        freeUnlockResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        unlocksRemaining: 2,
        unlockPackSize: 2,
      });
    }

    ensureRecruiterMonthlyFreeQuota(profile).catch((err) =>
      console.error("[getDashboard] background free quota:", err.message)
    );

    const [
      jobsRaw,
      recentUnlocksRaw,
      subData,
      jobsThisMonth,
      unlocksThisMonth,
      platformCompanyDetailsSetting,
    ] = await Promise.all([
      prisma.jobPost.findMany({
        where: { recruiter: recruiterId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.lead.findMany({
        where: { recruiter: recruiterId, isUnlocked: true },
        include: { providerRecord: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      getActiveSubscription(req.user._id, "recruiter"),
      prisma.jobPost.count({
        where: { recruiter: recruiterId, createdAt: { gte: startOfMonth } },
      }),
      prisma.lead.count({
        where: {
          recruiter: recruiterId,
          type: 'contact_unlock',
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.adminSetting.findUnique({
        where: { key: 'admin_company_details' },
      }),
    ]);

    const jobs = mapJobs(jobsRaw);
    const recentUnlocks = recentUnlocksRaw.map(mapLead);

    let { subscription, plan } = subData || {};
    if (!plan) {
      assignFreePlan(req.user._id, "recruiter").catch((err) =>
        console.error("[getDashboard] background assignFreePlan:", err.message)
      );
    }

    let totalApplicationsReceived = 0;
    if (jobs.length > 0) {
      totalApplicationsReceived = await prisma.application.count({
        where: { jobPost: { in: jobs.map((job) => String(job.id || job._id)) } },
      });
    }

    const remainingPostLimit = plan
      ? plan.jobPostLimit === -1
        ? "unlimited"
        : Math.max(0, plan.jobPostLimit - jobsThisMonth)
      : 0;
      
    const unlocksRemaining = plan
      ? plan.unlockCredits === -1
        ? "unlimited"
        : Math.max(0, plan.unlockCredits - unlocksThisMonth)
      : 0;

    const platformCompanyDetails = platformCompanyDetailsSetting ? platformCompanyDetailsSetting.value : null;

    res.json({
      profile: {
        ...profile,
        email: req.user.email || null,
        phone: req.user.phone || null,
        whatsappNumber: req.user.whatsappNumber || null,
        isWhatsappSameAsMobile: req.user.isWhatsappSameAsMobile !== false,
        displayName: profile.profileName || profile.companyName || req.user.name || "Recruiter",
        gstNumber: profile.gstNumber || '',
      },
      jobs,

      recentUnlocks,
      stats: {
        totalJobsPosted: profile.totalJobsPosted,
        totalApplicationsReceived,
        remainingPostLimit,
        subscriptionPlan: plan ? plan.name : "None",
        totalUnlocks: profile.totalUnlocks,
        freeProfileViews: profile.freeProfileViews,
        unlocksRemaining,
        boostJobsRemaining: profile.boostJobsRemaining || 0,
        boostDaysRemaining: profile.boostDaysRemaining || 0,
        currentPlan: plan ? plan.slug : profile.currentPlan,
        planStatus: subscription?.status || "inactive",
        planEndDate: subscription?.endDate || null,
        planPrice: plan ? plan.price : 0,
        jobPostLimit: plan ? plan.jobPostLimit : 0,
      },
      platformCompanyDetails
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update recruiter profile
// @route   PUT /api/recruiter/profile
const updateProfile = async (req, res) => {
  try {
    const {

      companyName,
      companyType,
      city,
      state,
      nearestLocation,
      latitude,
      longitude,
      description,
      skillsNeeded,
      profileName,
      companyLogo,
      businessType,
      companyWebsite,
      hiringLocation,
      contactPersonName,
      designation,
      bio,
      email,
      phone,
      isWhatsappSameAsMobile,
      whatsappNumber,
      countryCode,
      timezone,
      industry,
      companySize,
      foundedYear,
      careerPageSettings,
      gstNumber,
    } = req.body;

    let profile = await ensureRecruiterProfile(req.user._id, {
      freeViewResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      freeUnlockResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      unlocksRemaining: 2,
      unlockPackSize: 2,
    });

    if (companyName !== undefined) profile.companyName = companyName;
    if (companyType !== undefined) profile.companyType = companyType;
    if (gstNumber !== undefined) profile.gstNumber = gstNumber;
    if (city !== undefined) profile.city = city;
    if (state !== undefined) profile.state = state;
    if (typeof nearestLocation === "string")
      profile.nearestLocation = nearestLocation.trim();

    const nextLat = toCoordinate(latitude, -90, 90);
    const nextLng = toCoordinate(longitude, -180, 180);
    if (nextLat !== null && nextLng !== null) {
      profile.latitude = nextLat;
      profile.longitude = nextLng;
      profile.locationUpdatedAt = new Date();
      
      // Auto-populate location and locationData for geonames verified coordinates
      profile.location = {
        placeId: "",
        name: nearestLocation || city || "",
        formattedAddress: [city, state, countryCode].filter(Boolean).join(", "),
        city: city || "",
        state: state || "",
        country: countryCode || "",
        postalCode: "",
        latitude: nextLat,
        longitude: nextLng,
        source: "geonames",
      };
      profile.locationData = {
        latitude: nextLat,
        longitude: nextLng,
      };
    }

    if (req.body.location && typeof req.body.location === 'object') {
      const loc = req.body.location;
      profile.location = {
        placeId: loc.placeId || '',
        name: loc.name || '',
        formattedAddress: loc.formattedAddress || '',
        city: loc.city || '',
        state: loc.state || '',
        country: loc.country || '',
        postalCode: loc.postalCode || '',
        latitude: Number.isFinite(Number(loc.latitude)) ? Number(loc.latitude) : null,
        longitude: Number.isFinite(Number(loc.longitude)) ? Number(loc.longitude) : null,
        source: loc.source || 'google_places',
      };
      profile.locationData = loc;
      if (profile.location.city) profile.city = profile.location.city;
      if (profile.location.state) profile.state = profile.location.state;
      if (profile.location.name) profile.nearestLocation = profile.location.name;
      if (profile.location.latitude !== null) profile.latitude = profile.location.latitude;
      if (profile.location.longitude !== null) profile.longitude = profile.location.longitude;
      profile.locationUpdatedAt = new Date();
    }

    if (description !== undefined) profile.description = description;
    if (Array.isArray(skillsNeeded)) profile.skillsNeeded = skillsNeeded;
    if (profileName !== undefined) profile.profileName = profileName;
    if (companyLogo !== undefined) profile.companyLogo = companyLogo;
    if (businessType !== undefined) profile.businessType = businessType;
    if (hiringLocation !== undefined) profile.hiringLocation = hiringLocation;
    if (contactPersonName !== undefined) profile.contactPersonName = contactPersonName;
    if (designation !== undefined) profile.designation = designation;
    if (bio !== undefined) profile.bio = bio;
    if (countryCode !== undefined) profile.countryCode = countryCode;
    if (timezone !== undefined) profile.timezone = timezone;
    if (industry !== undefined) profile.industry = industry;
    if (companySize !== undefined) profile.companySize = companySize;
    if (foundedYear !== undefined) profile.foundedYear = foundedYear;
    if (careerPageSettings !== undefined) profile.careerPageSettings = careerPageSettings;

    const { normalizeWebsiteUrl } = require("../utils/websiteNormalizer");
    if (companyWebsite !== undefined) {
      try {
        profile.companyWebsite = normalizeWebsiteUrl(companyWebsite);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }

    if (req.body.name) {
      await prisma.user.update({
        where: { id: String(req.user._id) },
        data: { name: req.body.name },
      });
    }
    // Update profileName if name is provided and profileName is empty (fallback)
    if (req.body.name && !profile.profileName) {
      profile.profileName = req.body.name;
    }

    let userDoc = withLegacyId(await prisma.user.findUnique({
      where: { id: String(req.user._id) },
    }));

    if (email !== undefined) {
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (cleanEmail && cleanEmail !== userDoc.email) {
        const existingUser = await prisma.user.findFirst({
          where: { email: cleanEmail, NOT: { id: String(req.user._id) } },
          select: { id: true },
        });
        if (existingUser) {
          return res.status(400).json({ message: "Email is already in use by another account." });
        }
        userDoc.email = cleanEmail;
      } else if (!cleanEmail) {
        userDoc.email = null;
      }
    }

    const { parsePhoneString, isValidPhoneNumber } = require("../utils/phoneValidation");

    if (phone !== undefined) {
      const cleanPhone = String(phone || '').trim();
      if (cleanPhone && cleanPhone !== userDoc.phone) {
        const existingUser = await prisma.user.findFirst({
          where: { phone: cleanPhone, NOT: { id: String(req.user._id) } },
          select: { id: true },
        });
        if (existingUser) {
          return res.status(400).json({ message: "Phone number is already in use by another account." });
        }
        const parsedPhone = parsePhoneString(cleanPhone);
        userDoc.phone = parsedPhone.fullPhone || cleanPhone;
        userDoc.countryCode = parsedPhone.countryCode || "";
        userDoc.nationalNumber = parsedPhone.nationalNumber || "";
        userDoc.fullPhone = parsedPhone.fullPhone || cleanPhone;
      } else if (!cleanPhone) {
        userDoc.phone = null;
        userDoc.fullPhone = "";
        userDoc.countryCode = "";
        userDoc.nationalNumber = "";
      }
    }

    if (isWhatsappSameAsMobile !== undefined) {
      const isWhatsappSame = isWhatsappSameAsMobile === true || isWhatsappSameAsMobile === 'true';
      userDoc.isWhatsappSameAsMobile = isWhatsappSame;
      if (isWhatsappSame) {
        userDoc.whatsappNumber = userDoc.phone || "";
      } else if (whatsappNumber !== undefined) {
        const parsedWhatsapp = parsePhoneString(whatsappNumber);
        if (whatsappNumber && parsedWhatsapp.countryCode && !isValidPhoneNumber(parsedWhatsapp.countryCode, parsedWhatsapp.nationalNumber)) {
          return res.status(400).json({
            success: false,
            code: "INVALID_WHATSAPP",
            message: "Please enter a valid WhatsApp number.",
          });
        }
        userDoc.whatsappNumber = parsedWhatsapp.fullPhone || whatsappNumber || "";
      }
    }

    if (req.body.name) {
      userDoc.name = req.body.name;
    }
    if (req.body.avatar) {
      userDoc.avatar = req.body.avatar;
    }

    userDoc = withLegacyId(await prisma.user.update({
      where: { id: String(req.user._id) },
      data: await prepareUserData(userDoc),
    }));

    profile = await saveRecruiterProfile(profile);

    try {
      const { clearCachedSitemap } = require("../utils/sitemapCache");
      clearCachedSitemap();
    } catch (err) {
      console.error("[Sitemap Cache Error] Failed to clear sitemap cache on recruiter profile update:", err);
    }

    if (profile.city) {
      let lat = profile.latitude;
      let lon = profile.longitude;

      if (lat === null || lon === null) {
        const geocoded = await getCoordinatesFromText(
          [profile.city, profile.state].filter(Boolean).join(", "),
        );
        if (geocoded) {
          lat = geocoded.lat;
          lon = geocoded.lon;
          profile.latitude = lat;
          profile.longitude = lon;
          profile.locationUpdatedAt = new Date();
          profile = await saveRecruiterProfile(profile);
        }
      }

      if (lat !== null && lon !== null) {
        await upsertLocationRecord({
          name: profile.nearestLocation || profile.city,
          latitude: lat,
          longitude: lon,
          type: "recruiter",
        });
      }
    }

    res.json({
      ...profile,
      email: userDoc.email || null,
      phone: userDoc.phone || null,
      whatsappNumber: userDoc.whatsappNumber || null,
      isWhatsappSameAsMobile: userDoc.isWhatsappSameAsMobile,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Escape special regex characters in user input
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findProviderProfileByParam = async (providerParam) => {
  return findProviderProfileByIdOrUserId(providerParam, {
    userSelect: {
      id: true, name: true, email: true, phone: true, avatar: true,
      profilePhoto: true, whatsappNumber: true, isWhatsappSameAsMobile: true,
      whatsappAlerts: true,
    },
  });
};

// @desc    Search providers
// @route   GET /api/recruiter/search?skill=&city=&rating=&experience=&verified=&page=&limit=
const searchProviders = async (req, res) => {
  try {
    if (!enabled('ENABLE_RECRUITER_MATCHING')) {
      return res.status(503).json({
        message: 'Recruiter matching is temporarily disabled',
        code: 'RECRUITER_MATCHING_DISABLED',
      });
    }
    const ProviderProfile = require("../models/ProviderProfile");
    const RotationPool = require("../models/RotationPool");
    const {
      skill,
      category,
      city,
      tier,
      rating,
      experience,
      verified,
      lat,
      lon,
      radius,
      page = 1,
      limit = 20,
    } = req.query;

    const skillTerm = String(skill || category || "").trim();
    const cityTerm = String(city || "").trim();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const featuredLimit = Math.max(
      1,
      parseInt(process.env.FEATURED_LIMIT || 5, 10),
    );
    const rotationIntervalSec = Math.max(
      1,
      parseInt(process.env.ROTATION_INTERVAL_SEC || 60, 10),
    );
    const radiusKm = Number.isFinite(Number(radius))
      ? Number(radius)
      : Number(process.env.SEARCH_RADIUS_KM || 50);

    const hasLat = lat !== undefined;
    const hasLon = lon !== undefined;
    const latNum = hasLat ? Number(lat) : null;
    const lonNum = hasLon ? Number(lon) : null;

    if ((hasLat && !hasLon) || (!hasLat && hasLon)) {
      return res
        .status(400)
        .json({ message: "Both lat and lon are required for geo search." });
    }
    if (hasLat && hasLon) {
      if (
        !Number.isFinite(latNum) ||
        !Number.isFinite(lonNum) ||
        latNum < -90 ||
        latNum > 90 ||
        lonNum < -180 ||
        lonNum > 180
      ) {
        return res.status(400).json({ message: "Invalid lat/lon values." });
      }
    }

    const filter = {};
    // Skill: substring match (e.g. "Tutor" matches "Online tutor")
    if (skillTerm)
      filter.skills = { $regex: escapeRegex(skillTerm), $options: "i" };
    if (cityTerm) {
      // City: prefix-tolerant regex – trims 1 trailing char to absorb typos like "Kolkataa" → "Kolkata"
      const cityQuery = cityTerm;
      const cityPrefix =
        cityQuery.length > 4
          ? cityQuery.slice(0, cityQuery.length - 1)
          : cityQuery;
      const cityRegex = { $regex: "^" + escapeRegex(cityPrefix), $options: "i" };
      
      filter.$or = [
        { city: cityRegex },
        { nearestLocation: cityRegex },
        { "location.city": cityRegex },
        { "location.state": cityRegex },
        { "locationData.city": cityRegex },
        { "locationData.state": cityRegex },
        { "serviceLocationData.city": cityRegex },
        { "serviceLocationData.state": cityRegex }
      ];
    }
    if (tier) filter.tier = tier;
    if (rating) filter.rating = { $gte: parseFloat(rating) };
    if (experience)
      filter.experience = { $regex: escapeRegex(experience), $options: "i" };
    if (verified === "true") filter.isVerified = true;
    filter.isApproved = true;

    const sortConfig = { boostWeight: -1, rating: -1, createdAt: -1 };
    let candidates = await ProviderProfile.find(filter)
      .populate("user", "name avatar email phone whatsappNumber isWhatsappSameAsMobile whatsappAlerts")
      .sort(sortConfig)
      .lean();

    // 2-pass fallback: if skill+city combo returns 0, retry with skill only
    // (city may have a typo that prefix-regex couldn't absorb)
    if (candidates.length === 0 && skillTerm && cityTerm) {
      const skillOnlyFilter = {
        isApproved: true,
        skills: { $regex: escapeRegex(skillTerm), $options: "i" },
      };
      if (tier) skillOnlyFilter.tier = tier;
      if (rating) skillOnlyFilter.rating = { $gte: parseFloat(rating) };
      if (experience)
        skillOnlyFilter.experience = {
          $regex: escapeRegex(experience),
          $options: "i",
        };
      if (verified === "true") skillOnlyFilter.isVerified = true;
      candidates = await ProviderProfile.find(skillOnlyFilter)
        .populate("user", "name avatar email phone whatsappNumber isWhatsappSameAsMobile whatsappAlerts")
        .sort(sortConfig)
        .lean();
    }

    // Geo-aware filtering (optional; if lat/lon provided)
    if (hasLat && hasLon) {
      candidates = await getProvidersByLocation(
        latNum,
        lonNum,
        radiusKm,
        candidates,
      );
    }

    // Mask resumeUrl and resumeApproval if recruiter has no paid plan
    let hasPaidPlan = false;
    if (req.user) {
      const { getActiveSubscription } = require("../middleware/subscription");
      const { plan } = await getActiveSubscription(req.user._id, "recruiter");
      hasPaidPlan = !!(plan && plan.price > 0 && plan.slug !== "free");
    }

    if (!hasPaidPlan) {
      candidates.forEach((c) => {
        c.resumeUrl = "";
        if (c.resumeApproval) {
          c.resumeApproval = {
            ...c.resumeApproval,
            status: "none",
            pendingUrl: "",
            approvedUrl: "",
          };
        }
      });
    } else {
      candidates.forEach((c) => {
        c.resumeUrl = c.resumeUrl || c.resumeApproval?.pendingUrl || c.resumeApproval?.approvedUrl || "";
      });
    }

    const activeSubscriptionProviders = filterActiveSubscriptions(candidates);
    const { featuredProviders: activeFeatured } = separateProviders(
      activeSubscriptionProviders,
    );
    const rotatedFeatured = applyRotation(
      activeFeatured,
      rotationIntervalSec,
      featuredLimit,
    );
    const featuredIds = new Set(
      rotatedFeatured
        .map((provider) => provider._id?.toString())
        .filter(Boolean),
    );

    const normalProviders = candidates.filter(
      (provider) => !featuredIds.has(provider._id?.toString()),
    );
    const combinedProviders = mergeFinalList(rotatedFeatured, normalProviders);

    const skip = (pageNum - 1) * limitNum;
    const featured = rotatedFeatured;
    const normal = normalProviders.slice(skip, skip + limitNum);
    const combined = combinedProviders.slice(skip, skip + limitNum);
    const total = combinedProviders.length;

    // Keep legacy rotation key for backward compatibility.
    const rotationProviders = featured;

    if (skillTerm || cityTerm) {
      try {
        await RotationPool.findOneAndUpdate(
          {
            skill: (skillTerm || "any").toLowerCase(),
            city: (cityTerm || "any").toLowerCase(),
          },
          {
            $setOnInsert: {
              skill: (skillTerm || "any").toLowerCase(),
              city: (cityTerm || "any").toLowerCase(),
              maxPoolSize: featuredLimit,
              rotationInterval: rotationIntervalSec,
            },
            $set: {
              rotationInterval: rotationIntervalSec,
              maxPoolSize: featuredLimit,
            },
          },
          { upsert: true, new: false },
        );
      } catch (poolErr) {
        console.warn("Rotation pool update failed:", poolErr.message);
      }
    }

    // Track recruiter free view + save search history
    if (req.user && req.user.activeRole === "recruiter") {
      try {
        const recruiterProfile = await findRecruiterProfileByUserId(req.user._id);
        if (recruiterProfile) {
          await prisma.recruiterProfile.update({
            where: { user: String(req.user._id) },
            data: { freeProfileViews: { increment: 1 } },
          });
        }
      } catch (profileErr) {
        console.warn(
          "Recruiter search counters update failed:",
          profileErr.message,
        );
      }

      // Save search history
      if (skillTerm || cityTerm) {
        try {
          await createVisitHistory({
            user: req.user._id,
            type: "search",
            searchQuery: [skillTerm, cityTerm].filter(Boolean).join(" in "),
            searchCity: cityTerm || "",
            searchSkill: skillTerm || "",
          });
        } catch (historyErr) {
          console.warn(
            "Recruiter search history write failed:",
            historyErr.message,
          );
        }
      }
    }

    const { isRecruiterSubscribed } = require("../utils/subscriptionHelper");
    const { lockCandidateList } = require("../utils/maskCandidateData");

    const recruiterProfileObj = await findRecruiterProfileByUserId(req.user._id);
    const isSubscribed = isRecruiterSubscribed(recruiterProfileObj);

    const finalRotation = lockCandidateList(rotationProviders, isSubscribed);
    const finalFeatured = lockCandidateList(featured, isSubscribed);
    const finalNormal = lockCandidateList(normal, isSubscribed);
    const finalCombined = lockCandidateList(combined, isSubscribed);

    res.json({
      rotation: finalRotation,
      featured: finalFeatured,
      normal: finalNormal,
      combined: finalCombined,
      providers: finalCombined,
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

// @desc    View provider profile (with free limit check)
// @route   GET /api/recruiter/view-provider/:id
const viewProvider = async (req, res) => {
  try {
    const recruiterProfile = await findRecruiterProfileByUserId(req.user._id);
    if (!recruiterProfile)
      return res.status(404).json({ message: "Profile not found" });

    const provider = await findProviderProfileByParam(req.params.id);
    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    if (!provider.user) {
      return res.status(404).json({ message: "Candidate user details are missing or have been removed" });
    }

    // Check if candidate is already saved or unlocked
    const isSavedOrUnlocked = await prisma.lead.findFirst({
      where: {
        recruiter: String(req.user._id),
        provider: String(provider.user._id),
        type: { in: ['saved_candidate', 'contact_unlock'] },
      },
      select: { id: true },
    });

    console.log('[viewProvider] recruiter:', req.user._id);
    console.log('[viewProvider] provider user:', provider.user._id);
    console.log('[viewProvider] isSavedOrUnlocked:', isSavedOrUnlocked);

    // Check specific unlock if needed for contact info later
    const existingUnlock = withLegacyId(await prisma.lead.findFirst({
      where: {
        provider: String(provider.user._id),
        recruiter: String(req.user._id),
        type: "contact_unlock",
        isUnlocked: true,
      },
    }));

    await ensureRecruiterMonthlyFreeQuota(recruiterProfile);

    // Limit check removed as requested

    // Increment view count
    provider.profileViews = Number(provider.profileViews || 0) + 1;

    // Save visit history
    await createVisitHistory({
      user: req.user._id,
      visitedUser: provider.user._id,
      visitedProfile: provider._id,
      type: "profile_view",
    });

    // Create a profile_view lead
    await prisma.lead.create({
      data: {
        provider: String(provider.user._id),
        recruiter: String(req.user._id),
        type: "profile_view",
      },
    });

    // Optional rate-limit: emit profile view notification at most once per recruiter/provider pair per 6 hours.
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recentProfileViewedNotification = await findNotification({
      userId: String(provider.user._id),
      type: "PROFILE_VIEWED",
      data: { path: ['recruiterId'], equals: String(req.user._id) },
      createdAt: { gte: sixHoursAgo },
    });

    if (!recentProfileViewedNotification) {
      await createNotification({
        userId: provider.user._id,
        type: "PROFILE_VIEWED",
        title: "Profile Viewed",
        message: "Your profile was viewed by a recruiter",
        data: {
          recruiterId: req.user._id,
          recruiterName: req.user.name,
          providerProfileId: provider._id,
        },
      });
    }

    provider.leadsReceived = Number(provider.leadsReceived || 0) + 1;
    Object.assign(provider, await saveProviderProfile(provider));

    const reviews = (await prisma.review.findMany({
      where: { provider: String(provider.user._id) },
      include: { recruiterRecord: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })).map((row) => {
      const { recruiterRecord, ...review } = row;
      return { ...withLegacyId(review), recruiter: withLegacyId(recruiterRecord) };
    });

    // Hide contact info if not unlocked
    const isWhatsappAlertsOn = provider.whatsappAlerts !== false && provider.user?.whatsappAlerts !== false;
    const contactInfo = existingUnlock
      ? {
          phone: provider.user.phone,
          email: provider.user.email,
          whatsappNumber: isWhatsappAlertsOn
            ? (provider.user.isWhatsappSameAsMobile ? provider.user.phone : (provider.user.whatsappNumber || provider.user.phone))
            : "",
        }
      : null;

    const { plan } = await getActiveSubscription(req.user._id, "recruiter");
    const isAdmin = req.user && (req.user.activeRole === "admin" || req.user.role === "admin");
    const hasPaidPlan = (plan && plan.price > 0 && plan.slug !== "free") || isAdmin;

    const resumeUrlValue = provider.resumeUrl || provider.resumeApproval?.pendingUrl || provider.resumeApproval?.approvedUrl || "";
    const hasResume = Boolean(resumeUrlValue);

    let providerData = { ...provider };
    providerData.hasResume = hasResume;
    if (!hasPaidPlan && !existingUnlock) {
      providerData.resumeUrl = "";
      if (providerData.resumeApproval) {
        providerData.resumeApproval = {
          ...providerData.resumeApproval,
          status: "none",
          pendingUrl: "",
          approvedUrl: "",
        };
      }
    } else {
      if (resumeUrlValue && enabled('ENABLE_EXTERNAL_PROFILE_ASSETS')) {
        const path = require("path");
        const { generateSignedResumeUrl } = require("../services/r2Service");

        // Extract R2 object key from URL path
        let objectKey = path.basename(resumeUrlValue);
        if (objectKey.includes("?")) {
          objectKey = objectKey.split("?")[0];
        }

        try {
          const signedUrl = await generateSignedResumeUrl(objectKey);
          providerData.resumeUrl = signedUrl;

          // Log resume access for viewProvider
          await createResumeAccessLog({
            recruiterId: req.user._id,
            candidateId: provider.user._id,
            resumeObjectKey: objectKey,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
            ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch (r2Err) {
          console.error("[viewProvider R2 Sign Failed]:", r2Err.message);
          providerData.resumeUrl = resumeUrlValue;
        }
      } else {
        providerData.resumeUrl = resumeUrlValue || "";
      }
    }

    const { isRecruiterSubscribed } = require("../utils/subscriptionHelper");
    const { lockCandidate } = require("../utils/maskCandidateData");
    const isSubscribed = isRecruiterSubscribed(recruiterProfile);
    const isSubscribedOrUnlocked = isSubscribed || !!existingUnlock;
    const finalProviderData = lockCandidate(providerData, isSubscribedOrUnlocked);

    const allLeads = withLegacyIds(await prisma.lead.findMany({
      where: {
        recruiter: String(req.user._id),
        provider: String(provider.user._id),
      },
    }));
    
    const allNotes = allLeads.flatMap(l => l.notes || []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const allTags = [...new Set(allLeads.flatMap(l => l.tags || []))];

    res.json({
      provider: finalProviderData,
      reviews,
      isUnlocked: !!existingUnlock,
      contactInfo: isSubscribedOrUnlocked ? contactInfo : null,
      viewsRemaining: "unlimited",
      notes: allNotes,
      tags: allTags,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Unlock provider contact (requires plan/credits or payment)
// @route   POST /api/recruiter/unlock/:providerId
const unlockContact = async (req, res) => {
  try {
    const recruiterProfile = await findRecruiterProfileByUserId(req.user._id);
    if (!recruiterProfile)
      return res.status(404).json({ message: "Profile not found" });

    const providerProfile = await findProviderProfileByParam(
      req.params.providerId,
    );
    if (!providerProfile)
      return res.status(404).json({ message: "Provider not found" });

    // Check if already unlocked
    const existing = withLegacyId(await prisma.lead.findFirst({
      where: {
        provider: String(providerProfile.user._id),
        recruiter: String(req.user._id),
        type: "contact_unlock",
        isUnlocked: true,
      },
    }));
    if (existing) {
      const isWhatsappAlertsOn = providerProfile.whatsappAlerts !== false && providerProfile.user?.whatsappAlerts !== false;
      const whatsappPhone = isWhatsappAlertsOn
        ? (providerProfile.user.isWhatsappSameAsMobile ? providerProfile.user.phone : (providerProfile.user.whatsappNumber || providerProfile.user.phone))
        : "";
      return res.json({
        message: "Contact already unlocked",
        alreadyUnlocked: true,
        contact: {
          name: providerProfile.user.name,
          email: providerProfile.user.email,
          phone: providerProfile.user.phone,
          whatsappNumber: whatsappPhone,
        },
        phone: providerProfile.user.phone,
        whatsapp: whatsappPhone,
        whatsappAlerts: isWhatsappAlertsOn,
      });
    }

    // Create payment record for unlock
    const payment = await createPayment({
      user: req.user._id,
      amount: 0,
      type: "unlock_pack",
      status: "completed",
      transactionId: `UNL_${Date.now()}`,
      metadata: {
        providerId: providerProfile._id.toString(),
        providerName: providerProfile.user.name,
      },
    });

    // Create lead
    let lead = withLegacyId(await prisma.lead.create({
      data: {
        provider: String(providerProfile.user._id),
        recruiter: String(req.user._id),
        type: "contact_unlock",
        isUnlocked: true,
        unlockPaymentId: payment.transactionId,
      },
    }));

    // Update stats
    providerProfile.contactsUnlocked = Number(providerProfile.contactsUnlocked || 0) + 1;
    providerProfile.leadsReceived = Number(providerProfile.leadsReceived || 0) + 1;
    Object.assign(providerProfile, await saveProviderProfile(providerProfile));


    recruiterProfile.totalUnlocks = Number(recruiterProfile.totalUnlocks || 0) + 1;
    Object.assign(recruiterProfile, await saveRecruiterProfile(recruiterProfile));

    // Save visit history
    await createVisitHistory({
      user: req.user._id,
      visitedUser: providerProfile.user._id,
      visitedProfile: providerProfile._id,
      type: "contact_unlock",
    });

    // WhatsApp notification to provider
    const providerPhone =
      providerProfile.user.isWhatsappSameAsMobile ? providerProfile.user.phone : (providerProfile.user.whatsappNumber || providerProfile.user.phone);
    if (enabled('ENABLE_COMMUNICATION_PROVIDERS')
      && providerProfile.whatsappAlerts && providerPhone) {
      try {
        await sendWhatsAppMessage(providerPhone, "new_lead", {
          recruiterName: req.user.name,
        });
        // Log WhatsApp notification
        await createWhatsappLog({
          user: providerProfile.user._id,
          phone: providerPhone,
          templateName: "new_lead",
          message: `New contact unlock from ${req.user.name}`,
          status: "sent",
          triggerEvent: "contact_unlock",
          metadata: { recruiterId: req.user._id, leadId: lead._id },
        });
        lead = withLegacyId(await prisma.lead.update({
          where: { id: lead.id },
          data: { notifiedViaWhatsapp: true },
        }));
      } catch (whatsErr) {
        console.error("[WhatsApp notify error]", whatsErr.message);
      }
    }

    // In-app notifications to provider
    await createNotification({
      userId: providerProfile.user._id,
      type: "CONTACT_UNLOCKED",
      title: "Contact Unlocked",
      message: "Your profile was unlocked by a recruiter",
      data: {
        recruiterId: req.user._id,
        recruiterName: req.user.name,
        leadId: lead._id,
      },
    });

    await createNotification({
      userId: providerProfile.user._id,
      type: "NEW_LEAD",
      title: "New Lead",
      message: "You have a new lead",
      data: {
        recruiterId: req.user._id,
        recruiterName: req.user.name,
        leadId: lead._id,
        source: "contact_unlock",
      },
    });

    const isWhatsappAlertsOn = providerProfile.whatsappAlerts !== false && providerProfile.user?.whatsappAlerts !== false;
    const whatsappPhone = isWhatsappAlertsOn
      ? (providerProfile.user.isWhatsappSameAsMobile ? providerProfile.user.phone : (providerProfile.user.whatsappNumber || providerProfile.user.phone))
      : "";

    res.json({
      message: "Contact unlocked successfully",
      contact: {
        name: providerProfile.user.name,
        email: providerProfile.user.email,
        phone: providerProfile.user.phone,
        whatsappNumber: whatsappPhone,
      },
      phone: providerProfile.user.phone,
      whatsapp: whatsappPhone,
      whatsappAlerts: isWhatsappAlertsOn,
      lead,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Post a job
// @route   POST /api/recruiter/jobs
// Note: checkPostLimit middleware validates subscription limits before this runs
const postJob = async (req, res) => {
  try {
    const {
      title,
      skill,
      skillsTags,
      speciality,
      city,
      locality,
      budgetMin,
      budgetMax,
      budgetType,
      category,
      jobType,
      currency,
      salaryPeriod,
      status,
      expiresAt,
      description,
      requirements,
      urgency,
      scheduleType,
      timeOfDay,
      workMode,
      relocationSupport,
      latitude,
      longitude,
      aiGenerated,
    } = req.body;

    const allSkills = Array.isArray(skillsTags) && skillsTags.length > 0
      ? skillsTags
      : (skill ? [skill] : []);

    if (!title || !allSkills.length || !city || !description) {
      return res
        .status(400)
        .json({ message: "Title, at least one skill, city and description are required" });
    }

    const normalizedSkillLevel = 'skilled'; // tier field removed from UI
    const normalizedSpeciality = String(speciality || allSkills[0] || '').trim();
    const selectedMobility = classifyJobMobility(normalizedSpeciality || skill, normalizedSkillLevel);
    const matchingStrategy = getMatchingStrategy({
      workMode: String(workMode || '').trim(),
      speciality: normalizedSpeciality || skill,
      requiredSkillLevel: normalizedSkillLevel,
    });

    const latNum = Number.isFinite(Number(latitude)) ? Number(latitude) : null;
    const lngNum = Number.isFinite(Number(longitude))
      ? Number(longitude)
      : null;
    let locationObj = null;
    let finalLat = latNum;
    let finalLng = lngNum;
    let finalCity = city;
    let finalLocality = locality;

    if (req.body.location && typeof req.body.location === 'object') {
      const resolved = await resolveGooglePlace(req.body.location);
      const normalized = resolved || normalizeGooglePlace(req.body.location, req.body.location.formattedAddress || req.body.location.name || city);
      if (!normalized || !normalized.googlePlaceId || !Number.isFinite(Number(normalized.lat)) || !Number.isFinite(Number(normalized.lng))) {
        return res.status(400).json({ message: 'Job location must be selected from Google Places.' });
      }

      locationObj = {
        placeId: String(normalized.googlePlaceId || '').trim(),
        name: String(normalized.locality || normalized.city || normalized.formattedAddress || '').trim(),
        formattedAddress: String(normalized.formattedAddress || '').trim(),
        city: String(normalized.city || '').trim(),
        state: String(normalized.state || '').trim(),
        country: String(normalized.country || '').trim(),
        postalCode: String(normalized.postalCode || '').trim(),
        latitude: Number.isFinite(Number(normalized.lat)) ? Number(normalized.lat) : null,
        longitude: Number.isFinite(Number(normalized.lng)) ? Number(normalized.lng) : null,
        source: 'google_places',
      };
      finalCity = normalized.city || finalCity;
      finalLocality = normalized.locality || normalized.city || finalLocality;
      finalLat = locationObj.latitude;
      finalLng = locationObj.longitude;
    }

    if (!locationObj && city) {
      const resolved = await resolveGooglePlace(city);
      if (resolved) {
        locationObj = {
          placeId: String(resolved.googlePlaceId || '').trim(),
          name: String(resolved.locality || resolved.city || resolved.formattedAddress || '').trim(),
          formattedAddress: String(resolved.formattedAddress || '').trim(),
          city: String(resolved.city || '').trim(),
          state: String(resolved.state || '').trim(),
          country: String(resolved.country || '').trim(),
          postalCode: String(resolved.postalCode || '').trim(),
          latitude: Number.isFinite(Number(resolved.lat)) ? Number(resolved.lat) : null,
          longitude: Number.isFinite(Number(resolved.lng)) ? Number(resolved.lng) : null,
          source: 'google_places',
        };
        finalCity = resolved.city || finalCity;
        finalLocality = resolved.locality || resolved.city || finalLocality;
        finalLat = locationObj.latitude;
        finalLng = locationObj.longitude;
      }
    }

    const finalGeoPoint =
      finalLat !== null && finalLng !== null
        ? {
            type: "Point",
            coordinates: [finalLng, finalLat],
          }
        : null;

    const embeddingText = generateJobEmbedding({
      requiredSkillLevel: normalizedSkillLevel,
      speciality: normalizedSpeciality || skill,
      skill,
      workMode: workMode || (selectedMobility === 'remote/global' ? 'remote' : 'onsite'),
      description,
      location: locationObj || { city: finalCity, formattedAddress: city },
      budget: {
        perHour: Number(budgetMin || 0),
        perDay: Number(budgetMax || 0),
        currency: 'INR',
      },
      tags: [urgency, scheduleType, timeOfDay].filter(Boolean),
    });

    const recruiterProfile = await findRecruiterProfileByUserId(req.user._id);
    const companyName = recruiterProfile?.companyName || '';
    const companyInfo = recruiterProfile?.description || '';

    const job = await createJob({
      recruiter: req.user._id,
      title,
      skill,
      skillsTags: allSkills,
      requiredSkillLevel: normalizedSkillLevel,
      speciality: normalizedSpeciality || skill,
      city: finalCity,
      locality: finalLocality,
      workMode: workMode || (selectedMobility === 'remote/global' ? 'remote' : 'onsite'),
      relocationSupport: Boolean(relocationSupport),
      urgency: urgency || "normal",
      scheduleType: scheduleType || "flexible",
      timeOfDay: timeOfDay || "any",
      geoPoint: finalGeoPoint,
      budgetMin: budgetMin || 0,
      budgetMax: budgetMax || 0,
      budgetType: budgetType || "negotiable",
      category: category || '',
      jobType: jobType || 'full_time',
      currency: currency || 'INR',
      salaryPeriod: salaryPeriod || 'yearly',
      status: status || 'active',
      latitude: finalLat,
      longitude: finalLng,
      cityName: finalCity,
      countryCode: locationObj?.country || '',
      minBudget: budgetMin || 0,
      maxBudget: budgetMax || 0,
      pricingType: budgetType === 'hourly' || budgetType === 'monthly' || budgetType === 'fixed' ? budgetType : 'fixed',
      isActive: !['closed', 'expired', 'deleted'].includes(status || 'active'),
      description,
      companyName,
      companyInfo,
      requirements: requirements || [],
      location: locationObj,
      locationData: locationObj,
      jobLocationData: locationObj,
      embeddingText,
      matchRadiusUsed: matchingStrategy === 'opportunity_first' ? 0 : 50,
      aiGenerated: {
        isGenerated: !!aiGenerated,
        source: aiGenerated ? "recruiter_ai_helper" : "",
        model: (aiGenerated && typeof aiGenerated === "object") ? aiGenerated.model || "" : "",
        generatedAt: aiGenerated ? new Date() : null,
        confidence:
          (aiGenerated && typeof aiGenerated === "object") &&
          Number.isFinite(Number(aiGenerated.confidence))
            ? Number(aiGenerated.confidence)
            : 0,
      },
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });


    // Update recruiter stats
    await prisma.recruiterProfile.updateMany({
      where: { user: String(req.user._id) },
      data: { totalJobsPosted: { increment: 1 } },
    });

    const distributionResult = await enqueueJob({
      queueName: JOB_QUEUES.LEADS,
      jobName: JOB_NAMES.AUTO_LEAD_DISTRIBUTION,
      payload: {
        recruiterId: String(req.user._id),
        jobId: String(job._id),
        limit: 5,
        intent: {
          extractedSkill: allSkills[0] || '',
          skillsTags: allSkills,
          extractedCity: city,
          extractedLocality: locality || "",
          extractedUrgency: urgency || "normal",
          extractedBudgetMin: Number(budgetMin || 0),
          extractedBudgetMax: Number(budgetMax || 0),
          extractedShiftType: scheduleType || "",
          extractedTimeOfDay: timeOfDay || "",
        },
        options: {
          lat: latNum,
          lng: lngNum,
          sortBy: "match",
          limit: 20,
          page: 1,
        },
      },
      relatedEntityType: "job",
      relatedEntityId: String(job._id),
      idempotencyKey: `job-distribution:${job._id}`,
    });

    const selectedProviders = Array.isArray(
      distributionResult?.result?.selectedProviders,
    )
      ? distributionResult.result.selectedProviders
      : [];


    try {
      const { clearCachedSitemap } = require("../utils/sitemapCache");
      clearCachedSitemap();
      
      // Notify Google Indexing API
      const indexingService = require('../services/indexingService');
      const slug = (job.title || job.skill || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const jobUrl = `https://www.lucohire.com/jobs/${slug}-${job._id}`;
      indexingService.notifyGoogle(jobUrl, 'URL_UPDATED').catch(e => console.error('[Indexing] notify failed:', e));
    } catch (err) {
      console.error("[Sitemap Cache Error] Failed to clear sitemap cache on job post:", err);
    }

    await enqueueJob({
      queueName: JOB_QUEUES.AI,
      jobName: JOB_NAMES.JOB_EMBEDDING_REFRESH,
      payload: { jobId: String(job._id) },
      relatedEntityType: "job",
      relatedEntityId: String(job._id),
      idempotencyKey: `job-embedding:${job._id}`,
    });

    await logBusinessEvent({
      taskType: "job_posted",
      relatedEntityType: "job",
      relatedEntityId: job._id,
      payload: {
        recruiterId: req.user._id,
        skill,
        city,
      },
      result: {
        matchedCount: selectedProviders.length,
        queueMode: distributionResult.mode,
      },
      status: "success",
    });

    res.status(201).json({
      message: "Job posted successfully",
      job,
      matchedCount: selectedProviders.length,
      leadDistribution: {
        mode: distributionResult.mode,
        status: distributionResult.status || "queued",
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Generate AI-assisted job description
// @route   POST /api/recruiter/ai/job-description
const generateAIJobDescription = async (req, res) => {
  try {
    const { prompt, skill, city, budgetMin, budgetMax, budgetType } = req.body;

    const aiResult = await generateJobDescription(
      {
        prompt,
        skill,
        city,
        budgetMin,
        budgetMax,
        budgetType,
      },
      { userId: req.user._id, role: "recruiter" },
    );

    await logBusinessEvent({
      taskType: "ai_job_description",
      relatedEntityType: "recruiter",
      relatedEntityId: req.user._id,
      payload: { promptLength: String(prompt || "").length },
      result: { status: aiResult.status },
      status: "success",
    });

    return res.json({
      title: aiResult.output.title,
      fullDescription: aiResult.output.fullDescription,
      duties: aiResult.output.duties || [],
      skills: aiResult.output.skills || [],
      city: aiResult.output.city || "",
      location: aiResult.output.location || null,
      budget: aiResult.output.budget || null,
      pricing: aiResult.output.pricing || "",
      experience: aiResult.output.experience || "",
      jobType: aiResult.output.jobType || "",
      category: aiResult.output.category || "",
      urgencyHints: aiResult.output.urgencyHints || [],
      aiStatus: aiResult.status,
      model: aiResult.model,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to generate job description",
      error: error.message,
    });
  }
};

// @desc    Get my posted jobs
// @route   GET /api/recruiter/jobs
const getMyJobs = async (req, res) => {
  try {
    const jobs = mapJobs(await prisma.jobPost.findMany({
      where: { recruiter: String(req.user._id) },
      orderBy: { createdAt: 'desc' },
    }));
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get recruiter job postings (new UI)
// @route   GET /api/recruiter/job-postings
const getJobPostings = async (req, res) => {
  try {
    const jobs = mapJobs(await prisma.jobPost.findMany({
      where: { recruiter: String(req.user._id) },
      orderBy: { createdAt: 'desc' },
    }));

    const formatted = jobs.map((job) => ({
      ...job,
      interestedCount: Array.isArray(job.applicants)
        ? job.applicants.length
        : 0,
    }));

    res.json({ jobs: formatted });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    AI search candidates for recruiter
// @desc    Parse raw recruiter search query into structured filters using AI
// @route   POST /api/recruiter/parse-search-query
const parseSearchQuery = async (req, res) => {
  try {
    const { query } = req.body;
    if (!String(query || '').trim()) {
      return res.json({ success: true, parsed: {} });
    }

    const prompt = `You are a recruiter search query parser. Extract structured hiring requirements from the recruiter's raw text query.

Return ONLY valid JSON with these keys (use null if not mentioned):
{
  "role": "job title or role being searched for (string or null)",
  "experience": "years of experience as a number string like '3' or '5+' (string or null)",
  "location": "city or location (string or null)",
  "ctcMin": "minimum CTC in LPA as number (number or null)",
  "ctcMax": "maximum CTC in LPA as number (number or null)",
  "noticePeriod": "notice period like 'Immediate', '30 Days', '60 Days' (string or null)",
  "employmentType": "Full-time / Part-time / Contract / Remote (string or null)",
  "skills": ["array of specific skills mentioned (strings)"]
}

Query: "${String(query).replace(/"/g, "'")}"`;

    const llmService = require('../services/ai/llmService');

    let parsed = null;

    // Try Gemini first (cheapest), then OpenAI
    if (llmService.hasGeminiKey && llmService.hasGeminiKey()) {
      const r = await llmService.callGeminiFlashLite(prompt);
      if (r.used && r.output && typeof r.output === 'object') parsed = r.output;
    }
    if (!parsed && llmService.hasOpenAIKey && llmService.hasOpenAIKey()) {
      const r = await llmService.callOpenAI(prompt);
      if (r.used && r.output && typeof r.output === 'object') parsed = r.output;
    }

    return res.json({ success: true, parsed: parsed || {} });
  } catch (error) {
    console.error('[parseSearchQuery]', error.message);
    return res.json({ success: true, parsed: {} }); // graceful fallback
  }
};

// @route   GET /api/recruiter/ai-search
const aiSearchCandidates = async (req, res) => {
  try {
    if (!enabled('ENABLE_RECRUITER_MATCHING')) {
      return res.status(503).json({
        message: 'Recruiter matching is temporarily disabled',
        code: 'RECRUITER_MATCHING_DISABLED',
      });
    }
    const Lead = require("../models/Lead");
    const ProviderProfile = require("../models/ProviderProfile");
    const skill    = String(req.query.skill    || req.query.skills  || '').trim();
    const location = String(req.query.location || req.query.city    || '').trim();
    const experience = String(req.query.experience || '').trim();
    const jobTitle   = String(req.query.jobTitle   || '').trim();
    const minFee     = req.query.minFee ? Number(req.query.minFee) : null;
    const maxFee     = req.query.maxFee ? Number(req.query.maxFee) : null;
    const q          = String(req.query.q || '').trim();

    const { getActiveSubscription } = require("../middleware/subscription");
    const { plan } = await getActiveSubscription(req.user._id, "recruiter");
    const isAdmin = req.user && (req.user.activeRole === "admin" || req.user.role === "admin");
    const hasPaidPlan = (plan && plan.price > 0 && plan.slug !== "free") || isAdmin;

    // Build flexible mongo filter
    const filter = { isApproved: true };

    // Use skill or q (natural language query) for text matching
    const skillTerm = skill || q;
    if (skillTerm) {
      const terms = skillTerm.split(/[,;\s]+/).map(t => t.trim()).filter(Boolean);
      if (terms.length > 0) {
        const regexes = terms.map(term => new RegExp(term, 'i'));
        filter.$or = [
          { roles:        { $in: regexes } },
          { skills:       { $in: regexes } },
          { headline:     { $in: regexes } },
          { description:  { $in: regexes } },
          { highlight:    { $in: regexes } },
          { highlights:   { $in: regexes } },
          { bio:          { $regex: terms.join('|'), $options: 'i' } },
        ];
      }
    }

    // jobTitle match if skill not present
    if (jobTitle && !skillTerm) {
      const terms = jobTitle.split(/[,;\s]+/).map(t => t.trim()).filter(Boolean);
      if (terms.length > 0) {
        const regexes = terms.map(term => new RegExp(term, 'i'));
        filter.$or = [
          { roles:       { $in: regexes } },
          { skills:      { $in: regexes } },
          { headline:    { $in: regexes } },
          { description: { $in: regexes } },
        ];
      }
    }

    // Location / Geo-fencing logic:
    // If a search location is EXPLICITLY requested (e.g. recruiter searched react developer in Bangalore),
    // restrict everyone (including skilled) to be within 50km or match city text (Feedbacks 1 & 7).
    // If no location query parameter is provided (falls back to recruiter location),
    // only restrict unskilled/semi-skilled candidates (skilled candidates remain global).
    const isExplicitLocation = !!location;
    let targetCoords = null;
    if (location) {
      const geocoded = await getCoordinatesFromText(location);
      if (geocoded && geocoded.lat && geocoded.lon) {
        targetCoords = [geocoded.lon, geocoded.lat];
      }
    } else {
      // Fallback to recruiter's profile location
      const recruiterProfile = await findRecruiterProfileByUserId(req.user._id);
      if (recruiterProfile && recruiterProfile.latitude && recruiterProfile.longitude) {
        targetCoords = [recruiterProfile.longitude, recruiterProfile.latitude];
      }
    }

    if (targetCoords) {
      filter.$and = filter.$and || [];
      if (isExplicitLocation) {
        // Explicit location query: restrict everyone to this location
        filter.$and.push({
          geoPoint: {
            $geoWithin: {
              $centerSphere: [targetCoords, 50 / 6378.1] // 50 KM
            }
          }
        });
      } else {
        // Fallback recruiter location: only geofence unskilled/semi-skilled candidates
        filter.$and.push({
          $or: [
            // Skilled candidates are global
            { skillLevel: 'skilled' },
            { tier: 'skilled' },
            // Treat dynamic skilled professions matching keywords as skilled globally
            {
              roles: {
                $in: [
                  /design/i, /developer/i, /engineer/i, /accountant/i, /tutor/i,
                  /teacher/i, /doctor/i, /consultant/i, /manager/i, /specialist/i,
                  /analyst/i, /writer/i, /editor/i, /figma/i, /ui\/ux/i
                ]
              }
            },
            {
              skills: {
                $in: [
                  /design/i, /developer/i, /engineer/i, /accountant/i, /tutor/i,
                  /teacher/i, /doctor/i, /consultant/i, /manager/i, /specialist/i,
                  /analyst/i, /writer/i, /editor/i, /figma/i, /ui\/ux/i
                ]
              }
            },
            // Unskilled & semi-skilled candidates must be within 50km
            {
              $and: [
                {
                  $or: [
                    { skillLevel: { $in: ['unskilled', 'semi-skilled'] } },
                    { tier: { $in: ['unskilled', 'semi-skilled'] } },
                    { skillLevel: { $exists: false }, tier: { $exists: false } }
                  ]
                },
                {
                  geoPoint: {
                    $geoWithin: {
                      $centerSphere: [targetCoords, 50 / 6378.1] // 50 KM
                    }
                  }
                }
              ]
            }
          ]
        });
      }
    } else if (location) {
      // Geocoding failed, fallback to text-based city match
      filter.$and = filter.$and || [];
      filter.$and.push({
        city: { $regex: location, $options: 'i' }
      });
    }

    if (experience) {
      // Match "3", "3+", "3 years" etc.
      const expNum = parseInt(experience, 10);
      if (!isNaN(expNum)) {
        const firstWord = { $arrayElemAt: [{ $split: ['$experience', ' '] }, 0] };
        const splitDash = { $arrayElemAt: [{ $split: [firstWord, '-'] }, 0] };
        const cleanNumberStr = { $arrayElemAt: [{ $split: [splitDash, '+'] }, 0] };
        filter.$expr = {
          $gte: [
            {
              $convert: {
                input: cleanNumberStr,
                to: 'double',
                onError: 0.0,
                onNull: 0.0
              }
            },
            expNum
          ]
        };
      } else {
        filter.experience = { $regex: experience, $options: 'i' };
      }
    }

    // Fee / budget filtering via pricing field
    if (minFee !== null || maxFee !== null) {
      const pricingFilter = {};
      if (minFee !== null) pricingFilter.$gte = String(minFee);
      if (maxFee !== null) pricingFilter.$lte = String(maxFee);
      // pricing is stored as string; do numeric comparison via aggregation fallback
      // For schema compatibility, add a loose regex filter so Mongo at least limits the set
      // Exact budget filtering happens in post-processing below
    }

    // Pull saved candidates for isSaved flag
    const savedLeads = await Lead.find({
      recruiter: req.user._id,
      type: 'saved_candidate',
    }).select('provider').lean();
    const savedProviderIds = new Set(savedLeads.map(l => String(l.provider)));

    const raw = await ProviderProfile.find(filter)
      .populate('user', 'name email phone profilePhoto avatar')
      .sort({ boostWeight: -1, rating: -1, createdAt: -1 })
      .limit(300)
      .lean();

    // Post-process: compute match score, apply budget filter, normalise output
    const results = raw
      .filter(c => {
        // Budget post-filter
        const pricingNum = parseFloat(String(c.pricing || '0').replace(/[^\d.]/g, ''));
        if (minFee !== null && pricingNum < minFee) return false;
        if (maxFee !== null && pricingNum > maxFee && pricingNum > 0) return false;
        return true;
      })
      .map(c => {
        let score = 60; // base

        const skillsText = Array.isArray(c.skills)
          ? c.skills.join(' ').toLowerCase()
          : String(c.skills || '').toLowerCase();
        const cityText = String(c.city || '').toLowerCase();
        const expText  = String(c.experience || '').toLowerCase();
        const descText = String(c.description || '').toLowerCase();
        const pricingNum = parseFloat(String(c.pricing || '0').replace(/[^\d.]/g, ''));

        const term = (skillTerm || jobTitle || '').toLowerCase();
        if (term) {
          const queryTerms = term.split(/[,;\s]+/).map(t => t.trim()).filter(Boolean);
          let skillMatchCount = 0;
          let descMatchCount = 0;
          for (const qt of queryTerms) {
            if (skillsText.includes(qt)) {
              skillMatchCount++;
            } else if (descText.includes(qt)) {
              descMatchCount++;
            }
          }
          if (skillMatchCount > 0) {
            score += 15 + (skillMatchCount - 1) * 2;
          } else if (descMatchCount > 0) {
            score += 8 + (descMatchCount - 1) * 1;
          }
        }
        if (location && cityText.includes(location.toLowerCase())) score += 12;
        if (experience) {
          const expNum = parseInt(experience, 10);
          const candExp = parseFloat(expText);
          if (!isNaN(expNum) && !isNaN(candExp) && candExp >= expNum) score += 8;
          else if (expText.includes(experience.toLowerCase())) score += 6;
        }
        if (maxFee !== null && pricingNum > 0 && pricingNum <= maxFee) score += 5;
        if (c.isVerified) score += 3;
        if (c.currentPlan && c.currentPlan !== 'free') score += 2;

        return {
          id:           c._id,
          name:         c.user?.name || c.name || 'Candidate',
          emailForSorting: c.user?.email || '',
          profilePhoto: c.user?.profilePhoto || c.user?.avatar || c.profilePhoto || '',
          title:        Array.isArray(c.roles) && c.roles.length ? c.roles[0] : (Array.isArray(c.skills) ? c.skills[0] : c.skills || jobTitle || skill || 'Candidate'),
          role:         Array.isArray(c.roles) && c.roles.length ? c.roles[0] : (Array.isArray(c.skills) ? c.skills[0] : c.skills || jobTitle || skill || 'Candidate'),
          skills:       c.skills || [],
          experience:   c.experience || 'N/A',
          location:     [c.city, c.state].filter(Boolean).join(', ') || 'Unknown',
          fee:          c.pricing || 'N/A',
          pricing:      c.pricing || '',
          pricingType:  c.pricingType || '',
          expectedCtc:  c.expectedCtc || '',
          noticePeriod: c.noticePeriod || '',
          matchScore:   Math.min(score, 98),
          isSaved:      savedProviderIds.has(String(c._id)),
          shortBio:     c.description ? c.description.slice(0, 120) : '',
          resumeUrl:    hasPaidPlan ? (c.resumeUrl || c.resumeApproval?.pendingUrl || c.resumeApproval?.approvedUrl || '') : '',
          hasResume:    Boolean(c.resumeUrl || c.resumeApproval?.pendingUrl || c.resumeApproval?.approvedUrl),
          isVerified:   c.isVerified || false,
          rating:       c.rating || 0,
          whatsappFreelancePlanActive: c.whatsappFreelancePlanActive || false,
        };
      });

    // Sort so that real organic users always appear first, and seeded/mock users are pushed to the bottom
    results.sort((a, b) => {
      const isSeed = (c) => {
        const email = c.emailForSorting || '';
        const name = (c.name || '').toLowerCase();
        return email.includes('seed_') || email.includes('@seeded') || email.includes('@example.') ||
          name.includes('mock') || name.includes('test') || name.includes('demo') || name.includes('seed');
      };
      
      const aSeed = isSeed(a) ? 1 : 0;
      const bSeed = isSeed(b) ? 1 : 0;
      
      if (aSeed !== bSeed) return aSeed - bSeed;
      return b.matchScore - a.matchScore; // Otherwise sort by AI match score
    });

    const paginatedResults = results.slice(0, 50);

    res.json({
      success: true,
      parsedFilters: { skill: skillTerm, experience, location, jobTitle, minFee, maxFee },
      count: paginatedResults.length,
      candidates: paginatedResults,
      total: results.length,
      query: { skill: skillTerm, location, experience, jobTitle },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add candidate to job posting
// @route   POST /api/recruiter/job-postings/:jobId/candidates
const addCandidateToJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const candidateId = req.body.candidateId || req.body.providerProfileId;
    if (!candidateId)
      return res.status(400).json({ message: "candidateId is required" });

    let job = await findOwnedJob(jobId, req.user._id);
    if (!job) return res.status(404).json({ message: "Job posting not found" });

    const candidates = Array.isArray(job.candidates) ? job.candidates : [];
    const exists = candidates.some(
      (c) => String(c.providerProfile) === String(candidateId),
    );
    if (!exists) {
      job = await updateOwnedJob(jobId, req.user._id, {
        candidates: [...candidates, {
          providerProfile: String(candidateId),
          addedAt: new Date().toISOString(),
        }],
      });
    }

    res.json({ message: "Candidate added", jobId: job._id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get candidates for a job posting
// @route   GET /api/recruiter/job-postings/:jobId/candidates
const getJobCandidates = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await findOwnedJob(jobId, req.user._id);

    if (!job) return res.status(404).json({ message: "Job posting not found" });

    const candidates = await Promise.all((Array.isArray(job.candidates) ? job.candidates : [])
      .map(async (entry) => {
        const profile = await findProviderProfileByIdOrUserId(entry.providerProfile, {
          userSelect: { id: true, name: true, email: true, phone: true, profilePhoto: true },
        });
        return {
          id: profile?._id || String(entry.providerProfile || ''),
          name: profile?.user?.name || "Candidate",
          experience: profile?.experience || "N/A",
          location: profile?.city || "Unknown",
          addedAt: entry.addedAt,
        };
      }));

    res.json({ candidates });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    View candidate contact (enforce plan limit)
// @route   POST /api/recruiter/candidates/:candidateId/view-contact
const viewCandidateContact = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const summary = await buildRecruiterPlanSummary(req.user._id);
    if (!summary.plan || summary.limit <= 0) {
      return res.status(403).json({
        message: "Upgrade required to view contacts.",
        upgradeRequired: true,
      });
    }

    if (summary.used >= summary.limit) {
      return res.status(403).json({
        message: "Contact limit reached. Please upgrade.",
        upgradeRequired: true,
      });
    }

    const candidate = await findProviderProfileByIdOrUserId(candidateId, {
      userSelect: { id: true, name: true, email: true, phone: true, profilePhoto: true },
    });
    if (!candidate)
      return res.status(404).json({ message: "Candidate not found" });

    const activeSubscription = await findActiveUserSubscription(req.user._id, 'recruiter', false);
    if (activeSubscription) await incrementSubscriptionContactsViewed(activeSubscription._id);

    res.json({
      candidateId,
      contact: {
        name: candidate.user?.name || "Candidate",
        email: candidate.user?.email || "",
        phone: candidate.user?.phone || "",
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get recruiter plan summary
// @route   GET /api/recruiter/plan-summary
const getRecruiterPlanSummary = async (req, res) => {
  try {
    const summary = await buildRecruiterPlanSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get recruiter plans
// @route   GET /api/recruiter/plans
const getPlans = async (req, res) => {
  try {
    let country = req.query.country || req.user?.country;
    if (!country && req.user) {
      const profile = await findRecruiterProfileByUserId(req.user._id);
      country = profile?.country;
    }
    country = (country || 'IN').toUpperCase();

    const plans = await listPlans(
      { type: 'recruiter', isActive: true, planType: { not: 'custom' } },
      { sortOrder: 'asc' },
    );

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
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Purchase recruiter plan
// @route   POST /api/recruiter/plans/purchase
// @desc    Purchase recruiter plan
// @route   POST /api/recruiter/plans/purchase
// NOTE: This route is kept for legacy compatibility but should NOT be called directly.
// The real purchase flow goes through /api/payment/create-order → Razorpay → /api/payment/verify
// Calling this bypasses Razorpay and the upgrade guard — redirect clients accordingly.
const purchasePlan = async (req, res) => {
  return res.status(410).json({
    message: 'This endpoint is no longer supported. Please use the standard checkout flow: POST /api/payment/create-order → Razorpay → POST /api/payment/verify',
    code: 'USE_PAYMENT_GATEWAY',
  });
};

// @desc    Add review for provider
// @route   POST /api/recruiter/review/:providerId
const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    const providerProfile = await findProviderProfileByIdOrUserId(req.params.providerId);
    if (!providerProfile)
      return res.status(404).json({ message: "Provider not found" });

    const existing = await prisma.review.findFirst({
      where: {
        provider: String(providerProfile.user),
        recruiter: String(req.user._id),
      },
      select: { id: true },
    });
    if (existing)
      return res
        .status(400)
        .json({ message: "You already reviewed this provider" });

    const review = withLegacyId(await prisma.review.create({
      data: {
        provider: String(providerProfile.user),
        recruiter: String(req.user._id),
        reviewerId: String(req.user._id),
        revieweeId: String(providerProfile.user),
        rating: Number(rating),
        comment: comment || "",
      },
    }));

    // Update provider average rating
    const allReviews = await prisma.review.findMany({
      where: { provider: String(providerProfile.user) },
      select: { rating: true },
    });
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    providerProfile.rating = Math.round(avgRating * 10) / 10;
    providerProfile.totalReviews = allReviews.length;
    await saveProviderProfile(providerProfile);

    if (enabled('ENABLE_PROVIDER_AI_JOBS')) {
      await enqueueJob({
        queueName: JOB_QUEUES.ANALYTICS,
        jobName: JOB_NAMES.TRUST_SCORE_RECALC,
        payload: { providerId: String(providerProfile.user) },
        relatedEntityType: "provider",
        relatedEntityId: String(providerProfile.user),
        idempotencyKey: `trust-recalc-review:${providerProfile.user}`,
      });
    }

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Upload recruiter profile photo (Cloudinary)
// @route   POST /api/recruiter/profile/photo
const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Validate photo size & mimeType on backend
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: "Invalid image format. Allowed formats: JPG, JPEG, PNG, WebP" });
    }
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB max fallback
    if (req.file.size > maxSizeBytes) {
      return res.status(400).json({ message: "File is too large. Max size allowed is 5MB" });
    }

    let newUrl;
    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: "servicehub/recruiters",
        public_id: `recruiter_${req.user._id}_${Date.now()}`,
      });
      newUrl = result.secure_url;
    } catch (cloudErr) {
      return res
        .status(500)
        .json({ message: "Cloudinary upload failed", error: cloudErr.message });
    }

    const profile = await findRecruiterProfileByUserId(req.user._id);
    if (
      profile?.profilePhoto &&
      profile.profilePhoto.includes("cloudinary.com")
    ) {
      await deleteFromCloudinary(profile.profilePhoto);
    } else if (
      profile?.profilePhoto &&
      profile.profilePhoto.startsWith("/uploads/")
    ) {
      const oldPath = path.join(__dirname, "..", profile.profilePhoto);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    // Send to admin for approval
    if (profile) {
      profile.profilePhotoApproval = {
        status: "pending",
        pendingUrl: newUrl,
        approvedUrl: profile.profilePhotoApproval?.approvedUrl || profile.profilePhoto || "",
        rejectionReason: "",
        reviewedBy: null,
        reviewedAt: null,
      };
      await saveRecruiterProfile(profile);
    }

    // Sync to User model
    await prisma.user.update({
      where: { id: String(req.user._id) },
      data: {
        profilePhotoApproval: {
          ...(req.user.profilePhotoApproval || {}),
          status: "pending",
          pendingUrl: newUrl,
        },
      },
    });


    res.json({
      url: newUrl,
      status: "pending",
      message: "Photo uploaded and pending approval",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete recruiter profile photo
// @route   DELETE /api/recruiter/profile/photo
const deleteProfilePhoto = async (req, res) => {
  try {
    const profile = await findRecruiterProfileByUserId(req.user._id);
    if (
      profile?.profilePhoto &&
      profile.profilePhoto.includes("cloudinary.com")
    ) {
      await deleteFromCloudinary(profile.profilePhoto);
    } else if (
      profile?.profilePhoto &&
      profile.profilePhoto.startsWith("/uploads/")
    ) {
      const oldPath = path.join(__dirname, "..", profile.profilePhoto);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await updateRecruiterProfileByUser(req.user._id, {
        profilePhoto: "",
        profilePhotoApproval: { status: "none", pendingUrl: "", approvedUrl: "" }
    });
    await prisma.user.update({
      where: { id: String(req.user._id) },
      data: {
        profilePhoto: "",
        avatar: "",
        profilePhotoApproval: {
          ...(req.user.profilePhotoApproval || {}),
          status: "none",
          pendingUrl: "",
        },
      },
    });

    res.json({ message: "Photo deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get recruiter visit/search history
// @route   GET /api/recruiter/history
const getMyHistory = async (req, res) => {
  try {
    const history = await listVisitHistory({ user: req.user._id }, 100, 'visited');
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Check if a provider contact is unlocked
// @route   GET /api/recruiter/unlock-status/:providerId
const checkUnlockStatus = async (req, res) => {
  try {
    const recruiterProfile = await findRecruiterProfileByUserId(req.user._id);
    if (recruiterProfile) {
      await ensureRecruiterMonthlyFreeQuota(recruiterProfile);
    }

    const provider = await findProviderProfileByParam(req.params.providerId);
    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    const existing = await prisma.lead.findFirst({
      where: {
        provider: String(provider.user._id),
        recruiter: String(req.user._id),
        type: "contact_unlock",
        isUnlocked: true,
      },
      select: { id: true },
    });

    const isWhatsappAlertsOn = provider.whatsappAlerts !== false && provider.user?.whatsappAlerts !== false;
    const contactInfo = existing
      ? {
          phone: provider.user?.phone || "",
          email: provider.user?.email || "",
          whatsappNumber: isWhatsappAlertsOn
            ? (provider.user?.isWhatsappSameAsMobile ? (provider.user?.phone || "") : (provider.user?.whatsappNumber || provider.user?.phone || ""))
            : "",
        }
      : null;

    res.json({ isUnlocked: !!existing, contactInfo, whatsappAlerts: isWhatsappAlertsOn });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// ===================================================================================
// @desc    Get recruiter profile
// @route   GET /api/recruiter/profile
const getRecruiterProfile = async (req, res) => {
  try {
    let profile = await findRecruiterProfileByUserId(req.user._id);
    const user = withLegacyId(await prisma.user.findUnique({
      where: { id: String(req.user._id) },
      select: {
        id: true, name: true, email: true, phone: true, avatar: true,
        profilePhoto: true, whatsappNumber: true, isWhatsappSameAsMobile: true,
        whatsappAlerts: true,
      },
    }));

    if (!profile) {
      profile = await ensureRecruiterProfile(req.user._id, {
        freeViewResetAt: new Date(Date.now() + THIRTY_DAYS_MS),
        freeUnlockResetAt: new Date(Date.now() + THIRTY_DAYS_MS),
        unlocksRemaining: 2,
        unlockPackSize: 2,
      });
    }

    res.json({ user, profile });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get recruiter transactions
// @route   GET /api/recruiter/transactions
const getRecruiterTransactions = async (req, res) => {
  try {
    const transactions = (await listPayments({
      where: { user: String(req.user._id) }, page: 1, limit: 100, includePlan: true,
    })).payments;

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get interested candidates from applications on recruiter's jobs
// @route   GET /api/recruiter/interested-candidates
const getInterestedCandidates = async (req, res) => {
  try {
    const jobs = mapJobs(await prisma.jobPost.findMany({
      where: { recruiter: String(req.user._id) },
      select: { id: true, title: true },
    }));
    const jobIds = jobs.map((job) => job._id);

    const applications = mapApplications(await prisma.application.findMany({
      where: { jobPost: { in: jobIds.map(String) } },
      include: {
        jobPostRecord: { select: { id: true, title: true, city: true, skill: true } },
        providerRecord: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    }));

    res.json({ candidates: applications });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get shortlisted candidates
// @route   GET /api/recruiter/shortlisted-candidates
const getShortlistedCandidates = async (req, res) => {
  try {
    const leads = await listShortlistedCandidateLeads(req.user._id);

    const { isRecruiterSubscribed } = require("../utils/subscriptionHelper");
    const { lockCandidate } = require("../utils/maskCandidateData");

    const recruiterProfileObj = await findRecruiterProfileByUserId(req.user._id);
    const isSubscribed = isRecruiterSubscribed(recruiterProfileObj);

    const finalLeads = await Promise.all(
      leads.map(async (item) => {
        let profileDetails = {};
        if (item.provider?._id) {
          try {
            const pp = await findProviderProfileByUserId(item.provider._id);
            if (pp) {
              profileDetails = {
                providerProfileId: pp._id,
                skills: pp.skills || [],
                experience: pp.experience || 'N/A',
                location: [pp.city, pp.state].filter(Boolean).join(', ') || 'Unknown',
                pricing: pp.pricing || 'N/A',
                currentCTC: pp.currentCtc || 'N/A',
                noticePeriod: pp.noticePeriod || 'N/A',
                expectedCtc: pp.expectedCtc || '',
                pricingType: pp.pricingType || '',
                whatsappFreelancePlanActive: pp.whatsappFreelancePlanActive || false,
                role: pp.designation || (pp.roles ? pp.roles[0] : ''),
              };
            }
          } catch (_) {}
        }

        if (!item.provider) return { ...item, ...profileDetails };
        
        // Check if unlocked
        const hasUnlocked = await prisma.lead.findFirst({
          where: {
            recruiter: String(req.user._id),
            provider: String(item.provider._id),
            type: 'contact_unlock',
            isUnlocked: true,
          },
          select: { id: true },
        });

        const isAuthorized = isSubscribed || !!hasUnlocked;
        if (isAuthorized) return { ...item, ...profileDetails };

        // Mask provider User object inside item
        const maskedUser = lockCandidate(item.provider, false);
        return {
          ...item,
          ...profileDetails,
          provider: maskedUser,
        };
      })
    );

    res.json({ candidates: finalLeads });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Add shortlisted candidate
// @route   POST /api/recruiter/shortlisted-candidates
const addShortlistedCandidate = async (req, res) => {
  try {
    const { providerId, providerProfileId } = req.body;
    const profile = await findProviderProfileByParam(
      providerProfileId || providerId,
    );

    if (!profile) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const lead = await ensureCandidateLead(req.user._id, profile.user._id, {
      type: 'shortlisted_candidate',
      types: ['shortlisted_candidate'],
    });

    res.json({ message: "Candidate shortlisted", lead });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Remove shortlisted candidate
// @route   DELETE /api/recruiter/shortlisted-candidates/:providerProfileId
const removeShortlistedCandidate = async (req, res) => {
  try {
    const profile = await findProviderProfileByParam(
      req.params.providerProfileId,
    );

    if (!profile) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    await removeShortlistedCandidateLead(req.user._id, profile.user._id);

    res.json({ message: "Candidate removed from shortlist" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get saved candidates
// @route   GET /api/recruiter/saved-candidates
const getSavedCandidates = async (req, res) => {
  try {
    const leads = (await prisma.lead.findMany({
      where: { recruiter: String(req.user._id), type: 'saved_candidate' },
      include: {
        providerRecord: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, profilePhoto: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })).map(mapLead);

    // For each lead also try to get provider profile details and job post details
    const results = await Promise.all(
      leads.map(async (lead) => {
        let profileDetails = {};
        if (lead.provider?._id) {
          try {
            const pp = await findProviderProfileByUserId(lead.provider._id);
            if (pp) {
              profileDetails = {
                providerProfileId: pp._id,
                skills: pp.skills || [],
                experience: pp.experience || 'N/A',
                location: [pp.city, pp.state].filter(Boolean).join(', ') || 'Unknown',
                fee: pp.pricing || 'N/A',
                pricing: pp.pricing || 'N/A',
                currentCTC: pp.currentCtc || 'N/A',
                noticePeriod: pp.noticePeriod || 'N/A',
                expectedCtc: pp.expectedCtc || '',
                pricingType: pp.pricingType || '',
                shortBio: pp.description ? pp.description.slice(0, 120) : '',
                whatsappFreelancePlanActive: pp.whatsappFreelancePlanActive || false,
                role: pp.designation || (pp.roles ? pp.roles[0] : ''),
              };
            }
          } catch (_) {}
        }

        let jobDetails = {};
        const jobId = lead.jobPost || lead.metadata?.jobId;
        if (jobId) {
          try {
            const jp = await findJobRecordById(jobId);
            if (jp) {
              jobDetails = {
                jobPost: {
                  _id: jp._id,
                  title: jp.title,
                  category: jp.category,
                }
              };
            }
          } catch (_) {}
        }

        return { ...lead, ...profileDetails, ...jobDetails };
      })
    );

    const { isRecruiterSubscribed } = require("../utils/subscriptionHelper");
    const { lockCandidate } = require("../utils/maskCandidateData");

    const recruiterProfileObj = await findRecruiterProfileByUserId(req.user._id);
    const isSubscribed = isRecruiterSubscribed(recruiterProfileObj);

    const finalResults = await Promise.all(
      results.map(async (item) => {
        if (!item.provider) return item;
        
        // Check if unlocked
        const hasUnlocked = await prisma.lead.findFirst({
          where: {
            recruiter: String(req.user._id),
            provider: String(item.provider._id),
            type: "contact_unlock",
            isUnlocked: true,
          },
          select: { id: true },
        });

        const isAuthorized = isSubscribed || !!hasUnlocked;
        if (isAuthorized) return item;

        // Mask provider User object inside item
        const maskedUser = lockCandidate(item.provider, false);
        return {
          ...item,
          provider: maskedUser,
        };
      })
    );

    res.json({ candidates: finalResults });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add saved candidate
// @route   POST /api/recruiter/saved-candidates
const addSavedCandidate = async (req, res) => {
  try {
    const { candidateId, providerId, providerProfileId, jobId, source } = req.body;
    const lookupId = candidateId || providerProfileId || providerId;

    if (!lookupId) {
      return res.status(400).json({ message: 'candidateId is required' });
    }

    const profile = await findProviderProfileByParam(lookupId);
    if (!profile) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Duplicate check
    const existing = withLegacyId(await prisma.lead.findFirst({
      where: {
        recruiter: String(req.user._id),
        provider: String(profile.user._id),
        type: 'saved_candidate',
      },
    }));

    if (existing) {
      return res.json({ message: 'Candidate already saved', alreadySaved: true, lead: existing });
    }

    const lead = withLegacyId(await prisma.lead.create({
      data: {
        recruiter: String(req.user._id),
        provider: String(profile.user._id),
        jobPost: jobId ? String(jobId) : null,
        type: 'saved_candidate',
        sourceType: source || 'ai_smart_search',
      },
    }));

    // Notify provider: rate-limited to once per 6h per recruiter/provider pair
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const recent = await findNotification({
        userId: String(profile.user._id),
        type: 'PROFILE_VIEWED',
        data: { path: ['recruiterId'], equals: String(req.user._id) },
        createdAt: { gte: sixHoursAgo },
      });

      if (!recent) {
        await createNotification({
          userId: profile.user._id,
          type: 'PROFILE_VIEWED',
          title: 'Profile Viewed',
          message: '1 recruiter viewed your profile.',
          data: {
            recruiterId: req.user._id,
            recruiterName: req.user.name,
            providerProfileId: profile._id,
          },
        });
      }
    } catch (notifyErr) {
      console.warn('[addSavedCandidate] Notification failed:', notifyErr.message);
    }

    res.status(201).json({ message: 'Candidate saved successfully', alreadySaved: false, lead });
  } catch (error) {
    console.error('[addSavedCandidate] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Remove saved candidate
// @route   DELETE /api/recruiter/saved-candidates/:providerProfileId
const removeSavedCandidate = async (req, res) => {
  try {
    const profile = await findProviderProfileByParam(
      req.params.providerProfileId,
    );

    if (!profile) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    await prisma.lead.deleteMany({
      where: {
        recruiter: String(req.user._id),
        provider: String(profile.user._id),
        type: "saved_candidate",
      },
    });

    res.json({ message: "Candidate removed from saved list" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// @desc    Update a job posting
// @route   GET /api/recruiter/jobs/:id
const getJobById = async (req, res) => {
  try {
    const job = await findOwnedJob(req.params.id, req.user._id);
    if (!job) {
      return res.status(404).json({ message: "Job posting not found or unauthorized" });
    }
    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PATCH /api/recruiter/jobs/:id
const updateJob = async (req, res) => {
  try {
    let job = await findOwnedJob(req.params.id, req.user._id);
    if (!job) {
      return res.status(404).json({ message: "Job posting not found or unauthorized" });
    }

    const {
      title,
      description,
      skill,
      city,
      jobType,
      requirements,
      status,
      expiresAt,
      skillsTags,
      category,
      budgetMin,
      budgetMax,
      budgetType,
      currency,
      salaryPeriod,
      isActive,
    } = req.body;

    if (title !== undefined) job.title = title;
    if (description !== undefined) job.description = description;
    if (skill !== undefined) job.skill = skill;
    if (city !== undefined) job.city = city;
    if (jobType !== undefined) job.jobType = jobType;
    if (requirements !== undefined) job.requirements = requirements;
    if (status !== undefined) {
      job.status = status;
      if (isActive === undefined) job.isActive = !['closed', 'expired', 'deleted'].includes(status);
    }
    if (expiresAt !== undefined) job.expiresAt = expiresAt;
    if (skillsTags !== undefined) job.skillsTags = skillsTags;
    if (category !== undefined) job.category = category;
    if (budgetMin !== undefined) job.budgetMin = budgetMin;
    if (budgetMax !== undefined) job.budgetMax = budgetMax;
    if (budgetType !== undefined) job.budgetType = budgetType;
    if (currency !== undefined) job.currency = currency;
    if (salaryPeriod !== undefined) job.salaryPeriod = salaryPeriod;
    if (isActive !== undefined) job.isActive = isActive;

    job = await updateOwnedJob(req.params.id, req.user._id, job);

    try {
      const { clearCachedSitemap } = require("../utils/sitemapCache");
      clearCachedSitemap();
      
      // Notify Google Indexing API of update
      const indexingService = require('../services/indexingService');
      const slug = (job.title || job.skill || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const jobUrl = `https://www.lucohire.com/jobs/${slug}-${job._id}`;
      indexingService.notifyGoogle(jobUrl, 'URL_UPDATED').catch(e => console.error('[Indexing] notify failed:', e));
    } catch (err) {
      console.error("[Sitemap Cache Error] Failed to clear sitemap cache on job update:", err);
    }

    await enqueueJob({
      queueName: JOB_QUEUES.AI,
      jobName: JOB_NAMES.JOB_EMBEDDING_REFRESH,
      payload: { jobId: String(job._id) },
      relatedEntityType: "job",
      relatedEntityId: String(job._id),
      idempotencyKey: `job-embedding:${job._id}`,
    });

    res.json({ success: true, message: "Job updated successfully", job });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update application status
// @route   PATCH /api/recruiter/applications/:id
const updateApplicationStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const result = await updateApplicationForRecruiter(
      req.params.id,
      req.user._id,
      { status: status || undefined },
    );
    if (!result.application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Verify recruiter owns the job
    if (!result.authorized) {
      return res.status(403).json({ message: "Not authorized to manage this application" });
    }
    const application = result.application;

    res.json({ success: true, message: "Application status updated", application });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete application
// @route   DELETE /api/recruiter/applications/:id
const deleteApplication = async (req, res) => {
  try {
    const result = await deleteApplicationForRecruiter(req.params.id, req.user._id);
    if (!result.application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Verify recruiter owns the job
    if (!result.authorized) {
      return res.status(403).json({ message: "Not authorized to delete this application" });
    }

    res.json({ success: true, message: "Application deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete a job posting
// @route   DELETE /api/recruiter/jobs/:id
const deleteJob = async (req, res) => {
  try {
    const job = await findOwnedJob(req.params.id, req.user._id);
    if (!job) {
      return res.status(404).json({ message: "Job posting not found or unauthorized" });
    }

    await updateJobRecord(req.params.id, { status: 'deleted', isActive: false });

    if (enabled('ENABLE_SEO_AUTOMATION')) {
      try {
        const { clearCachedSitemap } = require("../utils/sitemapCache");
        clearCachedSitemap();

        // Notify Google Indexing API of deletion
        const indexingService = require('../services/indexingService');
        const slug = (job.title || job.skill || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const jobUrl = `https://www.lucohire.com/jobs/${slug}-${job._id}`;
        indexingService.notifyGoogle(jobUrl, 'URL_DELETED').catch(e => console.error('[Indexing] notify failed:', e));
      } catch (err) {
        console.error("[Sitemap Cache Error] Failed to clear sitemap cache on job deletion:", err);
      }
    }

    res.json({ success: true, message: "Job posting deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    View candidate CV (up to 2 unique views for free tier recruiter, then depends on paid plan)
// @route   GET /api/recruiter/view-cv/:id
const viewCv = async (req, res) => {
  try {
    const provider = await findProviderProfileByParam(req.params.id);
    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    if (!provider.user) {
      return res.status(404).json({ message: "Candidate user details are missing or have been removed" });
    }

    const resumeUrlValue = provider.resumeUrl || provider.resumeApproval?.pendingUrl || provider.resumeApproval?.approvedUrl || "";
    if (!resumeUrlValue) {
      return res.status(404).json({ message: "No resume uploaded by candidate." });
    }

    const { getActiveSubscription } = require("../middleware/subscription");
    const { plan } = await getActiveSubscription(req.user._id, "recruiter");
    const isAdmin = req.user && (req.user.activeRole === "admin" || req.user.role === "admin");
    const hasPaidPlan = (plan && plan.price > 0 && plan.slug !== "free") || isAdmin;

    if (!hasPaidPlan) {
      // Ensure free_cv_view_limit exists in DB
      const limitSetting = await prisma.adminSetting.upsert({
        where: { key: 'free_cv_view_limit' },
        create: { key: 'free_cv_view_limit', value: 2, description: 'Max free CV views/downloads for recruiter', category: 'general' },
        update: {},
      });

      const freeCvViewLimitVal = limitSetting.value;
      const freeCvViewLimit = Number(freeCvViewLimitVal) || 2;

      // Check if this recruiter has already viewed this candidate's CV
      const alreadyViewed = await prisma.recruiterCvViewTracker.findFirst({ where: {
        recruiterId: String(req.user._id), candidateId: String(provider._id),
      } });

      if (!alreadyViewed) {
        // Count unique CV views by this recruiter
        const viewCount = await prisma.recruiterCvViewTracker.count({ where: { recruiterId: String(req.user._id) } });

        if (viewCount >= freeCvViewLimit) {
          return res.status(403).json({
            message: `Upgrade required. You have reached your limit of ${freeCvViewLimit} free CV views.`,
            limitReached: true,
            viewsUsed: viewCount,
            limit: freeCvViewLimit,
          });
        }

        // Record the new CV view
        await prisma.recruiterCvViewTracker.create({ data: {
          recruiterId: String(req.user._id), candidateId: String(provider._id),
        } });
      }
    }

    const path = require("path");

    // Extract R2 object key from URL path
    let objectKey = path.basename(resumeUrlValue);
    if (objectKey.includes("?")) {
      objectKey = objectKey.split("?")[0];
    }

    let signedUrl = resumeUrlValue;
    if (enabled('ENABLE_EXTERNAL_PROFILE_ASSETS')) {
      const { generateSignedResumeUrl } = require("../services/r2Service");
      signedUrl = await generateSignedResumeUrl(objectKey);
    }

    // Log resume access
    await createResumeAccessLog({
      recruiterId: req.user._id,
      candidateId: provider.user._id,
      resumeObjectKey: objectKey,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
    });

    return res.json({
      success: true,
      resumeUrl: signedUrl,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ==================================================================================

const aiDecisionEngine = require('../services/ai/aiDecisionEngine.service');

const getRecruiterReputation = async (req, res) => {
  try {
    const recruiterId = req.params.id;
    // We should fetch the recruiter profile, but we can also use req.user if they are fetching their own
    // Or if it's admin fetching it. Let's just fetch by ID.
    const recruiterRecord = await prisma.recruiterProfile.findUnique({
      where: { user: String(recruiterId) },
      include: { userRecord: true },
    });
    const recruiter = recruiterRecord
      ? (() => {
          const { userRecord, ...profile } = recruiterRecord;
          return { ...withLegacyId(profile), user: withLegacyId(userRecord) };
        })()
      : null;
    
    if (!recruiter) {
      return res.status(404).json({ success: false, message: 'Recruiter not found' });
    }

    // Call the AI Decision Engine
    const reputationData = await aiDecisionEngine.evaluateRecruiterReputation(recruiter);

    res.json({
      success: true,
      data: reputationData
    });
  } catch (error) {
    console.error('Error fetching recruiter reputation:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const addCandidateNote = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { noteText } = req.body;
    if (!noteText) return res.status(400).json({ message: "Note text is required" });
    const profile = await findProviderProfileByParam(providerId);
    if (!profile) return res.status(404).json({ message: "Candidate not found" });

    const existingLead = await ensureCandidateLead(req.user._id, profile.user._id, {
      types: ['shortlisted_candidate', 'saved_candidate', 'contact_unlock', 'profile_view'],
    });
    const notes = Array.isArray(existingLead.notes) ? existingLead.notes : [];
    const note = {
      _id: require('crypto').randomUUID(),
      text: noteText,
      author: req.user.name,
      createdAt: new Date().toISOString(),
    };
    await ensureCandidateLead(req.user._id, profile.user._id, {
      type: existingLead.type,
      types: [existingLead.type],
      notes: [...notes, note],
    });

    const allLeads = await listCandidateLeads(req.user._id, profile.user._id);
    const allNotes = allLeads.flatMap(l => l.notes || []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const allTags = [...new Set(allLeads.flatMap(l => l.tags || []))];

    res.json({ message: "Note added successfully", notes: allNotes, tags: allTags });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const addCandidateTag = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { tag } = req.body;
    if (!tag) return res.status(400).json({ message: "Tag is required" });
    const profile = await findProviderProfileByParam(providerId);
    if (!profile) return res.status(404).json({ message: "Candidate not found" });

    const lead = await ensureCandidateLead(req.user._id, profile.user._id, {
      types: ['shortlisted_candidate', 'saved_candidate', 'contact_unlock', 'profile_view'],
    });
    const tags = Array.isArray(lead.tags) ? lead.tags : [];
    if (!tags.includes(tag)) {
      await ensureCandidateLead(req.user._id, profile.user._id, {
        type: lead.type,
        types: [lead.type],
        tags: [...tags, tag],
      });
    }

    const allLeads = await listCandidateLeads(req.user._id, profile.user._id);
    const allNotes = allLeads.flatMap(l => l.notes || []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const allTags = [...new Set(allLeads.flatMap(l => l.tags || []))];

    res.json({ message: "Tag added successfully", tags: allTags, notes: allNotes });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const rejectCandidate = async (req, res) => {
  try {
    const { providerId } = req.params;
    const profile = await findProviderProfileByParam(providerId);
    if (!profile) return res.status(404).json({ message: "Candidate not found" });

    await ensureCandidateLead(req.user._id, profile.user._id, {
      status: 'rejected',
      types: ['shortlisted_candidate', 'saved_candidate', 'contact_unlock', 'profile_view'],
    });

    res.json({ message: "Candidate rejected" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ==================================================================================

// Get Recruiter Feature Usage and Limits
const getAiUsage = async (req, res) => {
  try {
    if (!enabled('ENABLE_RECRUITER_AI')) {
      return res.status(503).json({
        success: false,
        message: 'Recruiter AI is disabled',
        code: 'RECRUITER_AI_DISABLED',
      });
    }
    const UserSubscription = require('../models/UserSubscription');
    const RecruiterAiUsage = require('../models/RecruiterAiUsage');
    const Plan = require('../models/Plan');
    const userId = req.user._id;

    // 1. Get the profile
    const profile = await findRecruiterProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    let planObj = null;
    let subscriptionDoc = null;

    // 2. Determine active plan
    const activeSub = await UserSubscription.findOne({
      userId: userId,
      role: 'recruiter',
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('planId');

    if (activeSub && activeSub.planId) {
      planObj = activeSub.planId.toObject ? activeSub.planId.toObject() : activeSub.planId;
      subscriptionDoc = activeSub;
    } else {
      // Fallback to the plan string in their profile (e.g., 'free')
      const planSlug = profile.currentPlan || 'free';
      const baseSlug = planSlug.replace('-quarterly', '').replace('-yearly', '');
      const fallbackPlan = await Plan.findOne({ slug: baseSlug, type: 'recruiter' });
      if (fallbackPlan) {
        planObj = fallbackPlan.toObject ? fallbackPlan.toObject() : fallbackPlan;
      }
    }

    // If planObj is still null (e.g. Free plan doesn't exist in DB), initialize it to empty object
    if (!planObj) {
      planObj = {
        name: 'Free (Default)',
        slug: 'free',
        aiLimits: {
          jobPostLimit: 2,
          aiJdGenerator: 5,
          outreachCampaigns: 5,
          customReports: 2,
          aiCopilot: 10
        }
      };
    }

    const limits = planObj.aiLimits || {};
    // Ensure all AI limits have a default value so frontend UI doesn't hide them
    limits.aiJdGenerator = limits.aiJdGenerator !== undefined ? limits.aiJdGenerator : 0;
    limits.aiJdParsing = limits.aiJdParsing !== undefined ? limits.aiJdParsing : 0;
    limits.aiCopilot = limits.aiCopilot !== undefined ? limits.aiCopilot : 0;
    limits.interviewKits = limits.interviewKits !== undefined ? limits.interviewKits : 0;
    
    // Add top level limits for convenience
    limits.unlockCredits = planObj.unlockCredits || 0;
    limits.jobPostLimit = limits.jobPostLimit !== undefined ? limits.jobPostLimit : 0;
    limits.jobBoostJobsLimit = limits.jobBoostJobsLimit !== undefined ? limits.jobBoostJobsLimit : 0;
    limits.outreachCampaigns = limits.outreachCampaigns !== undefined ? limits.outreachCampaigns : 0;
    limits.customReports = limits.customReports !== undefined ? limits.customReports : 0;
    limits.directMessaging = limits.directMessaging !== undefined ? limits.directMessaging : 0;

    let usageObj = {};

    // 3. Fetch usage if a subscription exists
    if (subscriptionDoc) {
      const usageDoc = await RecruiterAiUsage.findOne({
        recruiterId: userId,
        subscriptionId: subscriptionDoc._id,
        periodStart: { $lte: new Date() },
        periodEnd: { $gte: new Date() }
      });
      if (usageDoc) {
        usageObj = usageDoc.usage.toObject ? usageDoc.usage.toObject() : usageDoc.usage;
      }
    }

    // 4. Inject live database counts for non-AI features
    try {
      const OutreachCampaign = require('../models/OutreachCampaign');
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const activeJobsCount = await prisma.jobPost.count({
        where: { recruiter: String(userId), createdAt: { gte: startOfMonth } },
      });

      const campaignsCount = await OutreachCampaign.countDocuments({ recruiterId: userId });
      const activeBoostsCount = await prisma.jobPost.count({
        where: {
          recruiter: String(userId),
          isBoosted: true,
          boostExpiresAt: { gt: new Date() },
        },
      });

      // Use subscription's own unlockCreditsUsed counter (scoped to subscription period, not calendar month)
      const unlocksUsed = subscriptionDoc ? (subscriptionDoc.unlockCreditsUsed || 0) : 0;
      
      usageObj.activeJobs = activeJobsCount;
      usageObj.outreachCampaigns = campaignsCount;
      usageObj.jobBoostJobsLimit = activeBoostsCount;
      usageObj.unlockCredits = unlocksUsed;
    } catch(e) {
      console.error('Error counting dynamic usage', e);
    }

    res.json({
      success: true,
      limits,
      usage: usageObj,
      planDetails: {
        name: planObj.name,
        slug: planObj.slug,
        unlocksRemaining: profile.unlocksRemaining,
        boostJobsRemaining: profile.boostJobsRemaining,
        boostDaysRemaining: profile.boostDaysRemaining
      }
    });

  } catch (error) {
    console.error('getAiUsage error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch usage limits' });
  }
};

module.exports = {
  getAiUsage,
  addCandidateNote,
  addCandidateTag,
  rejectCandidate,
  getRecruiterProfile,
  getRecruiterTransactions,
  getInterestedCandidates,
  getShortlistedCandidates,
  addShortlistedCandidate,
  removeShortlistedCandidate,
  getSavedCandidates,
  addSavedCandidate,
  removeSavedCandidate,
  // ==========================================
  getDashboard,
  updateProfile,
  searchProviders,
  viewProvider,
  unlockContact,
  postJob,
  getMyJobs,
  getJobById,
  getJobPostings,
  aiSearchCandidates,
  parseSearchQuery,
  addCandidateToJob,
  getJobCandidates,
  viewCandidateContact,
  getRecruiterPlanSummary,
  getPlans,
  purchasePlan,
  addReview,
  uploadProfilePhoto,
  deleteProfilePhoto,
  getMyHistory,
  checkUnlockStatus,
  generateAIJobDescription,
  deleteJob,
  updateJob,

  // Create custom plan request
  createCustomPlanRequest: async (req, res) => {
    try {
      const { durationMonths, selectedFeatures, notes, jobsPerMonth, profileUnlocks, campaigns, boostJobs } = req.body;
      
      if (!durationMonths || durationMonths < 1) {
        return res.status(400).json({ success: false, message: 'Invalid duration' });
      }

      const setting = await prisma.adminSetting.findUnique({ where: { key: 'custom_plan_pricing' } });
      const pricing = setting?.value || {
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

      const featuresCost = (selectedFeatures || []).reduce((acc, featureLabel) => {
        // Map UI label to pricing key
        let key = null;
        if (featureLabel.includes('Copilot')) key = 'copilot';
        else if (featureLabel.includes('Parser')) key = 'resume_parser';
        else if (featureLabel.includes('Interview')) key = 'interview_kits';
        else if (featureLabel.includes('Email')) key = 'automated_email';
        else if (featureLabel.includes('Export')) key = 'data_export';
        
        return acc + (key ? (pricing[key] || 0) : 0);
      }, 0);

      const estimatedPrice = (
        featuresCost +
        ((jobsPerMonth || 0) * (pricing.jobPrice || 0)) +
        ((profileUnlocks || 0) * (pricing.unlockPrice || 0)) +
        ((campaigns || 0) * (pricing.campaignPrice || 0)) +
        ((boostJobs || 0) * (pricing.boostJobPrice || 0)) +
        ((req.body.boostDays || 0) * (pricing.boostDayPrice || 0))
      ) * Math.max(1, durationMonths);

      const request = withLegacyId(await prisma.customPlanRequest.create({ data: {
        recruiterId: String(req.user._id),
        durationMonths,
        selectedFeatures: selectedFeatures || [],
        notes: notes || '',
        jobsPerMonth: jobsPerMonth || 0,
        profileUnlocks: profileUnlocks || 0,
        campaigns: campaigns || 0,
        boostJobs: boostJobs || 0,
        boostDays: req.body.boostDays || 0,
        estimatedPrice,
        status: 'pending'
      } }));

      res.status(201).json({
        success: true,
        message: 'Custom plan request submitted successfully',
        data: request
      });
    } catch (error) {
      console.error('Error creating custom plan request:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getMyCustomPlanRequests: async (req, res) => {
    try {
      const requests = (await prisma.customPlanRequest.findMany({
        where: { recruiterId: String(req.user._id) }, orderBy: { createdAt: 'desc' },
      })).map(withLegacyId);
      res.status(200).json({ success: true, data: requests });
    } catch (error) {
      console.error('Error fetching my custom plan requests:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  cancelCustomPlanRequest: async (req, res) => {
    try {
      const request = withLegacyId(await prisma.customPlanRequest.findFirst({
        where: { id: String(req.params.id), recruiterId: String(req.user._id) },
      }));
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
      if (request.offerDetails?.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'Cannot cancel a plan that has already been purchased.' });
      }
      await prisma.customPlanRequest.update({ where: { id: request._id }, data: { status: 'closed' } });
      res.status(200).json({ success: true, message: 'Custom plan request cancelled.' });
    } catch (error) {
      console.error('Error cancelling custom plan request:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
  
  // Tasks endpoints
  getTasks: async (req, res) => {
    try {
      const tasks = withLegacyIds(await prisma.task.findMany({
        where: { recruiterId: String(req.user._id) },
        orderBy: { order: 'asc' },
      }));
      res.json(tasks);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error fetching tasks' });
    }
  },
  
  createTask: async (req, res) => {
    try {
      const status = req.body.status || 'todo';
      const count = await prisma.task.count({
        where: { recruiterId: String(req.user._id), status },
      });
      const task = withLegacyId(await prisma.task.create({ data: {
        recruiterId: String(req.user._id),
        title: String(req.body.title || ''),
        status,
        order: Number(req.body.order ?? count),
        priority: req.body.priority || 'Medium',
        dueDate: req.body.dueDate || 'No date',
        candidateName: req.body.candidateName || '',
        candidateRole: req.body.candidateRole || '',
        jobId: req.body.jobId ? String(req.body.jobId) : null,
        aiSuggested: req.body.aiSuggested === true,
        attachments: Number(req.body.attachments || 0),
        comments: Number(req.body.comments || 0),
      } }));
      res.status(201).json(task);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error creating task' });
    }
  },
  
  updateTask: async (req, res) => {
    try {
      const existingTask = await prisma.task.findFirst({
        where: { id: String(req.params.id), recruiterId: String(req.user._id) },
        select: { id: true },
      });
      if (!existingTask) return res.status(404).json({ message: 'Task not found' });
      const allowed = [
        'title', 'status', 'priority', 'dueDate', 'candidateName', 'candidateRole',
        'jobId', 'aiSuggested', 'attachments', 'comments', 'order',
      ];
      const data = Object.fromEntries(allowed
        .filter((key) => req.body[key] !== undefined)
        .map((key) => [key, req.body[key]]));
      for (const key of ['attachments', 'comments', 'order']) {
        if (data[key] !== undefined) data[key] = Number(data[key]);
      }
      if (data.jobId != null) data.jobId = String(data.jobId);
      const task = withLegacyId(await prisma.task.update({
        where: { id: existingTask.id },
        data,
      }));
      res.json(task);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error updating task' });
    }
  },
  
  deleteTask: async (req, res) => {
    try {
      const task = await prisma.task.findFirst({
        where: { id: String(req.params.id), recruiterId: String(req.user._id) },
        select: { id: true },
      });
      if (!task) return res.status(404).json({ message: 'Task not found' });
      await prisma.task.delete({ where: { id: task.id } });
      res.json({ message: 'Task deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error deleting task' });
    }
  },
  
  updateApplicationStatus,
  deleteApplication,
  viewCv,
  getRecruiterReputation,

  // Outreach Campaigns
  getOutreachCampaigns: async (req, res) => {
    try {
      if (!enabled('ENABLE_OUTREACH')) {
        return res.status(503).json({ message: 'Outreach is disabled', code: 'OUTREACH_DISABLED' });
      }
      const OutreachCampaign = require('../models/OutreachCampaign');
      const campaigns = await OutreachCampaign.find({ recruiterId: req.user._id }).sort({ createdAt: -1 }).populate('jobId', 'title location');
      res.json(campaigns);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error fetching campaigns' });
    }
  },

  getOutreachPreview: async (req, res) => {
    try {
      if (!enabled('ENABLE_OUTREACH')) {
        return res.status(503).json({ message: 'Outreach is disabled', code: 'OUTREACH_DISABLED' });
      }
      const { jobId } = req.params;
      const JobPost = require('../models/JobPost');
      const ProviderProfile = require('../models/ProviderProfile');

      const job = await JobPost.findOne({ _id: jobId, recruiter: req.user._id });
      if (!job) return res.status(404).json({ message: 'Job not found' });

      let matchingCandidates = [];
      let totalCount = 0;
      
      // Build a robust search query based on job skill and title
      const searchTerms = [];
      if (job.skill) {
        // split comma-separated skills if any
        job.skill.split(',').forEach(s => {
          if(s.trim()) searchTerms.push(s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        });
      }
      if (job.title) {
        // extract key words from title (simplistic approach: just use the whole title as a fallback if no skills)
        if (searchTerms.length === 0) {
           searchTerms.push(job.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        }
      }
      
      if (searchTerms.length > 0) {
        const regexPattern = new RegExp(searchTerms.join('|'), 'i');
        const query = {
          $or: [
            { skills: regexPattern },
            { roles: regexPattern },
            { expandedSkills: regexPattern },
            { 'specialities.name': regexPattern }
          ]
        };

        // Find top matches for preview
        matchingCandidates = await ProviderProfile.find(query).populate('user', 'name email avatar').limit(15);
        
        // Get total matches
        totalCount = await ProviderProfile.countDocuments(query);
      }

      const candidatesToEmail = matchingCandidates.filter(c => c.user && c.user.email);

      res.json({
        totalMatchCount: totalCount,
        previewCandidates: candidatesToEmail.slice(0, 5).map(c => ({
          _id: c._id,
          name: c.user?.name || 'Candidate',
          role: c.headline || 'Professional',
          avatar: c.user?.avatar || null
        }))
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error generating preview' });
    }
  },

  runOutreachCampaign: async (req, res) => {
    try {
      if (!enabled('ENABLE_OUTREACH')) {
        return res.status(503).json({ message: 'Outreach is disabled', code: 'OUTREACH_DISABLED' });
      }
      const { jobId } = req.params;
      const { messageTemplate } = req.body || {};
      const JobPost = require('../models/JobPost');
      const ProviderProfile = require('../models/ProviderProfile');
      const OutreachCampaign = require('../models/OutreachCampaign');
      const { outreachQueue } = require('../utils/outreachQueue');

      const job = await JobPost.findOne({ _id: jobId, recruiter: req.user._id });
      if (!job) return res.status(404).json({ message: 'Job not found' });

      let matchingCandidates = [];
      const searchTerms = [];
      if (job.skill) {
        job.skill.split(',').forEach(s => {
          if(s.trim()) searchTerms.push(s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        });
      }
      if (job.title) {
        if (searchTerms.length === 0) {
           searchTerms.push(job.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        }
      }
      
      if (searchTerms.length > 0) {
        const regexPattern = new RegExp(searchTerms.join('|'), 'i');
        const query = {
          $or: [
            { skills: regexPattern },
            { roles: regexPattern },
            { expandedSkills: regexPattern },
            { 'specialities.name': regexPattern }
          ]
        };
        matchingCandidates = await ProviderProfile.find(query).populate('user', 'name email avatar');
      }

      // Filter to only those with emails
      const candidatesToEmail = matchingCandidates.filter(c => c.user && c.user.email);

      const candidateData = candidatesToEmail.map(c => ({
        candidateId: c._id,
        name: c.user?.name || 'Candidate',
        email: c.user?.email,
        avatar: c.user?.avatar || null
      }));

      // Create Campaign Record
      const campaign = await OutreachCampaign.create({
        recruiterId: req.user._id,
        jobId: job._id,
        jobTitle: job.title,
        candidatesContacted: candidatesToEmail.length,
        candidates: candidateData,
        status: 'running'
      });

      // Add jobs to BullMQ
      for (const candidate of candidatesToEmail) {
        await outreachQueue.add('send-email', {
          candidateEmail: candidate.user.email,
          candidateName: candidate.user.name || 'Candidate',
          jobTitle: job.title,
          recruiterName: req.user.name,
          jobUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/jobs/${job._id}`,
          messageTemplate
        });
      }

      // Wait a moment and mark completed (in a real app, the worker would update status based on job completion)
      campaign.status = 'completed';
      await campaign.save();

      res.status(200).json({ message: 'Campaign started', campaign });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error running campaign' });
    }
  },

  // AI Talent Pool endpoints
  getTalentPoolJobs: async (req, res) => {
    try {
      if (!enabled('ENABLE_RECRUITER_AI')) {
        return res.status(503).json({ message: 'Recruiter AI is disabled', code: 'RECRUITER_AI_DISABLED' });
      }
      const JobPost = require('../models/JobPost');
      const AiEvaluation = require('../models/AiEvaluation');
      
      const jobs = await JobPost.find({ recruiter: req.user._id })
        .select('title skill location candidates')
        .populate({
          path: 'candidates.providerProfile',
          populate: { path: 'user', select: 'name email profilePhoto' }
        });
        
      // For each job, get the Top 5 AI Evaluations
      const jobsWithTopCandidates = await Promise.all(jobs.map(async (job) => {
        const evaluations = await AiEvaluation.find({ jobId: job._id })
          .sort({ score: -1 })
          .limit(5)
          .populate({
            path: 'candidateId',
            populate: { path: 'user', select: 'name email profilePhoto' }
          });
          
        return {
          ...job.toObject(),
          aiTopCandidates: evaluations
        };
      }));

      res.json({ success: true, data: jobsWithTopCandidates });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error fetching talent pool' });
    }
  },

  runAIEvaluation: async (req, res) => {
    try {
      if (!enabled('ENABLE_RECRUITER_AI')) {
        return res.status(503).json({ message: 'Recruiter AI is disabled', code: 'RECRUITER_AI_DISABLED' });
      }
      const { jobId } = req.params;
      const JobPost = require('../models/JobPost');
      const AiEvaluation = require('../models/AiEvaluation');
      
      const job = await JobPost.findOne({ _id: jobId, recruiter: req.user._id })
        .populate('candidates.providerProfile');
        
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      // Mock AI Evaluation for demonstration
      // In a real scenario, this would send job.skills and candidate.skills to LLM
      for (const candidate of job.candidates) {
        if (!candidate.providerProfile) continue;
        
        // Check if evaluation already exists
        const exists = await AiEvaluation.findOne({ jobId: job._id, candidateId: candidate.providerProfile._id });
        if (exists) continue;

        // Mock Scoring logic
        const score = Math.floor(Math.random() * (98 - 75 + 1) + 75); // Random score 75-98
        const reasoning = `This candidate has strong skills matching ${job.title}. With a score of ${score}/100, they demonstrate clear proficiency in ${job.skill} and align well with the job requirements.`;

        await AiEvaluation.create({
          jobId: job._id,
          candidateId: candidate.providerProfile._id,
          score,
          reasoning
        });
      }

      res.json({ success: true, message: 'AI Analysis completed for all candidates' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error running AI evaluation' });
    }
  }
};
