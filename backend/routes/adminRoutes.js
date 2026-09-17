const express = require("express");
const router = express.Router();
const {
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
  setPlanDefault,
  setPlanPopular,
  updatePlanStatus,
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
  uploadProfilePhoto,
  getProfilePhoto,
  getProfilePhotoApprovals,
  approveProfilePhoto,
  rejectProfilePhoto,
  getProfileApprovalStats,
  getAllReferrals,
  uploadProvidersCSV,
  uploadRecruitersCSV,
  getPortfolioApprovals,
  approvePortfolioLink,
  rejectPortfolioLink,
  getResumeApprovalStats,
  getResumeApprovals,
  approveResume,
  rejectResume,
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
  getContactLogs,
  getOtpLogs,
  getImportBatches,
  getImportBatchStatus,
  updateImportBatchAction,
} = require("../controllers/adminController");
const {
  getProfileReviewStats,
  getDistinctLocations,
  getProfileReviews,
  getProfileReviewDetail,
  approveSection,
  rejectSection,
  addSectionRemark,
  sendCorrectionEmail,
  bulkProfileAction,
  requestFollowBack,
} = require("../controllers/profileReviewController");

const upload = require("../middleware/upload");
const {
  getProviderSubscriptions,
  updateProviderSubscriptionStatus,
} = require("../controllers/adminProviderSubscriptionController");
const {
  getUserSubscriptions,
  getUserSubscriptionAnalytics,
  sendSubscriptionReminder,
  bulkAction: bulkUserSubscriptionAction,
  updateUserSubscriptionStatus,
} = require("../controllers/adminUserSubscriptionController");
const { protectAdmin, authorizeAdmin } = require("../middleware/adminAuth");
const { getRegistryCompanies, syncRegistryCompanyJobs } = require('../controllers/adminRegistryController');
const { getSeoHealthDashboard, updateSeoIntegration } = require("../controllers/seoCommandController");
const selfHealingController = require('../controllers/selfHealingController');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

// Admin content management (public for terms/privacy/faq display)
router.get("/content/:type", getContent);
router.put(
  "/content/:type",
  protectAdmin,
  authorizeAdmin(),
  updateContent,
);

// Admin authenticated scope
router.use(protectAdmin, authorizeAdmin());

// Manager-capable approval routes
router.get("/providers", getProviders);
router.patch("/users/:userId/approve", approveUser);
router.patch("/users/:userId/reject", rejectUser);
router.get("/recruiters", getRecruiters);

// Admin-only routes
router.use(authorizeAdmin());

router.get("/dashboard", getDashboard);
router.get("/imports", getImportBatches);
router.get("/imports/:id", getImportBatchStatus);
router.put("/imports/:id/action", updateImportBatchAction);
router.post("/providers/upload", upload.single("file"), uploadProvidersCSV);
router.post("/recruiters/upload", upload.single("file"), uploadRecruitersCSV);
router.get("/users", getUsers);
router.get("/users/:userId", getUserDetail);
router.put("/users/:userId/block", toggleBlockUser);
router.post("/managers", createManager);
router.get("/managers", getManagers);
router.delete("/managers/:id", deleteManager);
router.get("/approval-logs", getApprovalLogs);
router.delete("/users/:id", deleteUser);
router.delete("/providers/:id", deleteProvider);
router.delete("/recruiters/:id", deleteRecruiter);
router.get("/plans", getAllPlans);
router.post("/plans", createPlan);
router.put("/plans/:id", updatePlan);
router.delete("/plans/:id", deletePlan);
router.patch("/plans/:id/status", updatePlanStatus);
router.patch("/plans/:id/set-default", setPlanDefault);
router.patch("/plans/:id/popular", setPlanPopular);

// Custom Plan Requests
const { getCustomPlanRequests, updateCustomPlanRequestStatus, generateCustomPlanOffer, getCustomPlanPricingSettings, updateCustomPlanPricingSettings, clearAllCustomPlanRequests } = require('../controllers/adminController');
router.get("/custom-plans/pricing-settings", getCustomPlanPricingSettings);
router.put("/custom-plans/pricing-settings", updateCustomPlanPricingSettings);
router.get("/custom-plans", getCustomPlanRequests);
router.delete("/custom-plans", clearAllCustomPlanRequests);
router.patch("/custom-plans/:id/status", updateCustomPlanRequestStatus);
router.post("/custom-plans/:id/offer", generateCustomPlanOffer);

// Step 9 specific compatible admin provider plans endpoints
router.get("/provider-plans", getAllPlans);
router.post("/provider-plans", createPlan);
router.put("/provider-plans/:id", updatePlan);
router.delete("/provider-plans/:id", deletePlan);
router.patch("/provider-plans/:id/status", updatePlanStatus);
router.patch("/provider-plans/:id/set-default", setPlanDefault);
router.patch("/provider-plans/:id/popular", setPlanPopular);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/rotation-pools", getRotationPools);
router.post("/rotation-pools", createRotationPool);
router.put("/rotation-pools/:id", updateRotationPool);
router.post("/rotation-pools/:id/start", startRotationPool);
router.post("/rotation-pools/:id/pause", pauseRotationPool);
router.post("/rotation-pools/:id/stop", stopRotationPool);
router.post("/rotation-pools/:id/advance", advanceRotationPool);
router.delete("/rotation-pools/:id", deleteRotationPool);
router.get("/payments", getPayments);
router.get("/payment-settings", getPaymentSettings);
router.put("/payment-settings", updatePaymentSettings);
router.get("/currency-settings", getCurrencySettings);
router.put("/currency-settings", updateCurrencySettings);
router.get("/cloudinary-settings", getCloudinarySettings);
router.put("/cloudinary-settings", updateCloudinarySettings);

// SEO Command Center
router.get("/seo-command-dashboard", requireOperationalFlags('ENABLE_SEO_AUTOMATION'), getSeoHealthDashboard);
router.post("/seo-command-dashboard/integrations/:id", updateSeoIntegration);

// Self-Healing Center
const requireSelfHealing = requireOperationalFlags('ENABLE_SELF_HEALING', 'ENABLE_PIPELINE_JOBS');
router.get("/self-healing/flagged", requireSelfHealing, selfHealingController.getFlaggedJobs);
router.post("/self-healing/apply-fix", requireSelfHealing, selfHealingController.applyFix);
router.post("/self-healing/undo-fix", requireSelfHealing, selfHealingController.undoFix);

router.get("/whatsapp-logs", getWhatsappLogs);
router.get("/whatsapp-settings", getWhatsappSettings);
router.put("/whatsapp-settings", updateWhatsappSettings);

router.get("/contact-logs", getContactLogs);
router.get("/otp-logs", getOtpLogs);

// Scraper & Staging Candidates
const { getStagingCandidates, updateStagingCandidateToggle } = require("../controllers/adminScraperController");
const { startBulkBatch, getBulkBatches, updateBatchStatus, getSettings: getCrawlerSettings, updateSettings: updateCrawlerSettings, getMappedCompanies, downloadCareerPagesCSV, toggleCompanyStatus, rescrapeCompany, triggerNightlyCrawlNow } = require("../controllers/adminCrawlerController");

router.get("/staging-candidates", requireOperationalFlags('ENABLE_PIPELINE_JOBS'), getStagingCandidates);
router.put("/staging-candidates/:id/toggle", requireOperationalFlags('ENABLE_PIPELINE_JOBS'), updateStagingCandidateToggle);

// Crawlers
const requireCrawlerOperations = requireOperationalFlags('ENABLE_CRAWLERS');
router.get("/crawlers/settings", requireCrawlerOperations, getCrawlerSettings);
router.put("/crawlers/settings", requireCrawlerOperations, updateCrawlerSettings);
router.post("/crawlers/batches", requireCrawlerOperations, startBulkBatch);
router.get("/crawlers/batches", requireCrawlerOperations, getBulkBatches);
router.put("/crawlers/batches/:id/status", requireCrawlerOperations, updateBatchStatus);
router.get("/crawlers/mapped-companies", requireCrawlerOperations, getMappedCompanies);
router.get("/crawlers/mapped-companies/csv", requireCrawlerOperations, downloadCareerPagesCSV);
router.put("/crawlers/mapped-companies/:id/status", requireCrawlerOperations, toggleCompanyStatus);
router.post("/crawlers/mapped-companies/:id/rescrape", requireCrawlerOperations, rescrapeCompany);
router.post("/crawlers/nightly-run", requireCrawlerOperations, triggerNightlyCrawlNow);
router.get("/feature-flags", getFeatureFlags);
router.put("/feature-flags/:key", updateFeatureFlag);
router.get("/jobs", getAllJobs);
router.get("/referrals", getAllReferrals);
router.get("/provider-subscriptions", getProviderSubscriptions);
router.get("/user-subscriptions", getUserSubscriptions);
router.get("/user-subscriptions/analytics", getUserSubscriptionAnalytics);
router.post("/user-subscriptions/send-reminder", sendSubscriptionReminder);
router.post("/user-subscriptions/bulk-action", bulkUserSubscriptionAction);
router.patch("/user-subscriptions/:id/status", updateUserSubscriptionStatus);
router.patch(
  "/provider-subscriptions/:id/status",
  updateProviderSubscriptionStatus,
);
router.post(
  "/profile/photo",
  upload.single("profilePhoto"),
  uploadProfilePhoto,
);
router.get("/profile/photo", getProfilePhoto);
router.get('/profile-photo-approvals', getProfilePhotoApprovals);
router.get('/profile-approvals', getProfilePhotoApprovals);
router.get('/profile-approvals/stats', getProfileApprovalStats);
router.patch('/profile-photo-approvals/:role/:userId/approve', approveProfilePhoto);
router.patch('/profile-approvals/:role/:userId/approve', approveProfilePhoto);
router.patch('/profile-photo-approvals/:role/:userId/reject', rejectProfilePhoto);
router.patch('/profile-approvals/:role/:userId/reject', rejectProfilePhoto);

// Resume approvals routes
router.get('/resume-approvals', getResumeApprovals);
router.get('/resume-approvals/stats', getResumeApprovalStats);
router.patch('/resume-approvals/:userId/approve', approveResume);
router.patch('/resume-approvals/:userId/reject', rejectResume);

// Portfolio link approvals routes
router.get('/portfolio-approvals', getPortfolioApprovals);
router.patch('/portfolio-approvals/:profileId/:linkId/approve', approvePortfolioLink);
router.patch('/portfolio-approvals/:profileId/:linkId/reject', rejectPortfolioLink);

// Skill category management (admin)
router.get("/skills", getSkillCategories);
router.post("/skills", createSkillCategory);
router.put("/skills/:id", updateSkillCategory);
router.patch("/skills/:id/status", updateSkillCategoryStatus);
router.delete("/skills/:id", deleteSkillCategory);
router.post("/skills/:id/skills", addSkillToCategory);
router.delete("/skills/:id/skills/:skillId", removeSkillFromCategory);

// Profile Review System (smart search, section-level approval, bulk actions)
router.get('/profile-reviews', getProfileReviews);
router.get('/profile-reviews/stats', getProfileReviewStats);
router.get('/profile-reviews/distinct-locations', getDistinctLocations);
router.get('/profile-reviews/:userId', getProfileReviewDetail);
router.patch('/profile-reviews/:userId/sections/:sectionKey/approve', approveSection);
router.patch('/profile-reviews/:userId/sections/:sectionKey/reject', rejectSection);
router.post('/profile-reviews/:userId/sections/:sectionKey/remark', addSectionRemark);
router.post('/profile-reviews/:userId/notify', sendCorrectionEmail);
router.post('/profile-reviews/:userId/follow-back', requestFollowBack);
router.post('/profile-reviews/bulk', bulkProfileAction);

// Registry Companies Routes (CompanyMaster)
router.get('/registry-companies', getRegistryCompanies);
router.post('/registry-companies/:id/sync', requireOperationalFlags('ENABLE_CRAWLERS', 'ENABLE_CONNECTORS'), syncRegistryCompanyJobs);

// Country Config CRUD (admin)
router.get("/countries", getCountries);
router.post("/countries", createCountryConfig);
router.put("/countries/:id", updateCountryConfig);
router.delete("/countries/:id", deleteCountryConfig);
router.post("/countries/:id/validate", validateCountryConfig);
router.post("/countries/:id/activate", activateCountryConfig);
router.post("/countries/:id/deactivate", deactivateCountryConfig);
router.post("/countries/:id/start-sync", startCountrySync);
router.post("/countries/:id/pause-sync", pauseCountrySync);
router.post("/countries/:id/stop-sync", stopCountrySync);

// ─── Audit Log Routes ─────────────────────────────────────────────────────────
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { listOtpLogs, listResumeAccessLogs } = require('../services/auditPersistenceService');
const { listProfileUnlocks } = require('../services/billingPersistenceService');

// OTP Logs
router.get('/logs/otp', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20, 10)));
    const search = String(req.query.search || '').trim();
    const channel = String(req.query.channel || '').trim();
    const status = String(req.query.status || '').trim();
    const dateRange = String(req.query.dateRange || 'all').trim();
    const startDateParam = req.query.startDate;
    const endDateParam = req.query.endDate;

    const now = new Date();
    let startDate, endDate;
    if (dateRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateRange === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
    } else if (dateRange === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    } else if (dateRange === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date();
    } else if (dateRange === 'custom' && (startDateParam || endDateParam)) {
      if (startDateParam) startDate = new Date(startDateParam);
      if (endDateParam) {
        endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const result = await listOtpLogs({
      page,
      limit,
      search,
      channel,
      status,
      startDate,
      endDate,
    });

    return res.json({ logs: result.logs, total: result.total, page, pages: Math.ceil(result.total / limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch OTP logs.', error: err.message });
  }
});

// AI Resume Parse Logs
router.get('/logs/ai-resume', async (req, res) => {
  try {
    if (process.env.ENABLE_AI_RESUME_LOGS !== 'true') {
      return res.status(503).json({
        message: 'AI resume parsing logs are disabled by configuration.',
        logs: [],
        total: 0,
        page: 1,
        pages: 0,
      });
    }

    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20, 10)));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    const where = {
      resumeParsing: { not: null },
    };

    const [profiles, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          userRecord: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.providerProfile.count({ where }),
    ]);

    let logs = profiles.map((p) => {
      const item = withLegacyId(p);
      item.user = withLegacyId(p.userRecord);
      delete item.userRecord;
      return item;
    });

    if (search) {
      logs = logs.filter(p =>
        (p.user?.name || '').match(new RegExp(search, 'i')) ||
        (p.user?.email || '').match(new RegExp(search, 'i'))
      );
    }

    return res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch AI resume logs.', error: err.message });
  }
});

// Candidate Unlock Logs
router.get('/logs/candidate-unlocks', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20, 10)));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const purpose = String(req.query.purpose || 'all').trim();
    const dateRange = String(req.query.dateRange || 'all').trim();
    const startDateParam = req.query.startDate;
    const endDateParam = req.query.endDate;

    const query = {};

    if (purpose && purpose !== 'all') {
      query.purpose = purpose;
    }

    // Date Range Filter
    const now = new Date();
    let start, end;

    if (dateRange === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateRange === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
    } else if (dateRange === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date();
    } else if (dateRange === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date();
    } else if (dateRange === 'custom' && (startDateParam || endDateParam)) {
      if (startDateParam) start = new Date(startDateParam);
      if (endDateParam) {
        end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
      }
    }

    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.gte = start;
      if (end) query.createdAt.lte = end;
    }

    let { unlocks: logs, total } = await listProfileUnlocks({
      where: query,
      page,
      limit,
    });

    // Fallback: If no ProfileUnlock documents exist yet, check Lead collection for contact_unlock type
    if (total === 0) {
      const leadQuery = { type: 'contact_unlock' };
      if (start || end) {
        leadQuery.createdAt = {};
        if (start) leadQuery.createdAt.gte = start;
        if (end) leadQuery.createdAt.lte = end;
      }
      const [leads, leadTotal] = await Promise.all([
        prisma.lead.findMany({
          where: leadQuery,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            recruiterRecord: { select: { id: true, name: true, email: true } },
            providerRecord: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.lead.count({ where: leadQuery }),
      ]);

      if (leadTotal > 0) {
        total = leadTotal;
        logs = leads.map(l => ({
          _id: l.id,
          id: l.id,
          recruiterId: withLegacyId(l.recruiterRecord),
          providerId: withLegacyId(l.providerRecord),
          purpose: 'view_contact',
          otpVerified: true,
          unlockedAt: l.createdAt,
          createdAt: l.createdAt,
        }));
      }
    }

    // Filter by search query if present
    if (search) {
      logs = logs.filter(l =>
        (l.recruiterId?.name || '').match(new RegExp(search, 'i')) ||
        (l.recruiterId?.email || '').match(new RegExp(search, 'i')) ||
        (l.providerId?.name || '').match(new RegExp(search, 'i')) ||
        (l.providerId?.email || '').match(new RegExp(search, 'i'))
      );
    }

    return res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch unlock logs.', error: err.message });
  }
});

// Resume Access Logs (Paid Recruiters downloading resumes via R2 temporary links)
router.get('/logs/resume-access', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20, 10)));
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'all').trim();
    const dateRange = String(req.query.dateRange || 'all').trim();
    const startDateParam = req.query.startDate;
    const endDateParam = req.query.endDate;

    const now = new Date();
    let startDate, endDate;

    if (dateRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateRange === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
    } else if (dateRange === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    } else if (dateRange === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date();
    } else if (dateRange === 'custom' && (startDateParam || endDateParam)) {
      if (startDateParam) startDate = new Date(startDateParam);
      if (endDateParam) {
        endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const result = await listResumeAccessLogs({
      page,
      limit,
      search,
      status,
      startDate,
      endDate,
    });

    return res.json({ logs: result.logs, total: result.total, page, pages: Math.ceil(result.total / limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch resume access logs.', error: err.message });
  }
});

module.exports = router;

