const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    code: { type: String, unique: true, sparse: true },
    audience: { type: String, enum: ["provider", "recruiter"] },
    planType: {
      type: String,
      enum: ["free", "paid", "custom"],
      default: "paid",
    },
    type: { type: String, enum: ["provider", "recruiter"], required: true },
    price: { type: Number, required: true },
    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly", "half_yearly", "yearly", "custom"],
      default: "monthly",
    },
    gstPercent: { type: Number, default: 0 },
    contactLimit: { type: Number, default: 0 },
    isDefaultFree: { type: Boolean, default: false },
    priceMonthly: { type: Number, default: 0 },
    discountedPrice: { type: Number, default: 0 },
    description: { type: String, default: "" },
    coverageType: {
      type: String,
      enum: ["pincode", "city", "country", "custom"],
      default: "pincode",
    },
    currency: { type: String, default: "INR" },
    priceAED: { type: Number, default: 0 },
    priceUSD: { type: Number, default: 0 },
    duration: { type: Number, default: 365 }, // in days (1 year default)
    features: [{ type: String }],
    aiLimits: {
      // Provider Features
      chatAssistant: { type: Number, default: 0 },
      aiCareerAnalysis: { type: Number, default: 0 },
      atsScore: { type: Number, default: 0 },
      skillGapReport: { type: Number, default: 0 },
      whyNotHired: { type: Number, default: 0 },
      interviewCallProb: { type: Number, default: 0 },
      resumeImprovement: { type: Number, default: 0 },
      careerGps: { type: Number, default: 0 },
      salaryInsights: { type: Number, default: 0 },
      mockInterview: { type: Number, default: 0 },
      careerHealth: { type: Number, default: 0 },
      refreshInsight: { type: Number, default: 0 },
      careerReport: { type: Number, default: 0 },
      claudeDeepReports: { type: Number, default: 0 },

      // Detailed Page-wise Provider Features
      resumeOptimization: { type: Number, default: 0 }, // Profile
      careerHealthRefresh: { type: Number, default: 0 }, // Career Health
      interviewQuestionsRefresh: { type: Number, default: 0 }, // Grow With AI
      careerGpsRefresh: { type: Number, default: 0 }, // Grow With AI
      whyNotHiredRefresh: { type: Number, default: 0 }, // Grow With AI
      skillGapRefresh: { type: Number, default: 0 }, // Grow With AI
      atsOptimizerRefresh: { type: Number, default: 0 }, // Grow With AI
      chatMessagesLimit: { type: Number, default: 0 }, // AI Career Coach
      dailyTasksRefresh: { type: Number, default: 0 }, // AI Career Coach
      careerPlanRefresh: { type: Number, default: 0 }, // AI Career Coach
      resourcesRefresh: { type: Number, default: 0 }, // AI Career Coach
      progressRefresh: { type: Number, default: 0 }, // AI Career Coach
      aiTipsRefresh: { type: Number, default: 0 }, // AI Tips
      resumeScoreRefresh: { type: Number, default: 0 }, // Resume Toolkit
      autoAnalysisLimit: { type: Number, default: 0 }, // Profile/Resume save triggers

      // Recruiter Features
      aiJdGenerator: { type: Number, default: 0 },
      aiJdParsing: { type: Number, default: 0 },
      aiCopilot: { type: Number, default: 0 },
      interviewKits: { type: Number, default: 0 },
      jobPostLimit: { type: Number, default: 0 },
      jobBoostJobsLimit: { type: Number, default: 0 },
      jobBoostDaysLimit: { type: Number, default: 0 },
      outreachCampaigns: { type: Number, default: 0 },
      directMessaging: { type: Number, default: 0 },
      customReports: { type: Number, default: 0 },
    },
    maxSkills: { type: Number, default: 4 },
    maxPincodes: { type: Number, default: 1 },
    maxCities: { type: Number, default: 1 },
    visibilityLevel: {
      type: String,
      enum: ["basic", "pincode_top", "city_top", "country_top", "custom"],
      default: "basic",
    },
    unlockCredits: { type: Number, default: 0 },
    boostWeight: { type: Number, default: 0 },
    isRotationEligible: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    country: { type: String, default: "IN" },
    countryPricing: {
      type: [
        {
          countryCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
          },
          countryName: { type: String, trim: true },
          currency: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
          },
          currencySymbol: { type: String, trim: true },
          basePrice: { type: Number, min: 0, required: true },
          discountedPrice: { type: Number, min: 0, default: 0 },
          taxName: { type: String, default: "GST", trim: true },
          taxPercent: { type: Number, default: 0, min: 0 },
          isTaxInclusive: { type: Boolean, default: false },
          isActive: { type: Boolean, default: true },
        },
      ],
      validate: {
        validator: function (val) {
          if (!val) return true;
          const codes = val.map((entry) =>
            String(entry.countryCode).toUpperCase().trim(),
          );
          return codes.length === new Set(codes).size;
        },
        message: "Duplicate country pricing entry found.",
      },
    },
    availableCountries: [{ type: String, uppercase: true, trim: true }],
    sortOrder: { type: Number, default: 0 },
    showOnLandingPage: { type: Boolean, default: false },

    priorityWeight: { type: Number, default: 0 },
    allowedSkills: { type: mongoose.Schema.Types.Mixed, default: 1 }, // Number or "multiple"
    allowedPincodes: { type: mongoose.Schema.Types.Mixed, default: 1 }, // Number or "all_city" or "country"
    allowedCities: { type: mongoose.Schema.Types.Mixed, default: 1 }, // Number or "multiple"
    planBenefits: { type: mongoose.Schema.Types.Mixed, default: null },
    supportsWhatsappAlerts: { type: Boolean, default: false },
    supportsSmsAlerts: { type: Boolean, default: false },
    supportsPerformanceInsights: { type: Boolean, default: false },
    metadata: { type: Object, default: {} },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },

    maxJobApplications: { type: Number, default: 0 },
    usageResetCycle: {
      type: String,
      enum: ["monthly", "yearly", "none"],
      default: "monthly",
    },
    isProviderDefault: { type: Boolean, default: false },
    isCustomisable: { type: Boolean, default: false },
    planCategory: {
      type: String,
      enum: [
        "default_free",
        "multiple_skills",
        "locality_top",
        "city_top",
        "country_top",
        "custom",
        "general",
      ],
      default: "general",
    },
    customConfig: {
      allowSkillSelection: { type: Boolean, default: false },
      allowCitySelection: { type: Boolean, default: false },
      allowPincodeSelection: { type: Boolean, default: false },
      allowVisibilitySelection: { type: Boolean, default: false },
      allowDurationSelection: { type: Boolean, default: false },
      minSkills: { type: Number, default: 1 },
      maxSkills: { type: Number, default: 10 },
      minCities: { type: Number, default: 1 },
      maxCities: { type: Number, default: 10 },
      minPincodes: { type: Number, default: 1 },
      maxPincodes: { type: Number, default: 50 },
      minDurationMonths: { type: Number, default: 1 },
      maxDurationMonths: { type: Number, default: 12 },
    },
  },
  { timestamps: true },
);

planSchema.index({ type: 1, slug: 1, duration: 1 }, { unique: true });
planSchema.index(
  { type: 1, slug: 1, duration: 1, country: 1, billingCycle: 1 },
  { unique: true, sparse: true },
);
planSchema.index(
  { type: 1, isProviderDefault: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: "provider",
      isProviderDefault: true,
      status: "active",
    },
  },
);

module.exports = mongoose.model("Plan", planSchema);
