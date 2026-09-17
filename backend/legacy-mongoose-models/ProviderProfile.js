const mongoose = require("mongoose");
const {
  approvalSectionSchema,
  activityLogSchema,
} = require("./ProfileSectionReview");

const serviceLocationSchema = new mongoose.Schema(
  {
    placeId: { type: String, default: "" },
    name: { type: String, default: "" },
    formattedAddress: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    source: { type: String, default: "google" },
  },
  { _id: false },
);

const providerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    skills: [{ type: String, trim: true }],
    roles: [{ type: String, trim: true }],
    expandedSkills: [{ type: String, trim: true }],
    specialities: [
      {
        specialityId: { type: String, default: "" },
        name: { type: String, default: "" },
        slug: { type: String, default: "" },
        skillLevel: { type: String, default: "unskilled" },
        mobilityType: { type: String, default: "local" },
      },
    ],
    locations: [{ type: String, trim: true }],
    pricingEntries: [
      {
        specialitySlug: { type: String, default: "" },
        locationPlaceId: { type: String, default: "" },
        perHour: { type: Number, default: 0 },
        perDay: { type: Number, default: 0 },
        perMonth: { type: Number, default: 0 },
        currency: { type: String, default: "INR" },
        source: { type: String, default: "manual" },
      },
    ],
    tier: {
      type: String,
      enum: ["unskilled", "semi-skilled", "skilled"],
      default: "unskilled",
    },
    skillLevel: {
      type: String,
      enum: ["unskilled", "semi-skilled", "skilled"],
      default: "unskilled",
    },
    experience: { type: String, default: "" },
    designation: { type: String, default: "" },
    company: { type: String, default: "" },
    noticePeriod: { type: String, default: "" },
    currentCtc: { type: String, default: "" },
    expectedCtc: { type: String, default: "" },
    availability: { type: String, default: "" },
    previousExperience: [
      {
        company: { type: String, default: "" },
        role: { type: String, default: "" },
        duration: { type: String, default: "" },
        description: { type: String, default: "" },
      },
    ],
    education: [
      {
        institution: { type: String, default: "" },
        degree: { type: String, default: "" },
        year: { type: String, default: "" },
        grade: { type: String, default: "" },
      },
    ],
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    nearestLocation: { type: String, default: "", trim: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    location: {
      placeId: { type: String, default: "" },
      name: { type: String, default: "" },
      formattedAddress: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      source: { type: String, default: "google_places" },
    },
    locationData: { type: Object, default: null },
    serviceLocationData: { type: Object, default: null },
    languageEntries: [
      {
        label: { type: String, default: "" },
        value: { type: String, default: "" },
        aliases: [{ type: String }],
        source: {
          type: String,
          enum: ["predefined", "custom"],
          default: "predefined",
        },
      },
    ],

    geoPoint: {
      type: {
        type: String,
        enum: ["Point"],
        default: undefined,
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
    locationUpdatedAt: { type: Date, default: null },
    whatsappFreelancePlanActive: {
      type: Boolean,
      default: false,
    },
    whatsappFreelancePlanSubscriptionId: {
      type: String,
      default: null,
    },
    whatsappFreelancePlanExpiry: {
      type: Date,
      default: null,
    },
    languages: [{ type: String }],
    description: { type: String, default: "" },
    portfolioLinks: [
      {
        platform: { type: String, required: true },
        url: { type: String, required: true },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        isPublic: { type: Boolean, default: false },
        submittedAt: { type: Date, default: Date.now },
        approvedAt: { type: Date, default: null },
        reviewedAt: { type: Date, default: null },
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        rejectionReason: { type: String, default: "" },
      },
    ],
    projects: [
      {
        name: { type: String, default: "" },
        link: { type: String, default: "" },
        description: { type: String, default: "" },
        visibleForAll: { type: Boolean, default: true },
      },
    ],
    uploadedAssets: [
      {
        originalName: { type: String },
        mimeType: { type: String },
        finalSize: { type: Number },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
        assetType: { type: String, enum: ["profile_photo", "document"] },
        url: { type: String },
      },
    ],
    pricing: { type: String, default: "" },
    pricingType: {
      type: String,
      enum: ["hourly", "daily", "monthly", "fixed", ""],
      default: "",
    },
    documents: [{ type: String }],
    resumeUrl: { type: String, default: "" },
    photo: { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    profileName: { type: String, default: "" }, // Separate display name for provider
    profilePhotoApproval: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
      pendingUrl: { type: String, default: "" },
      approvedUrl: { type: String, default: "" },
      rejectionReason: { type: String, default: "" },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      reviewedAt: { type: Date, default: null },
    },
    resumeApproval: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
      pendingUrl: { type: String, default: "" },
      approvedUrl: { type: String, default: "" },
      rejectionReason: { type: String, default: "" },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      reviewedAt: { type: Date, default: null },
    },

    approvalSections: {
      type: [approvalSectionSchema],
      default: [],
    },
    activityLogs: {
      type: [activityLogSchema],
      default: [],
    },
    followBackRequest: {
      status: { type: String, default: "" },
      question: { type: String, default: "" },
      sectionKey: { type: String, default: "general" },
      requestedAt: { type: Date, default: null },
      requestedBy: { type: String, default: "Admin" },
      answer: { type: String, default: "" },
      attachmentUrl: { type: String, default: "" },
      respondedAt: { type: Date, default: null },
    },

    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    profileCompletion: { type: Number, default: 0 },
    contactVisibility: {
      type: String,
      enum: ["both", "email_only", "phone_only", "none"],
      default: "both",
    },
    isPublicProfile: { type: Boolean, default: false },
    whatsappConsent: { type: Boolean, default: false },
    availabilitySummary: {
      isAvailableNow: { type: Boolean, default: true },
      nextAvailableAt: { type: Date, default: null },
      slotsSummary: { type: String, default: "" },
    },
    trustScore: { type: Number, default: 0, min: 0, max: 100 },
    rankingScore: { type: Number, default: 0, min: 0, max: 100 },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    approvalAction: {
      type: String,
      enum: ["approved", "rejected", "pending"],
      default: "pending",
    },
    approvalNote: { type: String, default: "" },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedByRole: { type: String, enum: ["admin", "manager"], default: null },
    approvedAt: { type: Date, default: null },

    // Plan & boost
    currentPlan: { type: String, default: "free" },
    planExpiresAt: { type: Date },
    subscriptionPlan: { type: String, default: "free" },
    subscriptionStartDate: { type: Date, default: null },
    subscriptionEndDate: { type: Date, default: null },
    isActiveSubscription: { type: Boolean, default: false },
    isTopCity: { type: Boolean, default: false },
    boostWeight: { type: Number, default: 0 },

    // Visibility plan fields
    activePlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },
    activeSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProviderSubscription",
      default: null,
    },
    visibilityLevel: {
      type: String,
      enum: ["basic", "pincode_top", "city_top", "country_top", "custom"],
      default: "basic",
    },
    boostedUntil: { type: Date, default: null },
    allowedSkillsCount: { type: Number, default: 1 },
    allowedPincodesCount: { type: Number, default: 1 },
    allowedCitiesCount: { type: Number, default: 1 },
    planCoverageType: {
      type: String,
      enum: ["pincode", "city", "country", "custom"],
      default: "pincode",
    },
    isTopInPincode: { type: Boolean, default: false },
    isTopInCity: { type: Boolean, default: false },
    isTopInCountry: { type: Boolean, default: false },
    priorityWeight: { type: Number, default: 0 },

    // Rotation pool
    inRotationPool: { type: Boolean, default: false },
    lastShownAt: { type: Date },

    // Validity
    profileExpiresAt: { type: Date },
    renewalReminderSent: { type: Boolean, default: false },

    // WhatsApp
    whatsappAlerts: { type: Boolean, default: true },
    workMode: [{ type: String, trim: true }],
    jobType: [{ type: String, trim: true }],
    willingToTravelKm: { type: Number, default: 0 },
    remoteAvailable: { type: Boolean, default: false },
    relocationAvailable: { type: Boolean, default: false },
    preferredCountries: [{ type: String, trim: true }],
    aiSuggestions: [{ type: mongoose.Schema.Types.Mixed, default: {} }],
    embedding: { type: mongoose.Schema.Types.Mixed, default: null },
    embeddingText: { type: String, default: "" },
    planBenefitsSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },

    // Stats
    profileViews: { type: Number, default: 0 },
    leadsReceived: { type: Number, default: 0 },
    contactsUnlocked: { type: Number, default: 0 },
    serviceLocations: [serviceLocationSchema],
    customConfig: { type: Object, default: null },

    // ─── AI Resume Parsing ───────────────────────────────────────────────────────
    resumeParsing: {
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
      },
      provider: { type: String, default: "" }, // 'gemini' | 'anthropic' | 'openai'
      parsedAt: { type: Date, default: null },
      errorMessage: { type: String, default: "" },
      confidenceScore: { type: Number, default: null },
    },
    lastAnalyzedHash: { type: String, default: null },
    // Raw parsed output from AI (Mixed to allow flexible schema)
    parsedResumeData: { type: mongoose.Schema.Types.Mixed, default: null },
    isResumeAutoGenerated: { type: Boolean, default: false },

    // ─── Freelancer Profile Core ──────────────────────────────────────────────────
    originalBio: { type: String, default: "" },
    originalSkills: [{ type: String }],
    originalPortfolioLinks: [{ type: mongoose.Schema.Types.Mixed }],
    aiGeneratedDraft: { type: mongoose.Schema.Types.Mixed, default: null },
    finalBio: { type: String, default: "" },
    category: { type: String, default: "" },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    profileStatus: {
      type: String,
      enum: ["draft", "pending_review", "published"],
      default: "draft",
    },
    freelancerAnalytics: {
      profileViews: { type: Number, default: 0 },
      responseRate: { type: Number, default: 0 },
      trendingSkillScore: { type: Number, default: 0 },
      freelanceOpportunities: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

providerProfileSchema.index({ skills: 1, city: 1 });
providerProfileSchema.index({ city: 1 });
providerProfileSchema.index({ tier: 1 });
providerProfileSchema.index({ boostWeight: -1 });
providerProfileSchema.index({ latitude: 1, longitude: 1 });
providerProfileSchema.index({ geoPoint: "2dsphere" }, { sparse: true });
providerProfileSchema.index({ user: 1, rankingScore: -1 });

providerProfileSchema.pre("save", function determineTier(next) {
  if (this.skills && this.skills.length > 0) {
    const {
      canonicalizeSpeciality,
    } = require("../services/providerIntelligenceService");
    let highestLevel = "unskilled";
    for (const skill of this.skills) {
      const canonical = canonicalizeSpeciality(skill);
      if (canonical.skillLevel === "skilled") {
        highestLevel = "skilled";
        break;
      } else if (canonical.skillLevel === "semi-skilled") {
        highestLevel = "semi-skilled";
      }
    }
    this.tier = highestLevel;
    this.skillLevel = highestLevel;
  }
  next();
});

providerProfileSchema.pre("save", function normalizeGeoPoint(next) {
  const lat = Number(this.latitude);
  const lng = Number(this.longitude);

  const hasValidCoordinates =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  if (hasValidCoordinates) {
    this.geoPoint = {
      type: "Point",
      coordinates: [lng, lat],
    };
  } else {
    // Keep geo index sparse-safe when profile has no coordinates.
    this.geoPoint = undefined;
  }

  next();
});

// Post-init hook to migrate legacy portfolioLinks (flat strings) on standard Mongoose retrieval
providerProfileSchema.post("init", function (doc) {
  if (doc.portfolioLinks && Array.isArray(doc.portfolioLinks)) {
    doc.portfolioLinks = doc.portfolioLinks.map((link) => {
      if (typeof link === "string") {
        const { detectPlatform } = require("../utils/urlSafetyService");
        return {
          platform: detectPlatform(link),
          url: link,
          status: "approved",
          submittedAt: new Date(),
        };
      }
      return link;
    });
  }
});

providerProfileSchema.pre("save", function (next) {
  // If the user's primary skills change, clear the cached AI-expanded skills
  if (this.isModified("skills")) {
    this.expandedSkills = [];
  }
  next();
});

module.exports = mongoose.model("ProviderProfile", providerProfileSchema);
