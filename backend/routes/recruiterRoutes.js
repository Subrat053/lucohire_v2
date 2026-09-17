const express = require('express');
const router = express.Router();
const {
  getRecruiterJobs,
  getRecruiterJobApplications,
  getRecruiterApplicationDetails,
  unlockProviderProfile,
  getRecruiterProviderProfile,
  patchApplicationStatus
} = require('../controllers/jobInteractionController');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const {
  getDashboard,
  updateProfile,
  searchProviders,
  viewProvider,
  unlockContact,
  viewCv,
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
  uploadProfilePhoto,
  deleteProfilePhoto,
  getMyHistory,
  checkUnlockStatus,
  generateAIJobDescription,
  deleteJob,
  updateJob,
  updateApplicationStatus,
  deleteApplication,
  getSavedCandidates,
  addSavedCandidate,
  removeSavedCandidate,
  getShortlistedCandidates,
  addShortlistedCandidate,
  removeShortlistedCandidate,
  createCustomPlanRequest,
  getMyCustomPlanRequests,
  cancelCustomPlanRequest,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getOutreachCampaigns,
  getOutreachPreview,
  runOutreachCampaign,
  getTalentPoolJobs,
  runAIEvaluation,
  addCandidateNote,
  addCandidateTag,
  rejectCandidate,
  getAiUsage
} = require('../controllers/recruiterController');

const reportsController = require('../controllers/reportsController');

const { addReviewLegacy } = require('../controllers/reviewController');
const { protect, authorizeRoleFromActive } = require('../middleware/auth');
const { checkPostLimit, checkUnlockLimit } = require('../middleware/subscription');
const { ensureRecruiterApproved } = require('../middleware/recruiterApproval');
const { requireFeatureFlag } = require('../middleware/featureFlag');
const { checkRecruiterAiLimit } = require('../middleware/recruiterAiUsage');
const recruiterAiWorkspaceController = require('../controllers/recruiterAiWorkspaceController');
const recruiterCopilotController = require('../controllers/recruiterCopilot.controller');
const { validateRequest } = require('../middleware/validate');
const { aiRateLimiter } = require('../middleware/aiRateLimit');
const { recruiterAIJobDescriptionValidation } = require('../validators/aiValidators');
const upload = require('../middleware/upload');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

const recruiterAiGate = requireOperationalFlags('AI_FEATURES_ENABLED', 'ENABLE_RECRUITER_AI');
const recruiterProfileAiGate = requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_PROFILE_ENABLED', 'ENABLE_RECRUITER_AI');
const recruiterChatGate = requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_CHAT_ENABLED', 'ENABLE_RECRUITER_AI');
const recruiterMatchingGate = requireOperationalFlags('ENABLE_RECRUITER_MATCHING');
const outreachGate = requireOperationalFlags('ENABLE_OUTREACH', 'ENABLE_COMMUNICATION_PROVIDERS');

// Optional auth: attach req.user when token is provided.
const optionalAuth = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer')) {
    try {
      const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
      req.user = withLegacyId(await prisma.user.findUnique({
        where: { id: String(decoded.id) },
        select: {
          id: true,
          roles: true,
          activeRole: true,
          role: true,
          panelAccess: true,
          isBlocked: true,
          email: true,
          name: true,
          phone: true,
          whatsappNumber: true,
          authProvider: true,
          approvalStatus: true,
          roleIntent: true,
          activePanel: true,
          country: true,
          currency: true,
          locale: true,
          preferredLanguage: true,
          avatar: true,
          termsAccepted: true,
          profilePhoto: true,
          profilePhotoApproval: true,
        },
      }));
      if (req.user) {
        const roles = Array.isArray(req.user.roles) ? [...req.user.roles] : [];
        if (req.user.role && !roles.includes(req.user.role)) roles.push(req.user.role);
        req.user.roles = roles;
        req.user.activeRole = req.user.activeRole || roles[0] || null;
      }
    } catch (_) {}
  }
  next();
};

router.get('/dashboard', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getDashboard);
router.get('/reports/overview-metrics', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, reportsController.getOverviewMetrics);
router.get('/reports/funnel', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, reportsController.getHiringFunnel);
router.get('/reports/job-performance', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, reportsController.getJobPerformance);
router.get('/reports/source-analytics', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, reportsController.getSourceAnalytics);
router.get('/reports/outreach-analytics', outreachGate, protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, reportsController.getOutreachAnalytics);
router.get('/reports/ai-insights', recruiterAiGate, protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, reportsController.getAiInsights);
router.get('/reports/custom-exports', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, reportsController.getCustomExportsData);
router.put('/profile', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, updateProfile);
router.post(
  '/ai/job-description',
  protect,
  authorizeRoleFromActive('recruiter'),
  ensureRecruiterApproved,
  recruiterProfileAiGate,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: false }),
  aiRateLimiter,
  checkRecruiterAiLimit('aiJdGenerator'),
  recruiterAIJobDescriptionValidation,
  validateRequest,
  generateAIJobDescription
);
router.post(
  '/ai/generate-jd',
  protect,
  authorizeRoleFromActive('recruiter'),
  ensureRecruiterApproved,
  recruiterProfileAiGate,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: false }),
  aiRateLimiter,
  checkRecruiterAiLimit('aiJdGenerator'),
  recruiterAIJobDescriptionValidation,
  validateRequest,
  generateAIJobDescription
);

router.get('/public-search', optionalAuth, searchProviders);
router.get('/search', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, searchProviders);
router.get('/view-provider/:id', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, viewProvider);
router.get('/view-cv/:id', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, viewCv);
router.post('/unlock/:providerId', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, checkUnlockLimit, unlockContact);
router.get('/unlock-status/:providerId', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, checkUnlockStatus);
router.post('/jobs', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, checkPostLimit, postJob);
router.get('/jobs', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getRecruiterJobs);
router.get('/jobs/:id', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getJobById);
router.get('/job-postings', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getJobPostings);
router.post('/job-postings', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, checkPostLimit, postJob);
router.post('/parse-search-query', recruiterAiGate, protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, checkRecruiterAiLimit('aiJdParsing'), parseSearchQuery);
router.get('/ai-search', recruiterMatchingGate, protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, aiSearchCandidates);
router.post('/job-postings/:jobId/candidates', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, addCandidateToJob);
router.get('/job-postings/:jobId/candidates', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getJobCandidates);
router.post('/candidates/:candidateId/view-contact', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, viewCandidateContact);
router.get('/plan-summary', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getRecruiterPlanSummary);
router.get('/plans', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getPlans);
router.post('/plans/purchase', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, purchasePlan);
router.post('/review/:providerId', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, addReviewLegacy);
router.get('/history', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getMyHistory);
router.patch('/jobs/:id', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, updateJob);
router.delete('/jobs/:id', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, deleteJob);
router.delete('/job-postings/:id', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, deleteJob);

router.patch('/applications/:id', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, updateApplicationStatus);
router.delete('/applications/:id', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, deleteApplication);
router.post('/profile/photo', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, upload.single('profilePhoto'), uploadProfilePhoto);
router.delete('/profile/photo', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, deleteProfilePhoto);

// Saved candidates
router.get('/saved-candidates', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getSavedCandidates);
router.post('/saved-candidates', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, addSavedCandidate);
router.delete('/saved-candidates/:providerProfileId', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, removeSavedCandidate);

// Recruiter job interaction & profile unlock routes
router.get('/jobs/:jobId/applications', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getRecruiterJobApplications);
router.get('/applications/:applicationId', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getRecruiterApplicationDetails);
router.post('/provider/:providerId/unlock', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, unlockProviderProfile);
router.get('/provider/:providerId/profile', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getRecruiterProviderProfile);
router.patch('/applications/:applicationId/status', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, patchApplicationStatus);

const { getRecruiterJobMatches } = require('../controllers/matchmakingController');
router.get('/jobs/:jobId/matches', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getRecruiterJobMatches);

// ─── Secure Candidate View / Paywall Routes ───────────────────────────────────
const {
  getCandidateView,
  requestUnlock,
  verifyUnlockOtp,
  getCandidateFull,
} = require('../controllers/candidateViewController');
const { getRecruiterReputation } = require('../controllers/recruiterController');
const { unlockLimiter } = require('../middleware/otpRateLimit');

// Public candidate view — returns locked or unlocked data based on access
router.get('/candidates/:providerId/view', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getCandidateView);
// Initiate unlock — checks plan, sends OTP
router.post('/candidates/:providerId/request-unlock', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, unlockLimiter, requestUnlock);
// Verify OTP and create unlock record
router.post('/candidates/:providerId/verify-unlock-otp', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, unlockLimiter, verifyUnlockOtp);
// Fetch full candidate data — requires valid unlock record
router.get('/candidates/:providerId/full', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getCandidateFull);

// AI Interview Kit
router.post('/candidates/:id/interview-kit', recruiterAiGate, protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, checkRecruiterAiLimit('interviewKits'), recruiterCopilotController.generateCandidateInterviewKit);

// AI Decision Engine: Recruiter Reputation
router.get('/:id/reputation', protect, getRecruiterReputation);

// Custom Plan Request
router.get('/custom-plan-request', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getMyCustomPlanRequests);
router.post('/custom-plan-request', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, createCustomPlanRequest);
router.delete('/custom-plan-request/:id', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, cancelCustomPlanRequest);

// Tasks
router.get('/tasks', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getTasks);
router.post('/tasks', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, createTask);
router.put('/tasks/:id', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, updateTask);
router.delete('/tasks/:id', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, deleteTask);

// AI Workspace Routes
router.get('/ai/usage', protect, authorizeRoleFromActive('recruiter'), getAiUsage);
router.get('/ai/workspace/conversations', recruiterChatGate, protect, authorizeRoleFromActive('recruiter'), recruiterAiWorkspaceController.getConversations);
router.get('/ai/workspace/conversations/:id', recruiterChatGate, protect, authorizeRoleFromActive('recruiter'), recruiterAiWorkspaceController.getConversation);
router.post('/ai/workspace/chat', recruiterChatGate, protect, authorizeRoleFromActive('recruiter'), checkRecruiterAiLimit('aiCopilot'), recruiterAiWorkspaceController.chat);

// Outreach Campaigns
router.get('/outreach/campaigns', outreachGate, protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getOutreachCampaigns);
router.get('/outreach/campaigns/:jobId/preview', outreachGate, protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getOutreachPreview);
router.post('/outreach/campaigns/:jobId/run', outreachGate, protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, runOutreachCampaign);

// AI Talent Pool
router.get('/talent-pool/jobs', recruiterMatchingGate, protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getTalentPoolJobs);
router.post('/talent-pool/jobs/:jobId/evaluate', recruiterAiGate, protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, runAIEvaluation);

// Shortlisted candidates
router.get('/shortlisted-candidates', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, getShortlistedCandidates);
router.post('/shortlisted-candidates', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, addShortlistedCandidate);
router.delete('/shortlisted-candidates/:providerProfileId', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, removeShortlistedCandidate);

// Notes & Tags for candidates
router.post('/candidates/:providerId/notes', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, addCandidateNote);
router.post('/candidates/:providerId/tags', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, addCandidateTag);
router.put('/candidates/:providerId/reject', protect, authorizeRoleFromActive('recruiter'), ensureRecruiterApproved, rejectCandidate);

module.exports = router;

