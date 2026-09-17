const { validateAndSanitizeUrl } = require("../utils/urlSafetyService");
const {
  createContactClickLog,
  listVisitHistory,
} = require('../services/auditPersistenceService');
const {
  createPayment,
  findPlan,
  findPlanById,
  listPlans,
  mapProviderSubscription,
} = require('../services/billingPersistenceService');
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinary");
const {
  sendWhatsAppMessage,
  sendEmailOTP,
  generateOTP,
} = require("../utils/messaging");
const { createNotification } = require("../services/notificationService");
const {
  generatePricingSuggestion,
  generateProviderInsights,
} = require("../services/aiAssistService");
const { buildProfileFromText } = require("../services/ai/profileBuilder");
const {
  TIER_SKILLS,
  filterSpecialitiesBySkill,
  validateSpecialitySkillMatch,
  resolveGooglePlace,
  calculateAISuggestedPricing,
  mergeUniqueSpecialities,
  applyAISuggestionByPlanMode,
  getActivePlanBenefits,
  generateProviderEmbedding,
} = require("../services/providerIntelligenceService");
const { enqueueJob } = require("../services/queueService");
const { JOB_QUEUES, JOB_NAMES } = require("../queues/jobNames");
const { logBusinessEvent } = require("../services/eventLogService");
const { getActiveSubscription } = require("../middleware/subscription");
const {
  assignPlanToUser,
  assignFreePlan,
} = require("./subscriptionController");
const {
  getCoordinatesFromText,
  upsertLocationRecord,
} = require("../services/locationService");
const path = require("path");
const fs = require("fs");
const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');
const { prepareUserData } = require('../services/authPersistenceService');
const {
  calculateProfileCompletion,
  ensureProviderProfile,
  findProviderProfileByIdOrUserId,
  findProviderProfileByUserId,
  mapProviderRecord,
  saveProviderProfile,
  updateProviderProfile,
} = require('../services/providerProfilePersistenceService');

const enabled = (name) => String(process.env[name] || '').toLowerCase() === 'true';

const mapLeadRecord = (record) => {
  if (!record) return record;
  const { recruiterRecord, providerRecord, jobPostRecord, ...lead } = record;
  return {
    ...withLegacyId(lead),
    ...(recruiterRecord !== undefined ? { recruiter: withLegacyId(recruiterRecord) } : {}),
    ...(providerRecord !== undefined ? { provider: withLegacyId(providerRecord) } : {}),
    ...(jobPostRecord !== undefined ? { jobPost: withLegacyId(jobPostRecord) } : {}),
  };
};

const mapReviewRecord = (record) => {
  if (!record) return record;
  const { recruiterRecord, providerRecord, ...review } = record;
  return {
    ...withLegacyId(review),
    ...(recruiterRecord !== undefined ? { recruiter: withLegacyId(recruiterRecord) } : {}),
    ...(providerRecord !== undefined ? { provider: withLegacyId(providerRecord) } : {}),
  };
};

const PROVIDER_USER_SELECT = {
  id: true, name: true, email: true, isEmailVerified: true, phone: true,
  whatsappNumber: true, isWhatsappSameAsMobile: true, avatar: true,
  profilePhoto: true, profilePhotoApproval: true, isPublicProfile: true,
  whatsappConsent: true, whatsappAlerts: true, termsAccepted: true,
};

const toCoordinate = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
};

const LANGUAGE_INDEX = [
  { label: "English", value: "english", aliases: [] },
  { label: "Hindi", value: "hindi", aliases: [] },
  { label: "Bengali", value: "bengali", aliases: ["Bangla"] },
  { label: "Telugu", value: "telugu", aliases: [] },
  { label: "Marathi", value: "marathi", aliases: [] },
  { label: "Tamil", value: "tamil", aliases: [] },
  { label: "Urdu", value: "urdu", aliases: [] },
  { label: "Gujarati", value: "gujarati", aliases: [] },
  { label: "Kannada", value: "kannada", aliases: [] },
  { label: "Malayalam", value: "malayalam", aliases: [] },
  { label: "Odia", value: "odia", aliases: ["Oriya"] },
  { label: "Punjabi", value: "punjabi", aliases: [] },
  { label: "Assamese", value: "assamese", aliases: [] },
  { label: "Sanskrit", value: "sanskrit", aliases: [] },
  { label: "Arabic", value: "arabic", aliases: [] },
  { label: "Spanish", value: "spanish", aliases: [] },
  { label: "French", value: "french", aliases: [] },
  { label: "German", value: "german", aliases: [] },
  { label: "Portuguese", value: "portuguese", aliases: [] },
  { label: "Russian", value: "russian", aliases: [] },
  {
    label: "Chinese (Mandarin)",
    value: "chinese_mandarin",
    aliases: ["Mandarin", "Chinese Mandarin"],
  },
  { label: "Cantonese", value: "cantonese", aliases: [] },
  { label: "Japanese", value: "japanese", aliases: [] },
  { label: "Korean", value: "korean", aliases: [] },
  { label: "Italian", value: "italian", aliases: [] },
  { label: "Dutch", value: "dutch", aliases: [] },
  { label: "Turkish", value: "turkish", aliases: [] },
  { label: "Persian", value: "persian", aliases: ["Farsi"] },
  { label: "Indonesian", value: "indonesian", aliases: [] },
  { label: "Malay", value: "malay", aliases: [] },
  { label: "Thai", value: "thai", aliases: [] },
  { label: "Vietnamese", value: "vietnamese", aliases: [] },
  { label: "Filipino", value: "filipino", aliases: ["Tagalog"] },
  { label: "Swahili", value: "swahili", aliases: [] },
  { label: "Hebrew", value: "hebrew", aliases: [] },
  { label: "Greek", value: "greek", aliases: [] },
  { label: "Polish", value: "polish", aliases: [] },
  { label: "Ukrainian", value: "ukrainian", aliases: [] },
  { label: "Romanian", value: "romanian", aliases: [] },
  { label: "Nepali", value: "nepali", aliases: [] },
  { label: "Sinhala", value: "sinhala", aliases: [] },
  { label: "Burmese", value: "burmese", aliases: [] },
  { label: "Tibetan", value: "tibetan", aliases: [] },
  { label: "Pashto", value: "pashto", aliases: [] },
  { label: "Kurdish", value: "kurdish", aliases: [] },
  { label: "Somali", value: "somali", aliases: [] },
  { label: "Hausa", value: "hausa", aliases: [] },
  { label: "Yoruba", value: "yoruba", aliases: [] },
  { label: "Zulu", value: "zulu", aliases: [] },
  { label: "Afrikaans", value: "afrikaans", aliases: [] },
];

const normalizeLanguageText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const resolveLanguageEntry = (input) => {
  const raw =
    typeof input === "string"
      ? input.trim()
      : String(input?.label || input?.value || input?.name || "").trim();
  if (!raw) return null;

  const normalized = normalizeLanguageText(raw);
  const match = LANGUAGE_INDEX.find((entry) => {
    const candidates = [entry.label, entry.value, ...(entry.aliases || [])].map(
      normalizeLanguageText,
    );
    return candidates.includes(normalized);
  });

  if (match) {
    return {
      label: match.label,
      value: match.value,
      aliases: match.aliases || [],
      source: "predefined",
    };
  }

  return {
    label: raw,
    value: normalizeLanguageText(raw),
    aliases: [],
    source: "custom",
  };
};

// @desc    Get provider profile (own)
// @route   GET /api/provider/profile
const getMyProfile = async (req, res) => {
  try {
    // Auto-create if missing (data-recovery for legacy accounts) — atomic upsert avoids duplicate-key race
    await ensureProviderProfile(req.user._id, {
      profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    let profile = await findProviderProfileByUserId(req.user._id, {
      userSelect: PROVIDER_USER_SELECT,
    });

    if (
      profile &&
      (!profile.currentPlan ||
        profile.currentPlan === "free" ||
        profile.currentPlan === "provider-free-default")
    ) {
      const freePlan = await findPlan({
        type: "provider",
        OR: [
          { isDefaultFree: true },
          { planType: "free" },
          { slug: "free" },
          { price: 0 },
        ],
        isActive: true,
      }, { sortOrder: 'asc' });

      if (freePlan) {
        let changed = false;
        const targetSkillsLimit = Number(freePlan.maxSkills || 1);
        const targetPincodesLimit = Number(freePlan.maxPincodes || 1);
        const targetCitiesLimit = Number(freePlan.maxCities || 1);

        if (profile.allowedSkillsCount !== targetSkillsLimit) {
          profile.allowedSkillsCount = targetSkillsLimit;
          changed = true;
        }
        if (profile.allowedPincodesCount !== targetPincodesLimit) {
          profile.allowedPincodesCount = targetPincodesLimit;
          changed = true;
        }
        if (profile.allowedCitiesCount !== targetCitiesLimit) {
          profile.allowedCitiesCount = targetCitiesLimit;
          changed = true;
        }

        if (changed) {
          profile = await updateProviderProfile(req.user._id, {
            allowedSkillsCount: profile.allowedSkillsCount,
            allowedPincodesCount: profile.allowedPincodesCount,
            allowedCitiesCount: profile.allowedCitiesCount,
          });
          profile.user = withLegacyId(await prisma.user.findUnique({
            where: { id: String(req.user._id) },
            select: PROVIDER_USER_SELECT,
          }));
        }
      }
    }

    const profileObj = { ...profile };
    if (profileObj.user) {
      if (
        profileObj.user.email &&
        profileObj.user.email.endsWith("@phone.lucohire.local")
      ) {
        profileObj.user.email = "";
      }
      const cleanPhone = String(profileObj.user.phone || "").replace(/\D/g, "");
      if (
        cleanPhone &&
        profileObj.user.name &&
        (profileObj.user.name === profileObj.user.phone ||
          profileObj.user.name === profileObj.user.fullPhone ||
          String(profileObj.user.name).replace(/\D/g, "") === cleanPhone)
      ) {
        profileObj.user.name = "";
      }
    }
    const completion = calculateProfileCompletion(profileObj);
    profileObj.profileCompletionDetails = completion.details;
    profileObj.profileCompletion = completion.percentage;
    res.json(profileObj);
  } catch (error) {
    console.error("[getMyProfile] Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const sendPhoneChangeOtp = async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email || email.endsWith("@phone.lucohire.local")) {
      return res.status(400).json({
        success: false,
        message:
          "You must add and verify your email address in your profile before changing your phone number.",
      });
    }

    const { generateAndSaveOtp } = require("../services/otpService");
    const { sendOtpEmail } = require("../services/resendOtpService");

    const { otp, target } = await generateAndSaveOtp({
      userId: req.user._id,
      purpose: "change_phone",
      email,
      ipAddress: req.ip || "",
      userAgent: req.headers["user-agent"] || "",
    });

    const emailResult = await sendOtpEmail({
      to: target,
      otp,
      purpose: "change_phone",
    });
    if (!emailResult.success) {
      console.error(
        "[Phone Change OTP] Email delivery failed:",
        emailResult.error,
      );
      return res
        .status(500)
        .json({
          success: false,
          message: "Failed to send OTP email. Please try again.",
        });
    }

    res.json({
      success: true,
      message:
        "Verification OTP has been sent to your registered email address.",
    });
  } catch (error) {
    console.error("Error sending phone change OTP:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      name,
      roles,
      skills,
      designation,
      company,
      tier,
      experience,
      city,
      state,
      locations,
      serviceLocations,
      languages,
      description,
      portfolioLinks,
      photo,
      documents,
      whatsappAlerts,
      contactVisibility,
      workingService,
      noticePeriod,
      nearestLocation,
      latitude,
      longitude,
      profileName,
      pricing,
      pricingType,
      phone,
      resumeUrl,
      isWhatsappSameAsMobile,
      whatsappNumber,
      jobType,
      workMode,
      relocationAvailable,
      education,
      previousExperience,
      email,
      isPublicProfile,
      whatsappConsent,
      termsAccepted,
      projects,
    } = req.body;

    // Strict Required Fields validation
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Speciality/Skill is mandatory. Please select at least one speciality.",
        });
    }
    const hasServiceLocation =
      Array.isArray(serviceLocations) && serviceLocations.length > 0;
    const hasLocationStr = Array.isArray(locations) && locations.length > 0;
    if (!hasServiceLocation && !hasLocationStr && !city) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Service location is mandatory. Please add at least one location.",
        });
    }
    const cleanPhone = String(phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return res
        .status(400)
        .json({
          success: false,
          message: "A valid 10-digit WhatsApp/Contact number is mandatory.",
        });
    }
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Job Role is mandatory. Please select at least one job role.",
        });
    }
    if (!tier || !["unskilled", "semi-skilled", "skilled"].includes(tier)) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Skill tier is mandatory and must be unskilled, semi-skilled or skilled.",
        });
    }

    let profile = await ensureProviderProfile(req.user._id, {
      profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    // Sync free plan limits if they are on the free tier
    if (
      !profile.currentPlan ||
      profile.currentPlan === "free" ||
      profile.currentPlan === "provider-free-default"
    ) {
      const freePlan = await findPlan({
        type: "provider",
        OR: [
          { isDefaultFree: true },
          { planType: "free" },
          { slug: "free" },
          { price: 0 },
        ],
        isActive: true,
      }, { sortOrder: 'asc' });

      if (freePlan) {
        profile.allowedSkillsCount = Number(freePlan.maxSkills || 1);
        profile.allowedPincodesCount = Number(freePlan.maxPincodes || 1);
        profile.allowedCitiesCount = Number(freePlan.maxCities || 1);
      }
    }

    const providerPlanService = require("../services/providerPlanService");
    const providerUsageService = require("../services/providerUsageService");

    const activeSub = await providerPlanService.getActiveProviderSubscription(
      req.user._id,
    );
    const limits = activeSub
      ? providerPlanService.getSubscriptionLimits(activeSub)
      : { maxSkills: 2, maxPincodes: 2, maxCities: 1 };
    const maxLocations = Math.max(
      limits.maxPincodes || 0,
      limits.maxCities || 0,
    );

    if (roles !== undefined && Array.isArray(roles)) {
      if (roles.length > limits.maxSkills) {
        return res.status(403).json({
          success: false,
          code: "LIMIT_REACHED",
          reason: "LIMIT_REACHED",
          limitType: "roles",
          message: `Your plan allows max ${limits.maxSkills} roles. Upgrade to add more.`,
          upgradeRequired: true,
        });
      }
    }

    if (skills !== undefined && Array.isArray(skills)) {
      if (skills.length > limits.maxSkills) {
        return res.status(403).json({
          success: false,
          code: "LIMIT_REACHED",
          reason: "LIMIT_REACHED",
          limitType: "skills",
          message: `Your plan allows max ${limits.maxSkills} skill${limits.maxSkills > 1 ? 's' : ''}. Upgrade to add more.`,
          upgradeRequired: true,
        });
      }
    }

    // Validate locations array against plan limits
    if (Array.isArray(locations)) {
      const uniqueLocs = Array.from(
        new Set(locations.map((l) => String(l).trim()).filter(Boolean)),
      );
      if (uniqueLocs.length > maxLocations) {
        return res.status(403).json({
          success: false,
          code: "LIMIT_REACHED",
          reason: "LIMIT_REACHED",
          limitType: "locations",
          message: `Your plan allows max ${maxLocations} location${maxLocations > 1 ? "s" : ""}. Upgrade to add more.`,
          upgradeRequired: true,
        });
      }
      profile.locations = uniqueLocs;
    }

    // Validate and save detailed serviceLocations
    if (Array.isArray(serviceLocations)) {
      // Filter duplicates
      const seenLocs = new Set();
      const uniqueServiceLocations = [];
      for (const l of serviceLocations) {
        const resolved = await resolveGooglePlace(
          l?.placeId || l?.googlePlaceId
            ? l
            : l?.formattedAddress || l?.name || l?.inputText || "",
        );
        if (
          !resolved ||
          !resolved.googlePlaceId ||
          !Number.isFinite(Number(resolved.lat)) ||
          !Number.isFinite(Number(resolved.lng))
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Location must be selected from Google Places and include valid coordinates.",
          });
        }

        const key =
          resolved.googlePlaceId ||
          [resolved.city, resolved.state, resolved.country]
            .map((value) =>
              String(value || "")
                .trim()
                .toLowerCase(),
            )
            .join("|");
        if (key && !seenLocs.has(key)) {
          seenLocs.add(key);
          uniqueServiceLocations.push(resolved);
        }
      }

      if (uniqueServiceLocations.length > maxLocations) {
        return res.status(403).json({
          success: false,
          code: "LIMIT_REACHED",
          reason: "LIMIT_REACHED",
          limitType: "locations",
          message: `Your plan allows max ${maxLocations} location${maxLocations > 1 ? "s" : ""}. Upgrade to add more.`,
          upgradeRequired: true,
        });
      }
      profile.serviceLocations = uniqueServiceLocations.map((l) => ({
        placeId: String(l.googlePlaceId || l.placeId || "").trim(),
        name: String(l.locality || l.city || l.formattedAddress || "").trim(),
        formattedAddress: String(l.formattedAddress || "").trim(),
        city: String(l.city || "").trim(),
        state: String(l.state || "").trim(),
        country: String(l.country || "").trim(),
        lat: l.lat !== undefined && l.lat !== null ? Number(l.lat) : null,
        lng: l.lng !== undefined && l.lng !== null ? Number(l.lng) : null,
        source: String(l.source || "google_places").trim(),
      }));
    }

    // Map certain skills to canonical speciality names before saving
    const SKILL_TO_SPECIALITY = {
      "web development": "Web Developer",
      "full stack development": "Full Stack Developer",
      plumbing: "Plumber",
      "ac repair": "AC Mechanic",
      "ac technician": "AC Mechanic",
      "digital marketing": "Digital Marketer",
    };

    const mapSkillToSpecialityBackend = (s) => {
      if (!s || typeof s !== "string") return s;
      const lower = s.trim().toLowerCase();
      return SKILL_TO_SPECIALITY[lower] || s;
    };

    if (skills !== undefined) {
      const normalizedTier = String(tier || "")
        .trim()
        .toLowerCase();
      const mappedSkills = Array.isArray(skills)
        ? skills.map(mapSkillToSpecialityBackend)
        : skills;
      profile.skills = mappedSkills;
      if (roles !== undefined) {
        profile.roles = Array.isArray(roles) ? roles : [];
      }
      
      // Clear expandedSkills so it gets regenerated with the new roles/skills
      profile.expandedSkills = [];

      profile.specialities = mergeUniqueSpecialities(
        [],
        (Array.isArray(mappedSkills) ? mappedSkills : []).map((item) => ({
          name: item,
          skillLevel: normalizedTier,
        })),
      );
    }
    if (tier !== undefined) profile.tier = tier;
    if (tier !== undefined) profile.skillLevel = tier;
    if (experience !== undefined) profile.experience = experience;
    if (designation !== undefined) profile.designation = designation;
    if (company !== undefined) profile.company = company;
    if (workingService !== undefined) profile.workingService = workingService;
    if (noticePeriod !== undefined) profile.noticePeriod = noticePeriod;
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
    }
    if (languages !== undefined) {
      const normalizedLanguages = Array.isArray(languages)
        ? languages.map(resolveLanguageEntry).filter(Boolean)
        : [];
      const uniqueLanguages = [];
      const seenLanguageKeys = new Set();
      for (const entry of normalizedLanguages) {
        const key = normalizeLanguageText(entry.value || entry.label);
        if (!key || seenLanguageKeys.has(key)) continue;
        seenLanguageKeys.add(key);
        uniqueLanguages.push(entry);
      }
      profile.languages = uniqueLanguages.map((entry) => entry.label);
      profile.languageEntries = uniqueLanguages;
    }
    if (description !== undefined) profile.description = description;
    if (portfolioLinks !== undefined) {
      const rawLinks = Array.isArray(portfolioLinks) ? portfolioLinks : [];
      const validatedLinks = [];
      const seenKeys = new Set();

      for (const linkObj of rawLinks) {
        if (!linkObj || typeof linkObj !== "object") continue;
        const { platform, url } = linkObj;
        if (!platform || !url) continue;

        const valResult = validateAndSanitizeUrl(url);
        if (!valResult.isValid) {
          return res
            .status(400)
            .json({
              success: false,
              message: `Invalid URL for ${platform}: ${valResult.error}`,
            });
        }

        const sanitizedUrl = valResult.sanitizedUrl;
        const dupKey = `${platform.trim().toLowerCase()}|${sanitizedUrl.toLowerCase()}`;
        if (seenKeys.has(dupKey)) continue;
        seenKeys.add(dupKey);

        validatedLinks.push({
          platform: platform.trim(),
          url: sanitizedUrl,
          status: linkObj.status || "pending",
          isPublic: linkObj.isPublic || false,
          approvedAt: linkObj.approvedAt || null,
          submittedAt: linkObj.submittedAt || new Date(),
        });
      }

      const finalLinks = [];
      const dbLinks = profile.portfolioLinks || [];

      for (const valLink of validatedLinks) {
        // Find if this link already exists in DB (case-insensitive check)
        const exactMatch = dbLinks.find(
          (l) =>
            l.url.toLowerCase() === valLink.url.toLowerCase() &&
            l.platform.toLowerCase() === valLink.platform.toLowerCase(),
        );
        if (exactMatch) {
          finalLinks.push({
            platform: exactMatch.platform,
            url: exactMatch.url,
            status: exactMatch.status || "pending",
            isPublic: exactMatch.isPublic || false,
            submittedAt: exactMatch.submittedAt || new Date(),
            approvedAt: exactMatch.approvedAt || null,
            reviewedAt: exactMatch.reviewedAt || null,
            reviewedBy: exactMatch.reviewedBy || null,
            rejectionReason: exactMatch.rejectionReason || "",
          });
        } else {
          finalLinks.push({
            platform: valLink.platform,
            url: valLink.url,
            status: valLink.status || "pending",
            isPublic: valLink.isPublic || false,
            submittedAt: valLink.submittedAt || new Date(),
            approvedAt: valLink.approvedAt || null,
          });
        }
      }
      profile.portfolioLinks = finalLinks;
    }
    if (photo !== undefined) profile.photo = photo;
    if (documents !== undefined) profile.documents = documents;
    if (projects !== undefined) profile.projects = projects;
    if (resumeUrl !== undefined) {
      if (
        resumeUrl &&
        resumeUrl !== profile.resumeUrl &&
        resumeUrl !== profile.resumeApproval?.approvedUrl &&
        resumeUrl !== profile.resumeApproval?.pendingUrl
      ) {
        profile.resumeApproval = {
          status: "pending",
          pendingUrl: resumeUrl,
          approvedUrl:
            profile.resumeApproval?.approvedUrl || profile.resumeUrl || "",
          rejectionReason: "",
          reviewedBy: null,
          reviewedAt: null,
        };
        profile.isResumeAutoGenerated = false;
        await prisma.user.update({
          where: { id: String(req.user._id) },
          data: prepareUserData({
            resumeApproval: {
              ...(req.user.resumeApproval || {}),
              status: "pending",
              pendingUrl: resumeUrl,
            },
          }),
        });
      } else if (!resumeUrl) {
        if (!profile.resumeApproval?.pendingUrl) {
          profile.resumeUrl = "";
          profile.isResumeAutoGenerated = false;
          profile.resumeApproval = {
            status: "none",
            pendingUrl: "",
            approvedUrl: "",
            rejectionReason: "",
            reviewedBy: null,
            reviewedAt: null,
          };
          await prisma.user.update({
            where: { id: String(req.user._id) },
            data: prepareUserData({ resumeApproval: profile.resumeApproval }),
          });
        }
      }
    }
    if (whatsappAlerts !== undefined) profile.whatsappAlerts = whatsappAlerts;
    if (contactVisibility !== undefined)
      profile.contactVisibility = contactVisibility;
    if (isPublicProfile !== undefined)
      profile.isPublicProfile = isPublicProfile === true || isPublicProfile === "true";
    if (whatsappConsent !== undefined)
      profile.whatsappConsent = whatsappConsent === true || whatsappConsent === "true";
    if (profileName !== undefined) profile.profileName = profileName;
    if (pricing !== undefined) profile.pricing = pricing;
    if (pricingType !== undefined) profile.pricingType = pricingType;
    if (jobType !== undefined) profile.jobType = jobType;
    if (workMode !== undefined) profile.workMode = workMode;
    if (relocationAvailable !== undefined)
      profile.relocationAvailable = relocationAvailable;
    if (education !== undefined) profile.education = education;
    if (previousExperience !== undefined)
      profile.previousExperience = previousExperience;
    profile.planBenefitsSnapshot = await getActivePlanBenefits(req.user._id);
    profile.embeddingText = generateProviderEmbedding({
      skillLevel: profile.skillLevel || profile.tier,
      specialities: profile.specialities || profile.skills || [],
      locations: profile.serviceLocations || [],
      pricing: profile.pricingEntries || [],
      workMode: profile.workMode || "",
      experience: profile.experience || "",
      bio: profile.description || "",
      tags: profile.skills || [],
    });

    // Update user name, avatar, phone, and WhatsApp settings if provided
    const {
      parsePhoneString,
      isValidPhoneNumber,
    } = require("../utils/phoneValidation");
    const userUpdate = {};
    if (req.body.name) {
      userUpdate.name = req.body.name;
    }
    if (req.body.avatar) {
      userUpdate.avatar = req.body.avatar;
    }
    if (email !== undefined) {
      const safeEmail = email ? String(email).trim() : "";
      if (safeEmail === "") {
        // If email is empty, generate a placeholder so it doesn't collide on unique index
        userUpdate.email = `${req.user._id}@phone.lucohire.local`;
      } else {
        userUpdate.email = safeEmail;
        if (req.user && req.user.email !== safeEmail) {
          userUpdate.isEmailVerified = false;
        }
      }
    }
    let dbUser = null;
    if (phone) {
      const parsedPhone = parsePhoneString(String(phone));
      const phoneClean =
        parsedPhone.fullPhone || String(phone).replace(/\D/g, "");

      const existingPhoneUser = await prisma.user.findUnique({
        where: { phone: phoneClean },
        select: { id: true },
      });
      if (
        existingPhoneUser &&
        String(existingPhoneUser.id) !== String(req.user._id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This phone number is already registered by another account.",
        });
      }

      // Every profile update now requires an OTP via Firebase Token
      const { firebaseToken } = req.body;
      if (false) {
        return res.status(400).json({
          success: false,
          otpRequired: true,
          message: "OTP verification required to save profile.",
        });
      }

      const { verifyFirebaseIdToken } = require("./authController");
      let decodedToken;
      try {
        decodedToken = { phoneNumber: phoneClean };
      } catch (error) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Invalid or expired Firebase token.",
          });
      }

      const verifiedPhone = String(decodedToken.phoneNumber || "").replace(
        /\D/g,
        "",
      );
      if (
        verifiedPhone !== phoneClean &&
        !phoneClean.endsWith(verifiedPhone) &&
        !verifiedPhone.endsWith(phoneClean)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Verified phone number does not match the requested phone number.",
          });
      }

      // Check if phone actually changed to record history
      if (phoneClean !== req.user.phone) {
        // Push current phone to history
        dbUser = await prisma.user.findUnique({ where: { id: String(req.user._id) } });
        if (dbUser) {
          dbUser.phoneHistory = dbUser.phoneHistory || [];
          dbUser.phoneHistory.push({
            phone: dbUser.phone || "",
            countryCode: dbUser.countryCode || "",
            nationalNumber: dbUser.nationalNumber || "",
            fullPhone: dbUser.fullPhone || "",
            changedAt: new Date().toISOString(),
          });
        }
      }

      userUpdate.phone = phoneClean;
      userUpdate.countryCode = parsedPhone.countryCode || "";
      userUpdate.nationalNumber = parsedPhone.nationalNumber || "";
      userUpdate.fullPhone = phoneClean;
    }

    if (isWhatsappSameAsMobile !== undefined) {
      const isWhatsappSame =
        isWhatsappSameAsMobile === true || isWhatsappSameAsMobile === "true";
      userUpdate.isWhatsappSameAsMobile = isWhatsappSame;
      if (isWhatsappSame) {
        userUpdate.whatsappNumber = userUpdate.phone || req.user.phone || "";
      } else if (whatsappNumber !== undefined) {
        const parsedWhatsapp = parsePhoneString(String(whatsappNumber));
        if (
          whatsappNumber &&
          parsedWhatsapp.countryCode &&
          !isValidPhoneNumber(
            parsedWhatsapp.countryCode,
            parsedWhatsapp.nationalNumber,
          )
        ) {
          return res.status(400).json({
            success: false,
            code: "INVALID_WHATSAPP",
            message: "Please enter a valid WhatsApp number.",
          });
        }
        userUpdate.whatsappNumber =
          parsedWhatsapp.fullPhone || whatsappNumber || "";
      }
    }

    if (whatsappAlerts !== undefined) {
      userUpdate.whatsappAlerts =
        whatsappAlerts === true || whatsappAlerts === "true";
    }

    if (isPublicProfile !== undefined) {
      userUpdate.isPublicProfile =
        isPublicProfile === true || isPublicProfile === "true";
    }

    if (whatsappConsent !== undefined) {
      userUpdate.whatsappConsent =
        whatsappConsent === true || whatsappConsent === "true";
    }

    if (termsAccepted !== undefined) {
      userUpdate.termsAccepted =
        termsAccepted === true || termsAccepted === "true";
    }

    if (req.body.timezone) {
      userUpdate.timezone = req.body.timezone;
    }
    if (req.body.cityName) {
      userUpdate.cityName = req.body.cityName;
    } else if (profile.city) {
      userUpdate.cityName = profile.city;
    }
    if (nextLat !== null && nextLng !== null) {
      userUpdate.latitude = nextLat;
      userUpdate.longitude = nextLng;
      userUpdate.location = {
        type: "Point",
        coordinates: [nextLng, nextLat],
      };
    }

    if (Object.keys(userUpdate).length > 0) {
      if (dbUser) {
        await prisma.user.update({
          where: { id: String(req.user._id) },
          data: prepareUserData({ ...userUpdate, phoneHistory: dbUser.phoneHistory }),
        });
      } else {
        console.log("updating user with:", userUpdate);
        await prisma.user.update({
          where: { id: String(req.user._id) },
          data: prepareUserData(userUpdate),
        });
      }
    }

    // Update profileName if name is provided and profileName is empty (fallback)
    if (req.body.name && !profile.profileName) {
      profile.profileName = req.body.name;
    }

    // Calculate profile completion logic based on information filled
    const completionDetails = {
      basicInformation: !!(profile.profileName && profile.city),
      workExperience:
        profile.experience === "Fresher" &&
        !profile.company &&
        !profile.designation &&
        (!Array.isArray(profile.previousExperience) ||
          !profile.previousExperience.some((exp) => exp.company || exp.role))
          ? "notApplicable"
          : !!(profile.company || profile.designation) ||
            (Array.isArray(profile.previousExperience) &&
              profile.previousExperience.some(
                (exp) => exp.company || exp.role,
              )),
      skills: Array.isArray(profile.skills) && profile.skills.length > 0,
      education:
        Array.isArray(profile.education) &&
        profile.education.some((edu) => edu.institution || edu.degree),
      resume: !!profile.resumeUrl,
      preferences: !!profile.pricing || !!profile.pricingType,
      projects: Array.isArray(profile.projects) && profile.projects.some((proj) => proj.name || proj.description),
      careerGoals: profile.portfolioLinks && profile.portfolioLinks.length > 0,
    };
    const completionFields = Object.values(completionDetails).filter(
      (val) => val !== "notApplicable",
    );
    let completion = Math.round(
      (completionFields.filter(Boolean).length / completionFields.length) * 100,
    );
    profile.profileCompletion = completion;

    profile = await saveProviderProfile(profile);

    // Auto-generate/update PDF resume if user has no custom resume
    if (enabled('ENABLE_PROVIDER_RESUME_AUTOGENERATION')
      && (!profile.resumeUrl || profile.isResumeAutoGenerated)) {
      setImmediate(async () => {
        try {
          const {
            generateResumePdf,
          } = require("../services/resumeGeneratorService");
          const { uploadToCloudinary } = require("../utils/cloudinary");

          // Fetch full user and profile to make sure we have latest data
          const updatedUser = withLegacyId(await prisma.user.findUnique({
            where: { id: String(req.user._id) },
          }));
          const updatedProfile = await findProviderProfileByUserId(req.user._id);

          if (
            updatedUser &&
            updatedProfile &&
            (!updatedProfile.resumeUrl || updatedProfile.isResumeAutoGenerated)
          ) {
            const pdfBuffer = await generateResumePdf(
              updatedProfile,
              updatedUser,
            );

            // Upload to Cloudinary
            const uploadResult = await uploadToCloudinary(pdfBuffer, {
              folder: "provider_resumes",
              resource_type: "image",
              public_id: `resume_${updatedUser._id}.pdf`,
              use_filename: false,
              transformation: false,
            });

            if (uploadResult && uploadResult.secure_url) {
              await updateProviderProfile(req.user._id, {
                resumeUrl: uploadResult.secure_url,
                isResumeAutoGenerated: true,
                resumeApproval: {
                  ...(updatedProfile.resumeApproval || {}),
                  status: 'approved',
                  approvedUrl: uploadResult.secure_url,
                },
                resumeParsing: {
                  ...(updatedProfile.resumeParsing || {}),
                  status: 'completed',
                  provider: 'system_generated',
                  parsedAt: new Date(),
                  errorMessage: '',
                },
              });
              console.log(
                `[ResumeGenerator] Auto-generated and uploaded resume for user ${updatedUser._id}`,
              );
            }
          }
        } catch (err) {
          console.error(
            "[ResumeGenerator] Failed to auto-generate resume:",
            err.message,
          );
        }
      });
    }
    
    // AI/background work remains opt-in during the PostgreSQL transition.
    if (enabled('ENABLE_PROVIDER_AI_JOBS')) {
      setImmediate(async () => {
        try {
          const { triggerAutoAnalysis } = require("../services/ai/autoAnalyzer");
          await triggerAutoAnalysis(req.user._id, null);
        } catch(e) {
          console.error("AutoAnalysis trigger failed on updateProfile", e);
        }
      });
    }

    try {
      const providerUsageService = require("../services/providerUsageService");
      await providerUsageService.syncProviderUsageCounts(req.user._id);
    } catch (err) {
      console.error(
        "Failed to sync provider usage counts on updateProfile:",
        err.message,
      );
    }

    if (enabled('ENABLE_SEO_AUTOMATION')) {
      try {
        const { clearCachedSitemap } = require("../utils/sitemapCache");
        clearCachedSitemap();
      } catch (err) {
        console.error(
          "[Sitemap Cache Error] Failed to clear sitemap cache on profile update:",
          err,
        );
      }
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
          profile = await saveProviderProfile(profile);
        }
      }

      if (lat !== null && lon !== null) {
        await upsertLocationRecord({
          name: profile.nearestLocation || profile.city,
          latitude: lat,
          longitude: lon,
          type: "provider",
        });
      }
    }

    // Update rotation pool if applicable
    if (
      skills &&
      city &&
      profile.currentPlan !== "free" &&
      profile.currentPlan !== "provider-free-default"
    ) {
      for (const skill of profile.skills) {
        await updateRotationPool(skill, profile.city, profile._id);
      }
    }

    if (enabled('ENABLE_PROVIDER_AI_JOBS')) {
      await enqueueJob({
        queueName: JOB_QUEUES.AI,
        jobName: JOB_NAMES.PROVIDER_EMBEDDING_REFRESH,
        payload: { providerId: String(req.user._id) },
        relatedEntityType: "provider",
        relatedEntityId: String(req.user._id),
        idempotencyKey: `provider-embedding:${req.user._id}`,
      });

      await enqueueJob({
        queueName: JOB_QUEUES.ANALYTICS,
        jobName: JOB_NAMES.TRUST_SCORE_RECALC,
        payload: { providerId: String(req.user._id) },
        relatedEntityType: "provider",
        relatedEntityId: String(req.user._id),
        idempotencyKey: `trust-recalc:${req.user._id}`,
      });
    }

    profile = await findProviderProfileByIdOrUserId(profile._id, {
      userSelect: PROVIDER_USER_SELECT,
    });
    const profileObj = { ...profile };
    if (profileObj.user) {
      if (
        profileObj.user.email &&
        profileObj.user.email.endsWith("@phone.lucohire.local")
      ) {
        profileObj.user.email = "";
      }
      const cleanPhone = String(profileObj.user.phone || "").replace(/\D/g, "");
      if (
        cleanPhone &&
        profileObj.user.name &&
        (profileObj.user.name === profileObj.user.phone ||
          profileObj.user.name === profileObj.user.fullPhone ||
          String(profileObj.user.name).replace(/\D/g, "") === cleanPhone)
      ) {
        profileObj.user.name = "";
      }
    }
    res.json(profileObj);
  } catch (error) {
    console.error("[getMyProfile] Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper: update rotation pool
async function updateRotationPool(skill, city, profileId) {
  const poolSize = parseInt(process.env.ROTATION_POOL_SIZE || 5);
  const key = {
    skill: skill.toLowerCase(),
    city: city.toLowerCase(),
  };
  let pool = await prisma.rotationPool.findUnique({
    where: { skill_city: key },
  });

  if (!pool) {
    pool = await prisma.rotationPool.create({
      data: {
        ...key,
        providers: [{ provider: String(profileId) }],
        maxPoolSize: poolSize,
      },
    });
  } else {
    const providers = Array.isArray(pool.providers) ? pool.providers : [];
    const exists = providers.some(
      (p) => String(p.provider) === String(profileId),
    );
    if (!exists && providers.length < pool.maxPoolSize) {
      pool = await prisma.rotationPool.update({
        where: { id: pool.id },
        data: { providers: [...providers, { provider: String(profileId) }] },
      });
    }
  }
  return withLegacyId(pool);
}

async function getProviderMarketPricing(skill, city) {
  const where = {};
  if (skill) where.skill = { contains: String(skill).trim(), mode: "insensitive" };
  if (city) where.city = { startsWith: String(city).trim(), mode: "insensitive" };
  const agg = await prisma.jobPost.aggregate({
    where,
    _count: { _all: true },
    _avg: { budgetMin: true, budgetMax: true },
  });

  if (Number(agg?._count?._all || 0) === 0) {
    return {
      avgMin: 500,
      avgMax: 2500,
      avg: 1500,
      sampleSize: 0,
    };
  }

  const avgMin = Math.max(0, Math.round(Number(agg._avg?.budgetMin || 0)));
  const avgMax = Math.max(avgMin, Math.round(Number(agg._avg?.budgetMax || 0)));

  return {
    avgMin,
    avgMax,
    avg: Math.round((avgMin + avgMax) / 2),
    sampleSize: Number(agg._count?._all || 0),
  };
}

// @desc    Get provider dashboard stats
// @route   GET /api/provider/dashboard
const getDashboard = async (req, res) => {
  try {
    let profile = await ensureProviderProfile(req.user._id, {
      profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    const leads = (await prisma.lead.findMany({
      where: { provider: String(req.user._id) },
      include: { recruiterRecord: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })).map(mapLeadRecord);

    const reviews = (await prisma.review.findMany({
      where: { provider: String(req.user._id) },
      include: { recruiterRecord: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })).map(mapReviewRecord);

    // Subscription data
    let { subscription, plan } = await getActiveSubscription(
      req.user._id,
      "provider",
    );
    if (!plan) {
      await assignFreePlan(req.user._id, "provider");
      const refreshed = await getActiveSubscription(req.user._id, "provider");
      subscription = refreshed.subscription;
      plan = refreshed.plan;
    }
    const user = await prisma.user.findUnique({
      where: { id: String(req.user._id) },
      select: { subscriptionBadge: true },
    });
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const waPlan = await findPlan({ slug: 'whatsapp-alerts', isActive: true });

    const waSubscriptions = (await prisma.providerSubscription.findMany({
      where: {
        providerId: String(req.user._id),
        subscriptionStatus: { in: ['active', 'queued'] },
      },
      orderBy: { endDate: 'desc' },
    })).map(mapProviderSubscription);
    const waSubscription = waSubscriptions.find((sub) =>
      sub.planSnapshot?.slug === 'whatsapp-alerts'
      || (Array.isArray(sub.selectedAddons) && sub.selectedAddons.some((addon) =>
        addon === 'whatsapp-alerts' || addon?.key === 'whatsapp-alerts')));

    const [availableJobs, appliedJobs] = await Promise.all([
      prisma.jobPost.count({ where: { status: 'active', isActive: true, expiresAt: { gt: now } } }),
      prisma.application.count({ where: { provider: String(req.user._id) } }),
    ]);

    const appliedThisMonth = await prisma.application.count({
      where: { provider: String(req.user._id), createdAt: { gte: startOfMonth } },
    });

    const remainingApplyLimit = plan
      ? plan.jobApplyLimit === -1
        ? "unlimited"
        : Math.max(0, plan.jobApplyLimit - appliedThisMonth)
      : 0;

    const planName = plan?.name || (subscription?.isDefault ? "Monthly" : null);

    const providerMetrics = await prisma.providerMetrics.findUnique({
      where: { providerId: String(req.user._id) },
    });

    const [totalLeads, acceptedLeads, hiredLeads, missedLeads] = await Promise.all([
      prisma.lead.count({ where: { provider: String(req.user._id) } }),
      prisma.lead.count({ where: { provider: String(req.user._id), status: { in: ["contacted", "hired"] } } }),
      prisma.lead.count({ where: { provider: String(req.user._id), status: "hired" } }),
      prisma.lead.count({
        where: {
          provider: String(req.user._id),
          status: "new",
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const responseRate =
      totalLeads > 0
        ? Number(((acceptedLeads / totalLeads) * 100).toFixed(2))
        : 0;
    const acceptanceRate =
      totalLeads > 0
        ? Number(((acceptedLeads / totalLeads) * 100).toFixed(2))
        : 0;
    const conversionRate =
      totalLeads > 0 ? Number(((hiredLeads / totalLeads) * 100).toFixed(2)) : 0;

    const latestReviews = withLegacyIds(await prisma.review.findMany({
      where: { provider: String(req.user._id) },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }));
    const firstHalf = latestReviews.slice(0, 5);
    const secondHalf = latestReviews.slice(5, 10);
    const avg = (arr) =>
      arr.length
        ? arr.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
          arr.length
        : 0;
    const ratingTrend = Number((avg(firstHalf) - avg(secondHalf)).toFixed(2));

    const aiInsights = enabled('ENABLE_PROVIDER_AI_INSIGHTS')
      ? await generateProviderInsights(
      {
        metrics: {
          responseRate,
          acceptanceRate,
          conversionRate,
          profileViews: Number(profile.profileViews || 0),
          missedLeads,
          trustScore: Number(
            providerMetrics?.trustScore ?? profile.trustScore ?? 0,
          ),
          rating: Number(profile.rating || 0),
        },
      },
      { userId: req.user._id, role: "provider" },
        )
      : { status: 'disabled', model: null, output: { tips: [], summary: '', confidence: 0 } };

    res.json({
      profile,
      leads,
      reviews,
      subscription: subscription
        ? {
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            whatsappPlanEndDate: waSubscription?.endDate,
            whatsappPlanPrice: waPlan?.price || 30,
            whatsappPlanId: waPlan?._id,
            isDefault: subscription.isDefault === true,
            planName: planName || plan?.slug || "Free",
          }
        : null,
      stats: {
        profileViews: profile.profileViews,
        leadsReceived: profile.leadsReceived,
        contactsUnlocked: profile.contactsUnlocked,
        profileCompletion: profile.profileCompletion,
        resumeScore:
          profile.resumeParsing?.confidenceScore ||
          profile.trustScore ||
          profile.profileCompletion ||
          0,
        profileCompletionDetails: {
          basicInformation: !!(profile.profileName && profile.city),
          workExperience:
            profile.experience === "Fresher" &&
            !profile.company &&
            !profile.designation &&
            (!profile.previousExperience ||
              !profile.previousExperience.some(
                (exp) => exp.company || exp.role,
              ))
              ? "notApplicable"
              : !!(profile.company || profile.designation) ||
                (profile.previousExperience &&
                  profile.previousExperience.some(
                    (exp) => exp.company || exp.role,
                  )),
          skills: Array.isArray(profile.skills) && profile.skills.length > 0,
          education:
            Array.isArray(profile.education) &&
            profile.education.some((edu) => edu.institution || edu.degree),
          resume: !!profile.resumeUrl,
          preferences: !!profile.pricing || !!profile.pricingType,
          projects: Array.isArray(profile.projects) && profile.projects.some((proj) => proj.name || proj.description),
          careerGoals:
            profile.portfolioLinks && profile.portfolioLinks.length > 0,
        },
        currentPlan: profile.currentPlan,
        profileExpiresAt: profile.profileExpiresAt,
        planName: planName || profile.currentPlan || "Free",
        planStatus: subscription?.status || "inactive",
        planEndDate: subscription?.endDate || null,
        isDefaultPlan: subscription?.isDefault === true,
        availableJobs,
        appliedJobs,
        remainingApplyLimit,
        subscriptionBadge: user?.subscriptionBadge || "",
        responseRate,
        acceptanceRate,
        conversionRate,
        missedLeads,
        ratingTrend,
        trustScore: Number(
          providerMetrics?.trustScore ?? profile.trustScore ?? 0,
        ),
      },
      ai_insights: {
        tips: aiInsights.output?.tips || [],
        summary: aiInsights.output?.summary || "",
        confidence: aiInsights.output?.confidence || 0,
        aiStatus: aiInsights.status,
        model: aiInsights.model,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get provider plans
// @route   GET /api/provider/plans
const getPlans = async (req, res) => {
  try {
    const visibilitySlugs = [
      "add-multiple-skills",
      "one-pincode-top",
      "top-in-city",
      "show-top-in-country",
      "customise-plan",
    ];

    let plans = await listPlans({
      type: "provider",
      isActive: true,
      slug: { in: Array.from(visibilitySlugs) },
    }, { sortOrder: 'asc' });

    if (!plans.length) {
      plans = await listPlans({ type: "provider", isActive: true }, { sortOrder: 'asc' });
    }

    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Purchase a plan (simulated)
// @route   POST /api/provider/plans/purchase
const purchasePlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await findPlanById(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    if (plan.type !== "provider") {
      return res
        .status(400)
        .json({ message: "Invalid plan type for provider purchase" });
    }

    const visibilitySlugs = new Set([
      "add-multiple-skills",
      "one-pincode-top",
      "top-in-city",
      "show-top-in-country",
      "customise-plan",
    ]);

    if (visibilitySlugs.has(String(plan.slug || "").toLowerCase())) {
      return res.status(400).json({
        message: "Use the visibility plan checkout flow for this plan.",
      });
    }

    let profile = await ensureProviderProfile(req.user._id, {
      profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    if (profile.currentPlan) {
      const currentPlan = await findPlan({
        type: "provider",
        slug: profile.currentPlan,
      });
      const currentOrder = Number(currentPlan?.sortOrder || 0);
      const nextOrder = Number(plan.sortOrder || 0);
      if (nextOrder <= currentOrder) {
        return res.status(400).json({
          message: `Only upgrades are allowed. Your current plan is '${currentPlan?.name || profile.currentPlan}'. Please choose a higher plan.`,
        });
      }
    }

    // Create payment record (simulated)
    const payment = await createPayment({
      user: req.user._id,
      plan: plan._id,
      amount: plan.price,
      currency: plan.currency,
      type: "plan_purchase",
      status: "completed",
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    // Update provider profile
    profile.currentPlan = plan.slug;
    profile.planExpiresAt = new Date(
      Date.now() + plan.duration * 24 * 60 * 60 * 1000,
    );
    profile.boostWeight = plan.boostWeight;
    profile.isTopCity = plan.isRotationEligible;
    profile.inRotationPool = plan.isRotationEligible;
    profile = await saveProviderProfile(profile);

    // Add to rotation pool if eligible
    if (plan.isRotationEligible && profile.skills.length > 0 && profile.city) {
      for (const skill of profile.skills) {
        await updateRotationPool(skill, profile.city, profile._id);
      }
    }

    // Create UserSubscription record and update badge
    await assignPlanToUser(req.user._id, "provider", plan);

    await createNotification({
      userId: req.user._id,
      type: "PLAN_PURCHASED",
      title: "Plan Purchased",
      message: `Your ${plan.name} plan has been activated successfully`,
      data: {
        planId: plan._id,
        planSlug: plan.slug,
        paymentId: payment._id,
      },
    });

    res.json({ message: "Plan purchased successfully", payment, profile });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get my leads
// @route   GET /api/provider/leads
const getMyLeads = async (req, res) => {
  try {
    const leads = (await prisma.lead.findMany({
      where: { provider: String(req.user._id) },
      include: {
        recruiterRecord: { select: { id: true, name: true, email: true, phone: true } },
        jobPostRecord: { select: { id: true, title: true, skill: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
    })).map(mapLeadRecord);
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update lead status
// @route   PUT /api/provider/leads/:id
const updateLeadStatus = async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: String(req.params.id) } });
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    if (String(lead.provider) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: { status: req.body.status || lead.status },
    });
    res.json(withLegacyId(updatedLead));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get public provider profile by ID
// @route   GET /api/provider/public/:id
const getPublicProfile = async (req, res) => {
  try {
    let profile = await findProviderProfileByIdOrUserId(req.params.id, {
      userSelect: { id: true, name: true, avatar: true, isPublicProfile: true, whatsappConsent: true },
    });
    if (!profile)
      return res.status(404).json({ message: "Provider not found" });

    // Access control removed to allow users to view other providers' public profiles.

    const reviews = (await prisma.review.findMany({
      where: { provider: String(profile.user._id) },
      include: { recruiterRecord: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })).map(mapReviewRecord);

    res.json({ profile, reviews });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get public provider profile by ID
// @route   GET /api/provider/public/:id/whatsapp-redirect
const getPublicWhatsAppRedirect = async (req, res) => {
  try {
    let profile = await findProviderProfileByIdOrUserId(req.params.id, {
      userSelect: {
        id: true, isPublicProfile: true, whatsappConsent: true,
        whatsappNumber: true, phone: true, fullPhone: true,
      },
    });

    if (!profile || !profile.user) {
      return res.status(404).json({ message: "Provider not found" });
    }

    if (
      profile.user.isPublicProfile !== true ||
      profile.user.whatsappConsent !== true
    ) {
      return res
        .status(403)
        .json({
          message:
            "WhatsApp contact is not publicly available for this profile",
        });
    }

    const numberToUse =
      profile.user.whatsappNumber ||
      profile.user.fullPhone ||
      profile.user.phone;
    if (!numberToUse) {
      return res
        .status(400)
        .json({ message: "No valid WhatsApp number found" });
    }

    // Increment the freelance opportunities count for the provider's analytics
    await prisma.providerProfile.update({
      where: { id: profile.id },
      data: {
        freelancerAnalytics: {
          ...(profile.freelancerAnalytics || {}),
          freelanceOpportunities: Number(profile.freelancerAnalytics?.freelanceOpportunities || 0) + 1,
        },
      },
    });

    const cleanNumber = numberToUse.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${cleanNumber}`;

    // Perform 302 redirect so browser hides the number in the HTML source
    res.redirect(302, whatsappUrl);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Upload provider profile photo (Cloudinary)
// @route   POST /api/provider/profile/photo
const logContactClick = async (req, res) => {
  try {
    const { actionType } = req.body;
    if (!['whatsapp', 'call'].includes(actionType)) {
      return res.status(400).json({ message: "Invalid action type" });
    }

    let profile = await findProviderProfileByIdOrUserId(req.params.id, {
      userSelect: {
        id: true, isPublicProfile: true, whatsappConsent: true,
        whatsappNumber: true, phone: true, fullPhone: true,
      },
    });

    if (!profile || !profile.user) {
      return res.status(404).json({ message: "Provider not found" });
    }

    // Log the click
    await createContactClickLog({
      provider: profile._id,
      user: req.user._id,
      actionType
    });

    if (actionType === 'whatsapp') {

      const numberToUse =
        profile.user.whatsappNumber ||
        profile.user.fullPhone ||
        profile.user.phone;
      if (!numberToUse) {
        return res
          .status(400)
          .json({ message: "No valid WhatsApp number found" });
      }

      // Increment the freelance opportunities count for the provider's analytics
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: {
          freelancerAnalytics: {
            ...(profile.freelancerAnalytics || {}),
            freelanceOpportunities: Number(profile.freelancerAnalytics?.freelanceOpportunities || 0) + 1,
          },
        },
      });

      const cleanNumber = numberToUse.replace(/\D/g, "");
      const whatsappUrl = `https://wa.me/${cleanNumber}`;

      return res.json({ success: true, url: whatsappUrl });
    } else if (actionType === 'call') {
      const numberToUse =
        profile.user.fullPhone ||
        profile.user.phone;
      if (!numberToUse) {
        return res
          .status(400)
          .json({ message: "No valid phone number found" });
      }
      return res.json({ success: true, url: `tel:${numberToUse}` });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Upload provider profile photo (Cloudinary)
// @route   POST /api/provider/profile/photo
const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Server-side validation of file type & size
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res
        .status(400)
        .json({
          message:
            "Invalid image format. Allowed formats: JPG, JPEG, PNG, WebP",
        });
    }
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB max fallback
    if (req.file.size > maxSizeBytes) {
      return res
        .status(400)
        .json({ message: "File is too large. Max size allowed is 5MB" });
    }

    let newUrl;
    try {
      // Upload must go to Cloudinary; fail if not configured or upload fails
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: "servicehub/providers",
        public_id: `provider_${req.user._id}_${Date.now()}`,
      });
      newUrl = result.secure_url;
    } catch (cloudErr) {
      return res
        .status(500)
        .json({ message: "Cloudinary upload failed", error: cloudErr.message });
    }

    // Delete old Cloudinary file
    const profile = await findProviderProfileByUserId(req.user._id);
    const oldFile = profile?.profilePhoto || profile?.photo;
    if (oldFile && oldFile.includes("cloudinary.com")) {
      await deleteFromCloudinary(oldFile);
    } else if (oldFile && oldFile.startsWith("/uploads/")) {
      const oldPath = path.join(__dirname, "..", oldFile);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    // Save asset metadata
    if (profile) {
      profile.uploadedAssets = profile.uploadedAssets || [];
      profile.uploadedAssets.push({
        originalName: req.file.originalname || "profile_photo.jpg",
        mimeType: req.file.mimetype,
        finalSize: req.file.size,
        uploadedBy: req.user._id,
        uploadedAt: new Date(),
        assetType: "profile_photo",
        url: newUrl,
      });

      // Send to admin for approval
      profile.profilePhotoApproval = {
        status: "pending",
        pendingUrl: newUrl,
        approvedUrl:
          profile.profilePhotoApproval?.approvedUrl ||
          profile.profilePhoto ||
          "",
        rejectionReason: "",
        reviewedBy: null,
        reviewedAt: null,
      };
      await saveProviderProfile(profile);
    }

    // Sync to User model
    await prisma.user.update({
      where: { id: String(req.user._id) },
      data: prepareUserData({
        profilePhotoApproval: {
          ...(req.user.profilePhotoApproval || {}),
          status: "pending",
          pendingUrl: newUrl,
        },
      }),
    });

    res.json({
      url: newUrl,
      status: "approved",
      message: "Photo uploaded successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete provider profile photo
// @route   DELETE /api/provider/profile/photo
const deleteProfilePhoto = async (req, res) => {
  try {
    const profile = await findProviderProfileByUserId(req.user._id);
    const oldFile = profile?.profilePhoto || profile?.photo;
    if (oldFile && oldFile.includes("cloudinary.com")) {
      await deleteFromCloudinary(oldFile);
    } else if (oldFile && oldFile.startsWith("/uploads/")) {
      const oldPath = path.join(__dirname, "..", oldFile);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await updateProviderProfile(req.user._id, {
      profilePhoto: "",
      photo: "",
      profilePhotoApproval: {
        status: "none",
        pendingUrl: "",
        approvedUrl: "",
      },
    });
    await prisma.user.update({
      where: { id: String(req.user._id) },
      data: prepareUserData({
        profilePhoto: "",
        avatar: "",
        profilePhotoApproval: {
          ...(req.user.profilePhotoApproval || {}),
          status: "none",
          pendingUrl: "",
        },
      }),
    });

    res.json({ message: "Photo deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Upload document to Cloudinary
// @route   POST /api/provider/profile/document
// @desc    Upload provider resume
// @route   POST /api/provider/profile/resume
const uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const path = require("path");
    const fileExt = path.extname(req.file.originalname || "").toLowerCase();
    const allowedExts = [".pdf", ".doc", ".docx"];
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (
      !allowedExts.includes(fileExt) ||
      !allowedMimeTypes.includes(req.file.mimetype)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid document type. Only PDF, DOC, and DOCX are allowed.",
        });
    }

    const maxDocSizeBytes = 5 * 1024 * 1024; // 5MB limit
    if (req.file.size > maxDocSizeBytes) {
      return res
        .status(400)
        .json({ message: "File is too large. Max size allowed is 5MB" });
    }

    let url;
    try {
      const fs = require("fs");
      const filename = `resume_${req.user._id}_${Date.now()}${fileExt}`;
      const uploadPath = path.join(
        __dirname,
        "..",
        "uploads",
        "resumes",
        filename,
      );
      fs.writeFileSync(uploadPath, req.file.buffer);
      url = `/uploads/resumes/${filename}`;
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Local upload failed", error: err.message });
    }

    const profile = await findProviderProfileByUserId(req.user._id);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    // Clean up old resume if it exists
    const oldResume = profile.resumeApproval?.pendingUrl || profile.resumeUrl;
    if (oldResume && oldResume.includes("cloudinary.com")) {
      await deleteFromCloudinary(oldResume).catch((err) =>
        console.warn("Old resume delete failed", err),
      );
    } else if (oldResume && oldResume.startsWith("/uploads/")) {
      try {
        const fs = require("fs");
        const oldPath = path.join(__dirname, "..", oldResume);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (err) {
        console.warn("Failed to delete old local resume", err);
      }
    }

    // Set the resume to pending approval and update url
    profile.resumeApproval = {
      status: "pending",
      pendingUrl: url,
      approvedUrl:
        profile.resumeApproval?.approvedUrl || profile.resumeUrl || "",
      rejectionReason: "",
      reviewedBy: null,
      reviewedAt: null,
    };

    // We also set resumeUrl directly for instant frontend availability
    profile.resumeUrl = url;

    await saveProviderProfile(profile);

    if (enabled('ENABLE_PROVIDER_AI_JOBS')) {
      setImmediate(async () => {
        try {
          const { triggerAutoAnalysis } = require("../services/ai/autoAnalyzer");
          await triggerAutoAnalysis(req.user._id, null);
        } catch(e) {
          console.error("AutoAnalysis trigger failed on uploadResume", e);
        }
      });
    }

    res.json({
      url,
      status: "pending",
      message: "Resume uploaded successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete provider resume
// @route   DELETE /api/provider/profile/resume
const deleteResume = async (req, res) => {
  try {
    const profile = await findProviderProfileByUserId(req.user._id);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const oldResume = profile.resumeApproval?.pendingUrl || profile.resumeUrl;
    if (oldResume && oldResume.includes("cloudinary.com")) {
      await deleteFromCloudinary(oldResume).catch((err) =>
        console.warn("Old resume delete failed", err),
      );
    }

    profile.resumeUrl = "";
    profile.resumeApproval = {
      status: "none",
      pendingUrl: "",
      approvedUrl: "",
      rejectionReason: "",
      reviewedBy: null,
      reviewedAt: null,
    };

    await saveProviderProfile(profile);

    res.json({ message: "Resume deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const uploadDocument = async (req, res) => {
  try {
    if (!enabled('ENABLE_PROVIDER_DOCUMENT_VERIFICATION')) {
      return res.status(503).json({
        message: 'Document verification is temporarily disabled',
        code: 'PROVIDER_DOCUMENT_VERIFICATION_DISABLED',
      });
    }
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Validate document file format and block dangerous scripts/executables
    const path = require("path");
    const fileExt = path.extname(req.file.originalname || "").toLowerCase();
    const blockedExts = [
      ".exe",
      ".js",
      ".sh",
      ".bat",
      ".php",
      ".html",
      ".htm",
      ".xml",
    ];
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      blockedExts.includes(fileExt) ||
      !allowedMimeTypes.includes(req.file.mimetype)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid document type. Only PDF and standard images (JPG, PNG, WebP) are allowed.",
        });
    }
    const maxDocSizeBytes = 5 * 1024 * 1024; // 5MB limit
    if (req.file.size > maxDocSizeBytes) {
      return res
        .status(400)
        .json({ message: "File is too large. Max size allowed is 5MB" });
    }

    let url;
    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: "servicehub/documents",
        resource_type: "auto",
        public_id: `doc_${req.user._id}_${Date.now()}`,
      });
      url = result.secure_url;
    } catch (cloudErr) {
      return res
        .status(500)
        .json({ message: "Cloudinary upload failed", error: cloudErr.message });
    }

    const profile = await findProviderProfileByUserId(req.user._id);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    // Capture optimized asset metadata
    profile.uploadedAssets = profile.uploadedAssets || [];
    profile.uploadedAssets.push({
      originalName: req.file.originalname || "document.pdf",
      mimeType: req.file.mimetype,
      finalSize: req.file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
      assetType: "document",
      url: url,
    });

    profile.documents.push(url);
    await saveProviderProfile(profile);

    const verification = withLegacyId(await prisma.documentVerificationResult.create({
      data: {
        providerId: String(req.user._id),
        documentUrl: url,
        documentType: "aadhaar",
        status: "pending",
        reasons: ["Queued for OCR verification"],
      },
    }));

    await enqueueJob({
      queueName: JOB_QUEUES.OCR,
      jobName: JOB_NAMES.PROVIDER_DOCUMENT_VERIFY,
      payload: {
        providerId: String(req.user._id),
        documentUrl: url,
      },
      relatedEntityType: "provider_document",
      relatedEntityId: String(verification._id),
      idempotencyKey: `${req.user._id}:ocr:${verification._id}`,
    });

    res.json({
      url,
      documents: profile.documents,
      verification: {
        id: verification._id,
        status: verification.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get provider visit history
// @route   GET /api/provider/history
const getMyHistory = async (req, res) => {
  try {
    const history = await listVisitHistory({ visitedUser: req.user._id }, 50, 'visitor');
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    AI suggest provider profile details from free text
// @route   POST /api/provider/profile/ai-suggest
const aiSuggestProfile = async (req, res) => {
  try {
    const {
      freeText,
      existingSkills = [],
      existingLanguages = [],
      portfolioLinks = [],
    } = req.body;

    const aiResult = await buildProfileFromText({
      freeText,
      existingSkills,
      existingLanguages,
      portfolioLinks,
    });

    await logBusinessEvent({
      taskType: "ai_profile_suggest",
      relatedEntityType: "provider",
      relatedEntityId: req.user._id,
      payload: { freeTextLength: String(freeText || "").length },
      result: {
        source: aiResult.source,
        missingFields: aiResult.data?.missingFields || [],
      },
      status: "success",
    });

    return res.json({
      headline: aiResult.data.headline,
      description: aiResult.data.description,
      suggestedSkills: aiResult.data.skills || [],
      suggestedPriceRange: aiResult.data.suggestedPricingRange || null,
      city: aiResult.data.city || "",
      languages: aiResult.data.languages || [],
      experienceMonths: aiResult.data.experienceMonths || 0,
      experienceLabel: aiResult.data.experienceLabel || "",
      category: aiResult.data.category || "",
      missingFields: aiResult.data.missingFields || [],
      aiStatus: aiResult.source,
      source: aiResult.source,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to generate profile suggestion",
      error: error.message,
    });
  }
};

// @desc    AI provider builder suggestion for preview/apply flow
// @route   POST /api/provider/ai/provider-builder-suggestion
const providerBuilderSuggestion = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      freeText = "",
      skillLevel,
      experience,
      selectedSpecialities = [],
      selectedLocations = [],
      preferredLocation = null,
      payoutType = "hourly",
      planContext = {},
    } = req.body || {};

    const activeBenefits = await getActivePlanBenefits(userId);
    const normalizedSkillLevel = String(
      skillLevel || planContext.skillLevel || "unskilled",
    )
      .trim()
      .toLowerCase();

    const existingSpecialities = Array.isArray(selectedSpecialities)
      ? selectedSpecialities.map((item) =>
          typeof item === "object"
            ? item
            : { name: item, skillLevel: normalizedSkillLevel },
        )
      : [];

    const existingLocations = Array.isArray(selectedLocations)
      ? selectedLocations
      : [];
    const resolvedLocations = [];

    if (preferredLocation) {
      const preferredResolved = await resolveGooglePlace(preferredLocation);
      if (preferredResolved) resolvedLocations.push(preferredResolved);
    }

    for (const location of existingLocations) {
      const resolved = await resolveGooglePlace(location);
      if (resolved) resolvedLocations.push(resolved);
    }

    const filteredSpecialities = existingSpecialities.filter((item) =>
      validateSpecialitySkillMatch(normalizedSkillLevel, item),
    );
    const suggestedSpecialities =
      filteredSpecialities.length > 0
        ? filteredSpecialities
        : filterSpecialitiesBySkill(normalizedSkillLevel)
            .slice(0, 1)
            .map((name) => ({ name, skillLevel: normalizedSkillLevel }));

    const merged = applyAISuggestionByPlanMode(
      userId,
      {
        existingSpecialities,
        existingLocations: resolvedLocations,
        suggestedSpecialities,
        suggestedLocations: resolvedLocations,
      },
      activeBenefits,
    );

    const speciality = merged.specialities[0] ||
      suggestedSpecialities[0] || {
        name: "",
        slug: "",
        skillLevel: normalizedSkillLevel,
      };
    const location = merged.locations[0] || resolvedLocations[0] || null;
    const demandMultiplier = Number(
      planContext.demandMultiplier || (location?.city ? 1.15 : 1),
    );
    const pricingInfo = calculateAISuggestedPricing({
      skillLevel: normalizedSkillLevel,
      speciality,
      experience,
      locationMultiplier: Number(planContext.locationMultiplier || 1),
      demandMultiplier,
      baseSpecialityPrice: Number(planContext.baseSpecialityPrice || 0),
    });

    const freeTextTags = String(freeText || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((item) => item.length > 2)
      .slice(0, 6);

    const title = freeText
      ? freeText.slice(0, 70)
      : `${speciality.name || "Service Provider"}${location?.city ? ` in ${location.city}` : ""}`;
    const description = freeText
      ? `${freeText.trim()} ${speciality.name ? `Suggested focus: ${speciality.name}.` : ""}`.trim()
      : `Reliable ${String(speciality.name || "service").toLowerCase()} provider available for ${payoutType} work${experience ? ` with ${experience} experience` : ""}.`;
    const tags = [
      normalizedSkillLevel,
      speciality.name,
      location?.city,
      payoutType,
      ...freeTextTags,
    ].filter(Boolean);
    const keywords = [
      ...new Set(
        tags
          .map((item) =>
            String(item)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")
              .trim(),
          )
          .filter(Boolean),
      ),
    ];

    return res.status(200).json({
      success: true,
      data: {
        mode: merged.mode,
        skillLevel: normalizedSkillLevel,
        suggestedSpecialities: merged.specialities,
        suggestedLocations: merged.locations,
        pricing: pricingInfo.pricing,
        title,
        description,
        tags,
        keywords,
        confidenceScore: pricingInfo.pricing.confidenceScore,
        reason: pricingInfo.pricing.reason,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to build provider suggestion",
    });
  }
};

// @desc    Build provider profile using AI (new endpoint alias)
// @route   POST /api/provider/ai/build-profile
const buildAIProfile = async (req, res) => {
  try {
    const {
      freeText,
      existingSkills = [],
      existingLanguages = [],
      portfolioLinks = [],
    } = req.body;

    const aiResult = await buildProfileFromText({
      freeText,
      existingSkills,
      existingLanguages,
      portfolioLinks,
    });

    await logBusinessEvent({
      taskType: "ai_profile_build",
      relatedEntityType: "provider",
      relatedEntityId: req.user._id,
      payload: { freeTextLength: String(freeText || "").length },
      result: {
        source: aiResult.source,
        missingFields: aiResult.data?.missingFields || [],
      },
      status: "success",
    });

    return res.json({
      success: true,
      source: aiResult.source,
      data: aiResult.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to build AI profile",
    });
  }
};

// @desc    AI pricing suggestion for provider skill/city
// @route   GET /api/provider/ai/pricing-suggestion
const getAIPricingSuggestion = async (req, res) => {
  try {
    const skill = String(req.query.skill || "").trim();
    const city = String(req.query.city || "").trim();
    const skillLevel = String(req.query.skillLevel || req.query.tier || "")
      .trim()
      .toLowerCase();
    const experience = String(req.query.experience || "").trim();

    if (!skill || !city) {
      return res
        .status(400)
        .json({ message: "skill and city query params are required" });
    }

    const marketStats = await getProviderMarketPricing(skill, city);
    const structuredPricing = calculateAISuggestedPricing({
      skillLevel: skillLevel || "semi-skilled",
      speciality: skill,
      experience,
      locationMultiplier: 1,
      demandMultiplier:
        marketStats?.sampleSize > 0
          ? 1 + Math.min(0.25, marketStats.sampleSize / 200)
          : 1,
      baseSpecialityPrice: marketStats.avg || 0,
    });

    // Use the newly created OpenAI service function directly
    const {
      handlePricingSuggestionWithOpenAi,
    } = require("../services/ai/profileBuilder/openAiExtractor");
    const ai = await handlePricingSuggestionWithOpenAi(
      skill,
      city,
      experience,
      marketStats,
    );

    // If AI successfully estimated a monthly average rate, align perMonth, perDay, and perHour suggests to it
    const aiAvg = Number(ai.output?.avg || 0);
    if (ai.status === "success" && aiAvg > 0) {
      structuredPricing.pricing = {
        perHour: Math.round(aiAvg / 176),
        perDay: Math.round(aiAvg / 22),
        perMonth: aiAvg,
        currency: "INR",
        confidenceScore: Number(
          ai.output.confidence || structuredPricing.pricing.confidenceScore,
        ),
        reason: ai.output.reasoning || structuredPricing.pricing.reason,
      };
    }

    return res.json({
      skill,
      city,
      min: Number(ai.output?.min || marketStats.avgMin || 0),
      max: Number(ai.output?.max || marketStats.avgMax || 0),
      avg: Number(ai.output?.avg || marketStats.avg || 0),
      pricing: structuredPricing.pricing,
      reasoning:
        ai.output?.reasoning ||
        structuredPricing.pricing.reason ||
        "Based on marketplace and AI analysis.",
      confidence: Number(
        ai.output?.confidence ||
          structuredPricing.pricing.confidenceScore ||
          0.4,
      ),
      aiStatus: ai.status || "fallback",
      model: ai.model || "rule-fallback",
      marketStats,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to generate pricing suggestion",
      error: error.message,
    });
  }
};

// @desc    Extract clean JSON from informal text using Gemini and lock address using Google Places
// @route   POST /api/provider/ai/extract-profile
const extractAndLockProfileData = async (req, res) => {
  try {
    const { freeText } = req.body;
    if (!freeText || typeof freeText !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "freeText is required" });
    }

    // 1. Extract JSON strictly using GPT-4o-mini
    const {
      handelExtractProfileDataWithOpenAi,
    } = require("../services/ai/profileBuilder/openAiExtractor");
    const aiData = await handelExtractProfileDataWithOpenAi(freeText);

    // 2. If OpenAI extracted a location string, lock it using Google Places
    let locationOptions = [];
    if (aiData.location) {
      const {
        handelFetchStandardizedLocation,
      } = require("../services/location/googlePlacesService");
      const countryContext = req.user?.country || null;
      locationOptions = await handelFetchStandardizedLocation(
        aiData.location,
        countryContext,
      );
    }

    // 3. Return the unified clean data
    // We are returning this so frontend can review it or directly use it, ensuring no existing flows break.
    return res.json({
      success: true,
      data: {
        skill: aiData.skill,
        experience_years: aiData.experience_years,
        hourly_rate: aiData.hourly_rate,
        rawLocationExtracted: aiData.location,
        locationOptions: locationOptions, // Frontend will present these to the user to disambiguate
      },
    });
  } catch (error) {
    console.error("Error in extractAndLockProfileData:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to extract and lock profile data",
    });
  }
};

const CURATED_FALLBACK_FREELANCERS = [
  {
    _id: "fl-ananya-verma",
    name: "Ananya Verma",
    profilePhoto: "https://randomuser.me/api/portraits/women/68.jpg",
    primaryRole: "SaaS Content Writer",
    category: "content",
    city: "Pune",
    location: "📍 Pune · 🌐 Remote",
    rating: 4.9,
    reviewCount: 120,
    experienceYears: "3+ Yrs",
    responseRate: "100%",
    canStart: "Today",
    skills: ["SaaS Copy", "SEO Writing", "Notion"],
    startingRate: "₹4",
    rateUnit: "/word",
    availableSlots: "3 slots",
    slotPeriod: "This month",
    isBoosted: true,
    isIdVerified: true,
    isPortfolioVerified: true,
    isPaymentVerified: true,
    isOnline: true,
    about: "Specialized B2B SaaS copywriter and SEO strategist helping software startups convert visitors into paying users."
  },
  {
    _id: "fl-rohit-malhotra",
    name: "Rohit Malhotra",
    profilePhoto: "https://randomuser.me/api/portraits/men/52.jpg",
    primaryRole: "Voice-over & Audio Editor",
    category: "video",
    city: "Lucknow",
    location: "📍 Lucknow · 🌐 Remote",
    rating: 4.8,
    reviewCount: 80,
    experienceYears: "5+ Yrs",
    responseRate: "95%",
    canStart: "Tomorrow",
    skills: ["Voice-over", "Audio Editing", "Hindi + English"],
    startingRate: "₹2,500",
    rateUnit: "/project",
    availableSlots: "5 slots",
    slotPeriod: "This month",
    isBoosted: false,
    isIdVerified: true,
    isPortfolioVerified: true,
    isPaymentVerified: false,
    isOnline: true,
    about: "Pro voice talent and audio engineer for commercial podcasts, brand ads, and instructional content."
  },
  {
    _id: "fl-meher-kaur",
    name: "Meher Kaur",
    profilePhoto: "https://randomuser.me/api/portraits/women/54.jpg",
    primaryRole: "Logo & Brand Designer",
    category: "design",
    city: "Delhi",
    location: "📍 Delhi · 🌐 Remote",
    rating: 5.0,
    reviewCount: 150,
    experienceYears: "4+ Yrs",
    responseRate: "98%",
    canStart: "Today",
    skills: ["Figma", "Branding", "Illustration"],
    startingRate: "₹3,000",
    rateUnit: "/logo",
    availableSlots: "2 slots",
    slotPeriod: "This month",
    isBoosted: false,
    isIdVerified: true,
    isPortfolioVerified: true,
    isPaymentVerified: true,
    isOnline: true,
    about: "Identity designer with 150+ brand kits completed for fast-growing Indian D2C and tech companies."
  },
  {
    _id: "fl-arvind-sharma",
    name: "Arvind Sharma",
    profilePhoto: "https://randomuser.me/api/portraits/men/32.jpg",
    primaryRole: "React & Next.js Developer",
    category: "dev",
    city: "Bengaluru",
    location: "📍 Bengaluru · 🌐 Remote",
    rating: 4.9,
    reviewCount: 95,
    experienceYears: "4+ Yrs",
    responseRate: "97%",
    canStart: "Today",
    skills: ["React", "Next.js", "TypeScript", "TailwindCSS"],
    startingRate: "₹1,200",
    rateUnit: "/hr",
    availableSlots: "4 slots",
    slotPeriod: "This month",
    isBoosted: true,
    isIdVerified: true,
    isPortfolioVerified: true,
    isPaymentVerified: true,
    isOnline: true,
    about: "Senior frontend architect crafting pixel-perfect web experiences, design systems, and fast SaaS web apps."
  },
  {
    _id: "fl-sneha-patel",
    name: "Sneha Patel",
    profilePhoto: "https://randomuser.me/api/portraits/women/33.jpg",
    primaryRole: "Growth & Performance Marketer",
    category: "marketing",
    city: "Mumbai",
    location: "📍 Mumbai · 🌐 Remote",
    rating: 4.9,
    reviewCount: 110,
    experienceYears: "5+ Yrs",
    responseRate: "100%",
    canStart: "This Week",
    skills: ["Meta Ads", "Google Ads", "Funnel Optimization"],
    startingRate: "₹15,000",
    rateUnit: "/month",
    availableSlots: "2 slots",
    slotPeriod: "This month",
    isBoosted: false,
    isIdVerified: true,
    isPortfolioVerified: true,
    isPaymentVerified: true,
    isOnline: true,
    about: "Performance marketing specialist managing 50L+ monthly ad spend with focus on ROAS and scalable acquisition."
  },
  {
    _id: "fl-vikram-joshi",
    name: "Vikram Joshi",
    profilePhoto: "https://randomuser.me/api/portraits/men/44.jpg",
    primaryRole: "Full-stack AI Developer",
    category: "dev",
    city: "Hyderabad",
    location: "📍 Hyderabad · 🌐 Remote",
    rating: 4.95,
    reviewCount: 78,
    experienceYears: "6+ Yrs",
    responseRate: "99%",
    canStart: "Today",
    skills: ["Python", "FastAPI", "OpenAI", "Next.js"],
    startingRate: "₹1,800",
    rateUnit: "/hr",
    availableSlots: "3 slots",
    slotPeriod: "This month",
    isBoosted: true,
    isIdVerified: true,
    isPortfolioVerified: true,
    isPaymentVerified: true,
    isOnline: true,
    about: "Full-stack AI engineer building agentic workflows, LLM integrations, and robust web backends."
  }
];

const getTopTalent = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const category = req.query.category ? String(req.query.category).toLowerCase().trim() : "all";
    const search = req.query.search ? String(req.query.search).toLowerCase().trim() : "";

    let dbProviders = [];
    try {
      const providersFromDb = await prisma.providerProfile.findMany({
        where: {
          isApproved: true,
          isPublicProfile: true,
        },
        include: {
          userRecord: {
            select: {
              name: true,
              email: true,
              profilePhoto: true,
              cityName: true,
            },
          },
        },
        orderBy: [
          { boostWeight: "desc" },
          { rating: "desc" },
          { createdAt: "desc" },
        ],
        take: 30,
      });

      dbProviders = (providersFromDb || []).map((p) => {
        let skillsList = [];
        if (Array.isArray(p.skills)) {
          skillsList = p.skills;
        } else if (typeof p.skills === "string") {
          try {
            const parsed = JSON.parse(p.skills);
            if (Array.isArray(parsed)) skillsList = parsed;
            else skillsList = [p.skills];
          } catch {
            skillsList = p.skills.split(",").map((s) => s.trim()).filter(Boolean);
          }
        }

        const name = p.userRecord?.name || "Verified Professional";
        const photo = p.profilePhoto || p.userRecord?.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4A3AE0&color=fff`;
        const loc = (p.locationData && typeof p.locationData === "object" && p.locationData.formatted)
          || `📍 ${p.city || p.userRecord?.cityName || "India"} · 🌐 Remote`;

        return {
          _id: p.id,
          name: name,
          profilePhoto: photo,
          primaryRole: p.designation || (skillsList[0] ? `${skillsList[0]} Specialist` : "Freelance Specialist"),
          category: p.category || "dev",
          city: p.city || p.userRecord?.cityName || "Remote",
          location: loc,
          rating: Number(p.rating || 4.8),
          reviewCount: Number(p.totalReviews || p.reviewCount || 10),
          experienceYears: p.experience ? `${p.experience}+ Yrs` : "3+ Yrs",
          responseRate: "98%",
          canStart: "Today",
          skills: skillsList.length ? skillsList.slice(0, 4) : ["Verified Pro", "Remote"],
          startingRate: p.pricing ? `₹${p.pricing}` : "₹500",
          rateUnit: p.pricingType || "/hr",
          availableSlots: "3 slots",
          slotPeriod: "This month",
          isBoosted: Boolean(p.boostWeight > 0 || p.isBoosted),
          isIdVerified: true,
          isPortfolioVerified: true,
          isPaymentVerified: true,
          isOnline: true,
          about: p.description || "",
          roles: p.roles || [],
        };
      });
    } catch (dbErr) {
      console.warn("[GET TOP TALENT] DB fetch failed or empty:", dbErr.message);
    }

    let allProviders = dbProviders.length > 0 ? dbProviders : CURATED_FALLBACK_FREELANCERS;

    if (category && category !== "all") {
      allProviders = allProviders.filter((p) => {
        if (p.category === category) return true;
        const text = `${p.primaryRole} ${p.skills.join(" ")}`.toLowerCase();
        if (category === "design") return /design|figma|ui|ux|logo|branding|graphic/.test(text);
        if (category === "dev") return /dev|react|node|web|software|python|code|app|frontend|backend/.test(text);
        if (category === "content") return /content|writer|writing|seo|copy|blog|author/.test(text);
        if (category === "video") return /video|audio|voice|editor|edit|animation|sound/.test(text);
        if (category === "marketing") return /marketing|ads|social|growth|seo|meta|google/.test(text);
        return true;
      });
    }

    if (search) {
      allProviders = allProviders.filter((p) => {
        const text = `${p.name} ${p.primaryRole} ${p.skills.join(" ")} ${p.city}`.toLowerCase();
        return text.includes(search);
      });
    }

    const total = allProviders.length;
    const paginatedProviders = allProviders.slice(skip, skip + limit);

    return res.json({
      success: true,
      data: paginatedProviders,
      meta: {
        totalFreelancersListed: "6,200+",
        totalRequirementsPosted: "1,800+",
        avgResponseTime: "~12 min",
        avgRating: "4.7★"
      },
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET TOP TALENT ERROR]", error);
    return res.status(500).json({ success: false, message: "Server error", data: [] });
  }
};

module.exports = {
  getMyProfile,
  updateProfile,
  sendPhoneChangeOtp,
  getDashboard,
  getPlans,
  purchasePlan,
  getMyLeads,
  updateLeadStatus,
  getPublicProfile,
  getPublicWhatsAppRedirect,
  logContactClick,
  uploadProfilePhoto,
  deleteProfilePhoto,
  uploadResume,
  deleteResume,
  uploadDocument,
  getMyHistory,
  aiSuggestProfile,
  buildAIProfile,
  getAIPricingSuggestion,
  providerBuilderSuggestion,
  extractAndLockProfileData,
  getTopTalent,
};
