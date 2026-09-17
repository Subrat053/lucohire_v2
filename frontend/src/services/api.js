import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api";
const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_BASE_URL ||
  import.meta.env.VITE_AUTH_URL ||
  "/api/v1";

// ── Session expiry guard ──────────────────────────────────────────────────────
// Prevents multiple concurrent 401 responses from each firing a separate redirect.
// Reset after 2 s so the flag doesn't get stuck if the user dismisses the page
// manually and comes back.
let _sessionExpiredFired = false;
const dispatchSessionExpired = () => {
  if (_sessionExpiredFired) return;
  _sessionExpiredFired = true;
  window.dispatchEvent(
    new CustomEvent("auth:invalid-token", {
      detail: { message: "Your session has expired. Please login again." },
    }),
  );
  setTimeout(() => {
    _sessionExpiredFired = false;
  }, 2000);
};
const ADMIN_BASE_URL =
  import.meta.env.VITE_ADMIN_API_BASE_URL ||
  import.meta.env.VITE_ADMIN_API_URL ||
  "/api/v1";

const getStoredAuthToken = () => {
  const existing = localStorage.getItem("authToken");
  if (existing) return existing;

  const legacyToken =
    localStorage.getItem("token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("userToken") ||
    localStorage.getItem("providerToken") ||
    localStorage.getItem("recruiterToken") ||
    localStorage.getItem("managerToken");

  if (legacyToken) {
    localStorage.setItem("authToken", legacyToken);
    return legacyToken;
  }

  return null;
};

const shouldSkipAuthInvalidation = (url = "") => {
  const safeUrl = String(url);
  return (
    safeUrl.includes("/auth/login") ||
    safeUrl.includes("/auth/login-email") ||
    safeUrl.includes("/auth/register") ||
    safeUrl.includes("/auth/register-email") ||
    safeUrl.includes("/auth/verify") ||
    safeUrl.includes("/admin/login")
  );
};

// Base API for existing app routes (/api)
const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

// Auth-only API for v1 endpoints (/api/v1)
const AUTH_API = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

// Admin API uses v1 routes
const ADMIN_API = axios.create({
  baseURL: ADMIN_BASE_URL,
  timeout: 90000,
  withCredentials: true,
});

export { API, AUTH_API, ADMIN_API };

API.interceptors.request.use(
  (config) => {
    const token = getStoredAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

AUTH_API.interceptors.request.use(
  (config) => {
    const token = getStoredAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

ADMIN_API.interceptors.request.use(
  (config) => {
    const token = getStoredAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    if (status === 401 && !shouldSkipAuthInvalidation(url)) {
      dispatchSessionExpired();
    }
    return Promise.reject(error);
  },
);

AUTH_API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    if (status === 401 && !shouldSkipAuthInvalidation(url)) {
      dispatchSessionExpired();
    }
    return Promise.reject(error);
  },
);

ADMIN_API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    if (status === 401 && !shouldSkipAuthInvalidation(url)) {
      dispatchSessionExpired();
    }
    return Promise.reject(error);
  },
);

// Auth APIs
export const authAPI = {
  login: (data) => AUTH_API.post("/auth/login", data),
  sendRegistrationOtp: (data) => API.post("/auth/register/send-otp", data),
  verifyRegistrationOtp: (data) => API.post("/auth/register/verify-otp", data),
  registerFreelancer: (data) => API.post("/auth/register/freelancer", data),
  registerEmail: (data) => AUTH_API.post("/auth/register-email", data),
  sendRegistrationEmailOtp: (data) => API.post("/auth/register/send-otp", data),
  verifyEmailOtp: (data) => AUTH_API.post("/auth/verify-email-otp", data),
  loginEmail: (data) => AUTH_API.post("/auth/login-email", data),
  googleLogin: (data) => AUTH_API.post("/auth/google-login", data),
  phoneLogin: (data) => AUTH_API.post("/auth/phone-login", data),
  logFirebaseOtpAttempt: (data) => AUTH_API.post("/auth/log-firebase-otp", data),
  getMe: () => AUTH_API.get("/auth/me"),
  switchRole: (data) => API.post("/auth/switch-role", data),
  switchPanel: (data) => API.patch("/auth/switch-panel", data),
  sendEmailVerification: () => API.post("/auth/verify-email/send"),
  confirmEmailVerification: (data) =>
    API.post("/auth/verify-email/confirm", data),
  updateWhatsappNumber: (data) => API.put("/auth/whatsapp-number", data),
  updateLocale: (data) => API.put("/auth/locale", data),
  toggleWhatsappAlerts: (data) => API.put("/auth/whatsapp-alerts", data),
  changePassword: (data) => API.patch("/auth/change-password", data),
  forgotPassword: (data) => API.post("/auth/forgot-password", data),
  resetPassword: (token, data) =>
    API.post(`/auth/reset-password/${token}`, data),
  requestMagicLink: (data) => API.post("/auth/magic-link/request", data),
  verifyMagicLink: (data) => API.post("/auth/magic-link/verify", data),
  sendOtp: (data) => API.post("/otp/send", data),
  verifyOtp: (data) => API.post("/otp/verify", data),
  updateEmail: (data) => API.put("/auth/update-email", data),
  updateTimezone: (timezone) => API.post("/auth/update-timezone", { timezone }),
};

export const userAPI = {
  updateLanguage: (data) => API.put("/user/language", data),
  eraseAccount: () => API.delete("/user/profile/erase"),
};

// Provider APIs
export const providerAPI = {
  getProfile: () => API.get("/provider/profile"),
  scrapeMatches: () => API.get("/provider/scrape-matches", { timeout: 60000 }),
  updateProfile: (data) => API.put("/provider/profile", data),
  sendPhoneChangeOtp: () => API.post("/provider/profile/send-phone-change-otp"),
  getNearbyJobs: (params) => API.get("/jobs/nearby", { params }),
  getWageEstimate: (data) => API.post("/wage-estimator", data),
  aiSuggestProfile: (data) => API.post("/provider/profile/ai-suggest", data),
  buildAIProfile: (data) => API.post("/provider/ai/build-profile", data),
  extractProfileData: (data) => API.post("/provider/ai/extract-profile", data), // Module 1 UI
  providerBuilderSuggestion: (data) =>
    API.post("/ai/provider-builder-suggestion", data),
  getPricingSuggestion: (params) =>
    API.get("/provider/ai/pricing-suggestion", { params }),
  getDashboard: () => API.get("/provider/dashboard"),
  getMatches: () => API.get("/provider/matches"), // Module 2 UI
  requestRefund: (data) => API.post("/refunds/request", data),
  getMyRefunds: () => API.get("/refunds/my"),
  getPlans: () => API.get("/provider/plans"),
  getCurrentSubscription: () => API.get("/provider/subscription/current"),
  purchasePlan: (data) => API.post("/provider/plans/purchase", data),
  checkoutWhatsappPlan: () => API.post("/provider/plan/whatsapp-checkout"),
  getLeads: () => API.get("/provider/leads"),
  updateLead: (id, data) => API.put(`/provider/leads/${id}`, data),
  getPublicProfile: (id) => API.get(`/provider/public/${id}`),
  uploadProfilePhoto: (formData) =>
    API.post("/provider/profile/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteProfilePhoto: () => API.delete("/provider/profile/photo"),
  uploadResume: (formData) =>
    API.post("/provider/profile/resume", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteResume: () => API.delete("/provider/profile/resume"),
  uploadDocument: (formData) =>
    API.post("/provider/profile/document", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getHistory: () => API.get("/provider/history"),
  getJobs: (params) => API.get("/provider/jobs", { params }),
  getJobAiInsights: (jobsData) =>
    API.post("/provider/jobs/ai-insights", { jobsData }),
  getJobById: (jobId) => API.get(`/provider/jobs/${jobId}`),
  applyToJob: (jobId, data) => API.post(`/provider/jobs/${jobId}/apply`, data),
  withdrawApplication: (jobId) => API.delete(`/provider/jobs/${jobId}/apply`),
  getApplications: () => API.get("/provider/applications"),
  getSkillGapReport: () => API.post("/candidate/skill-gap-report"),
  getBenchmark: (id) => API.get(`/provider/benchmark/${id}`),
  getRecommendations: () => API.get("/candidate-matching/recommendations"),
  getSavedJobs: () => API.get("/provider/saved-jobs"),
  toggleSaveJob: (jobId, isExternal) =>
    API.post(`/provider/jobs/${jobId}/save`, { isExternal }),
  trackApplyClick: (jobId) =>
    API.post(`/candidate-matching/${jobId}/apply-click`),
  getTopTalent: (params) => API.get("/provider/top-talent", { params }),
  respondToFollowBack: (data) => API.post("/provider/profile/follow-back/respond", data),
  resubmitProfile: () => API.post("/provider/profile/resubmit"),
  getMyPayments: () => API.get("/payments/my-payments"),
};

// Recruiter APIs
export const recruiterAPI = {
  getReportsOverview: () => API.get("/recruiter/reports/overview-metrics"),
  getHiringFunnel: () => API.get("/recruiter/reports/funnel"),
  getJobPerformance: () => API.get("/recruiter/reports/job-performance"),
  getSourceAnalytics: () => API.get("/recruiter/reports/source-analytics"),
  getOutreachAnalytics: () => API.get("/recruiter/reports/outreach-analytics"),
  getAiInsights: () => API.get("/recruiter/reports/ai-insights"),
  getCustomExportsData: () => API.get("/recruiter/reports/custom-exports"),
  getAiUsage: () => API.get("/recruiter/ai/usage"),
  getDashboardInsights: () => API.post("/recruiter/ai/dashboard-insights"),
  getDashboard: () => API.get("/recruiter/dashboard"),
  getJobPostings: () => API.get("/recruiter/jobs"),
  getJobs: () => API.get("/recruiter/jobs"),
  updateProfile: (data) => API.put("/recruiter/profile", data),
  generateJobDescription: (data) =>
    API.post("/recruiter/ai/job-description", data),
  generateJD: (data) => API.post("/recruiter/ai/generate-jd", data),
  workspaceChat: (data) => API.post("/recruiter/ai/workspace/chat", data),
  getWorkspaceConversations: () =>
    API.get("/recruiter/ai/workspace/conversations"),
  getWorkspaceConversation: (id) =>
    API.get(`/recruiter/ai/workspace/conversations/${id}`),
  generateCandidateInterviewKit: (id, options = {}) =>
    API.post(`/recruiter/candidates/${id}/interview-kit`, options),
  publicSearch: (params) => API.get("/recruiter/public-search", { params }),
  search: (params) => API.get("/recruiter/search", { params }),
  viewProvider: (id) => API.get(`/recruiter/view-provider/${id}`),
  viewCv: (id) => API.get(`/recruiter/view-cv/${id}`),
  addCandidateNote: (id, data) =>
    API.post(`/recruiter/candidates/${id}/notes`, data),
  addCandidateTag: (id, data) =>
    API.post(`/recruiter/candidates/${id}/tags`, data),
  rejectCandidate: (id) => API.put(`/recruiter/candidates/${id}/reject`),
  unlockContact: (providerId) => API.post(`/recruiter/unlock/${providerId}`),
  checkUnlockStatus: (providerId) =>
    API.get(`/recruiter/unlock-status/${providerId}`),
  createCustomPlanRequest: (data) =>
    API.post("/recruiter/custom-plan-request", data),
  getMyCustomPlanRequests: () => API.get("/recruiter/custom-plan-request"),
  cancelCustomPlanRequest: (id) => API.delete(`/recruiter/custom-plan-request/${id}`),
  getTasks: () => API.get("/recruiter/tasks"),
  createTask: (data) => API.post("/recruiter/tasks", data),
  updateTask: (id, data) => API.put(`/recruiter/tasks/${id}`, data),
  deleteTask: (id) => API.delete(`/recruiter/tasks/${id}`),
  getOutreachCampaigns: () => API.get("/recruiter/outreach/campaigns"),
  getOutreachPreview: (jobId) =>
    API.get(`/recruiter/outreach/campaigns/${jobId}/preview`),
  runOutreachCampaign: (jobId, data) =>
    API.post(`/recruiter/outreach/campaigns/${jobId}/run`, data),
  getTalentPoolJobs: () => API.get("/recruiter/talent-pool/jobs"),
  runAIEvaluation: (jobId) =>
    API.post(`/recruiter/talent-pool/jobs/${jobId}/evaluate`),
  postJob: (data) => API.post("/recruiter/jobs", data),
  getJobs: () => API.get("/recruiter/jobs"),
  getJobById: (id) => API.get(`/recruiter/jobs/${id}`),
  getJobApplications: (jobId) =>
    API.get(`/recruiter/jobs/${jobId}/applications`),
  getMatches: (jobId) => API.get(`/recruiter/jobs/${jobId}/matches`), // Module 2 UI
  updateApplicationStatus: (applicationId, data) =>
    API.patch(`/recruiter/applications/${applicationId}/status`, data),
  getPlans: () => API.get("/recruiter/plans"),
  purchasePlan: (data) => API.post("/recruiter/plans/purchase", data),
  addReview: (providerId, data) =>
    API.post(`/recruiter/review/${providerId}`, data),
  uploadProfilePhoto: (formData) =>
    API.post("/recruiter/profile/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteProfilePhoto: () => API.delete("/recruiter/profile/photo"),
  getHistory: () => API.get("/recruiter/history"),

  // =================================================================
  getJobPostings: () => API.get("/recruiter/job-postings"),

  createJobPosting: (data) => API.post("/recruiter/job-postings", data),

  aiSearchCandidates: (params) => API.get("/recruiter/ai-search", { params }),

  parseSearchQuery: (query) =>
    API.post("/recruiter/parse-search-query", { query }),

  addCandidateToJob: (jobId, candidateId) =>
    API.post(`/recruiter/job-postings/${jobId}/candidates`, { candidateId }),

  getRecruiterPlans: () => API.get("/recruiter/plans"),

  getRecruiterPlanSummary: () => API.get("/recruiter/plan-summary"),

  purchaseRecruiterPlan: (planId) =>
    API.post("/recruiter/plans/purchase", { planId }),
  updateJob: (id, data) => API.patch(`/recruiter/jobs/${id}`, data),
  deleteJob: (id) => API.delete(`/recruiter/jobs/${id}`),
  updateApplicationStatus: (id, data) =>
    API.patch(`/recruiter/applications/${id}`, data),
  deleteApplication: (id) => API.delete(`/recruiter/applications/${id}`),
  // Saved candidates
  getSavedCandidates: () => API.get("/recruiter/saved-candidates"),
  saveCandidate: (data) => API.post("/recruiter/saved-candidates", data),
  removeSavedCandidate: (providerProfileId) =>
    API.delete(`/recruiter/saved-candidates/${providerProfileId}`),
  // Shortlisted candidates
  getShortlistedCandidates: () => API.get("/recruiter/shortlisted-candidates"),
  shortlistCandidate: (data) =>
    API.post("/recruiter/shortlisted-candidates", data),
  removeShortlistedCandidate: (providerProfileId) =>
    API.delete(`/recruiter/shortlisted-candidates/${providerProfileId}`),
  unlockProvider: (providerId, data) =>
    API.post(`/recruiter/provider/${providerId}/unlock`, data),
  getProviderProfile: (providerId) =>
    API.get(`/recruiter/provider/${providerId}/profile`),
  getApplicationDetails: (applicationId) =>
    API.get(`/recruiter/applications/${applicationId}`),
  getSignedResumeUrl: (candidateId) =>
    API.post(`/candidates/${candidateId}/resume-url`),
  getSkillGap: (data) => API.post("/recruiter/ai/skill-gap", data),
  getProfileRating: (providerId) =>
    API.post("/recruiter/ai/profile-rating", { providerId }),
  // ==================================================================
};

// Skills / Categories APIs (public - no auth needed)
export const categoriesAPI = {
  getCategories: () => API.get("/skills"),
};

// Admin APIs
export const adminAPI = {
  login: (data) => ADMIN_API.post("/admin/login", data),
  getMe: () => ADMIN_API.get("/admin/me"),
  getSeoHealthDashboard: () => ADMIN_API.get("/admin/seo-command-dashboard"),
  updateSeoIntegration: (id, data) => ADMIN_API.post(`/admin/seo-command-dashboard/integrations/${id}`, data),
  getHealthMetrics: (params) => ADMIN_API.get("/admin/health/metrics", { params }),
  updateFeatureStatus: (featureKey, status) => ADMIN_API.put(`/admin/health/features/${featureKey}/status`, { status }),
  restartFeature: (featureKey) => ADMIN_API.post(`/admin/health/features/${featureKey}/restart`),
  updateGlobalFeatureStatus: (audience, status) => ADMIN_API.put('/admin/health/features/global-status', { audience, status }),
  getDashboardStats: (params) =>
    ADMIN_API.get("/admin/partners/dashboard/stats", { params }),
  getCustomPlanRequests: () => ADMIN_API.get("/admin/custom-plans"),
  clearAllCustomPlanRequests: () => ADMIN_API.delete("/admin/custom-plans"),
  updateCustomPlanRequestStatus: (id, status) =>
    ADMIN_API.patch(`/admin/custom-plans/${id}/status`, { status }),
  generateCustomPlanOffer: (id, data) =>
    ADMIN_API.post(`/admin/custom-plans/${id}/offer`, data),
  getCustomPlanPricingSettings: () =>
    ADMIN_API.get("/admin/custom-plans/pricing-settings"),
  updateCustomPlanPricingSettings: (pricing) =>
    ADMIN_API.put("/admin/custom-plans/pricing-settings", { pricing }),
  getUsers: (params) => ADMIN_API.get("/admin/users", { params }),
  uploadProviders: (formData) =>
    ADMIN_API.post("/admin/providers/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getImportBatches: () => ADMIN_API.get("/admin/imports"),
  getImportBatchStatus: (id) => ADMIN_API.get(`/admin/imports/${id}`),
  updateImportBatchAction: (id, action) => ADMIN_API.put(`/admin/imports/${id}/action`, { action }),
  uploadRecruiters: (formData) =>
    ADMIN_API.post("/admin/recruiters/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getMappedCompanies: (page = 1, limit = 10) =>
    ADMIN_API.get(`/admin/crawlers/mapped-companies?page=${page}&limit=${limit}`),
  getUserDetail: (id) => ADMIN_API.get(`/admin/users/${id}`),
  getManagers: () => ADMIN_API.get("/admin/managers"),
  createManager: (data) => ADMIN_API.post("/admin/managers", data),
  deleteManager: (id) => ADMIN_API.delete(`/admin/managers/${id}`),
  getPartners: () => ADMIN_API.get("/admin/partners"),
  createPartner: (data) => ADMIN_API.post("/admin/partners", data),
  getPartnerDetails: (id) => ADMIN_API.get(`/admin/partners/${id}`),
  updatePartner: (id, data) => ADMIN_API.patch(`/admin/partners/${id}`, data),
  updatePartnerStatus: (id, data) =>
    ADMIN_API.patch(`/admin/partners/${id}/status`, data),
  updatePartnerCommissionRate: (id, data) =>
    ADMIN_API.patch(`/admin/partners/${id}/commission-rate`, data),
  getPartnerRewardSettings: () =>
    ADMIN_API.get("/admin/partners/settings/rewards"),
  updatePartnerRewardSettings: (data) =>
    ADMIN_API.put("/admin/partners/settings/rewards", data),
  getPartnerReferrals: (id, params) =>
    ADMIN_API.get(`/admin/partners/${id}/referrals`, { params }),
  getReferralWithdrawals: (params) =>
    ADMIN_API.get("/admin/referral-withdrawals", { params }),
  updateReferralWithdrawalStatus: (id, data) =>
    ADMIN_API.put(`/admin/referral-withdrawals/${id}/status`, data),
  deletePartner: (id) => ADMIN_API.delete(`/admin/partners/${id}`),
  getApprovalLogs: (params) =>
    ADMIN_API.get("/admin/approval-logs", { params }),
  getContactLogs: (page = 1, limit = 20) => 
    ADMIN_API.get("/admin/contact-logs", { params: { page, limit } }),
  approveUser: (userId) => ADMIN_API.patch(`/admin/users/${userId}/approve`),
  rejectUser: (userId, reason = "") =>
    ADMIN_API.patch(`/admin/users/${userId}/reject`, { reason }),
  toggleBlockUser: (id) => ADMIN_API.put(`/admin/users/${id}/block`),
  deleteUser: (id) => ADMIN_API.delete(`/admin/users/${id}`),
  // approveProvider: (id, data) => ADMIN_API.put(`/admin/providers/${id}/approve`, data),
  deleteProvider: (id) => ADMIN_API.delete(`/admin/providers/${id}`),
  getProviders: (params) => ADMIN_API.get("/admin/providers", { params }),
  // approveRecruiter: (id, data) => ADMIN_API.put(`/admin/recruiters/${id}/approve`, data),
  deleteRecruiter: (id) => ADMIN_API.delete(`/admin/recruiters/${id}`),
  getRecruiters: (params) => ADMIN_API.get("/admin/recruiters", { params }),
  getPlans: () => ADMIN_API.get("/admin/plans"),
  createPlan: (data) => ADMIN_API.post("/admin/plans", data),
  updatePlan: (id, data) => ADMIN_API.put(`/admin/plans/${id}`, data),
  deletePlan: (id) => ADMIN_API.delete(`/admin/plans/${id}`),
  getSettings: () => ADMIN_API.get("/admin/settings"),
  updateSettings: (data) => ADMIN_API.put("/admin/settings", data),
  getRotationPools: () => ADMIN_API.get("/admin/rotation-pools"),
  createRotationPool: (data) => ADMIN_API.post("/admin/rotation-pools", data),
  updateRotationPool: (id, data) =>
    ADMIN_API.put(`/admin/rotation-pools/${id}`, data),
  startRotationPool: (id) => ADMIN_API.post(`/admin/rotation-pools/${id}/start`),
  pauseRotationPool: (id) => ADMIN_API.post(`/admin/rotation-pools/${id}/pause`),
  stopRotationPool: (id) => ADMIN_API.post(`/admin/rotation-pools/${id}/stop`),
  advanceRotationPool: (id) => ADMIN_API.post(`/admin/rotation-pools/${id}/advance`),
  deleteRotationPool: (id) => ADMIN_API.delete(`/admin/rotation-pools/${id}`),
  getPayments: (params) => ADMIN_API.get("/admin/payments", { params }),
  getProviderSubscriptions: (params) =>
    ADMIN_API.get("/admin/provider-subscriptions", { params }),
  updateProviderSubscriptionStatus: (id, data) =>
    ADMIN_API.patch(`/admin/provider-subscriptions/${id}/status`, data),
  getUserSubscriptions: (params) =>
    ADMIN_API.get("/admin/user-subscriptions", { params }),
  getUserSubscriptionAnalytics: (params) =>
    ADMIN_API.get("/admin/user-subscriptions/analytics", { params }),
  sendUserSubscriptionReminder: (data) =>
    ADMIN_API.post("/admin/user-subscriptions/send-reminder", data),
  bulkUserSubscriptionAction: (data) =>
    ADMIN_API.post("/admin/user-subscriptions/bulk-action", data),
  updateUserSubscriptionStatus: (id, data) =>
    ADMIN_API.patch(`/admin/user-subscriptions/${id}/status`, data),
  getJobs: () => ADMIN_API.get("/admin/jobs"),
  uploadProfilePhoto: (formData) =>
    ADMIN_API.post("/admin/profile/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getProfilePhoto: () => ADMIN_API.get("/admin/profile/photo"),
  getProfilePhotoApprovals: (params) =>
    ADMIN_API.get("/admin/profile-approvals", { params }),
  getPortfolioApprovals: (params) =>
    ADMIN_API.get("/admin/portfolio-approvals", { params }),
  approvePortfolioLink: (profileId, linkId) =>
    ADMIN_API.patch(
      `/admin/portfolio-approvals/${profileId}/${linkId}/approve`,
    ),
  rejectPortfolioLink: (profileId, linkId, reason) =>
    ADMIN_API.patch(
      `/admin/portfolio-approvals/${profileId}/${linkId}/reject`,
      { reason },
    ),

  getProfileApprovalStats: () =>
    ADMIN_API.get("/admin/profile-approvals/stats"),

  approveProfilePhoto: (userId, role) =>
    ADMIN_API.patch(`/admin/profile-approvals/${role}/${userId}/approve`),

  rejectProfilePhoto: (userId, role, reason = "") =>
    ADMIN_API.patch(`/admin/profile-approvals/${role}/${userId}/reject`, {
      reason,
    }),

  getResumeApprovalStats: () => ADMIN_API.get("/admin/resume-approvals/stats"),

  getResumeApprovals: (params) =>
    ADMIN_API.get("/admin/resume-approvals", { params }),

  approveResume: (userId) =>
    ADMIN_API.patch(`/admin/resume-approvals/${userId}/approve`),

  rejectResume: (userId, reason = "") =>
    ADMIN_API.patch(`/admin/resume-approvals/${userId}/reject`, { reason }),

  // ── Profile Review System (complete overhaul) ──────────────────────────
  getProfileReviews: (params) =>
    ADMIN_API.get("/admin/profile-reviews", { params }),
  getProfileReviewStats: () => ADMIN_API.get("/admin/profile-reviews/stats"),
  getDistinctLocations: (params) =>
    ADMIN_API.get("/admin/profile-reviews/distinct-locations", { params }),
  getProfileReviewDetail: (userId) =>
    ADMIN_API.get(`/admin/profile-reviews/${userId}`),
  approveProfileSection: (userId, sectionKey) =>
    ADMIN_API.patch(
      `/admin/profile-reviews/${userId}/sections/${sectionKey}/approve`,
    ),
  rejectProfileSection: (userId, sectionKey, reason = "") =>
    ADMIN_API.patch(
      `/admin/profile-reviews/${userId}/sections/${sectionKey}/reject`,
      { reason },
    ),
  addSectionRemark: (userId, sectionKey, remark) =>
    ADMIN_API.post(
      `/admin/profile-reviews/${userId}/sections/${sectionKey}/remark`,
      { remark },
    ),
  sendProfileCorrectionEmail: (userId, data) =>
    ADMIN_API.post(`/admin/profile-reviews/${userId}/notify`, data),
  requestFollowBack: (userId, data) =>
    ADMIN_API.post(`/admin/profile-reviews/${userId}/follow-back`, data),
  bulkProfileAction: (data) =>
    ADMIN_API.post("/admin/profile-reviews/bulk", data),

  // Registry Companies (Type 3)
  getRegistryCompanies: (params) =>
    ADMIN_API.get("/admin/registry-companies", { params }),
  syncRegistryCompany: (id) =>
    ADMIN_API.post(`/admin/registry-companies/${id}/sync`),

  // Crawlers
  getCrawlerSettings: () => ADMIN_API.get("/admin/crawlers/settings"),
  updateCrawlerSettings: (data) =>
    ADMIN_API.put("/admin/crawlers/settings", data),
  bulkUploadCrawlers: (data) =>
    ADMIN_API.post("/admin/crawlers/bulk-upload", data),
  getMappedCompanies: (params) =>
    ADMIN_API.get("/admin/crawlers/mapped-companies", { params }),
  exportCrawlerCompaniesCsv: () =>
    ADMIN_API.get("/admin/crawlers/mapped-companies/csv", {
      responseType: "blob",
    }),

  getContent: (type) => ADMIN_API.get(`/admin/content/${type}`),
  updateContent: (type, value) =>
    ADMIN_API.put(`/admin/content/${type}`, { value }),
  getPaymentSettings: () => ADMIN_API.get("/admin/payment-settings"),
  updatePaymentSettings: (data) =>
    ADMIN_API.put("/admin/payment-settings", data),
  getCurrencySettings: () => ADMIN_API.get("/admin/currency-settings"),
  updateCurrencySettings: (data) =>
    ADMIN_API.put("/admin/currency-settings", data),
  getCloudinarySettings: () => ADMIN_API.get("/admin/cloudinary-settings"),
  updateCloudinarySettings: (data) =>
    ADMIN_API.put("/admin/cloudinary-settings", data),
  getWhatsappLogs: (params) =>
    ADMIN_API.get("/admin/whatsapp-logs", { params }),
  getOtpLogs: (params) =>
    ADMIN_API.get("/admin/logs/otp", { params }),
  getWhatsappSettings: () => ADMIN_API.get("/admin/whatsapp-settings"),
  updateWhatsappSettings: (data) =>
    ADMIN_API.put("/admin/whatsapp-settings", data),
  getFeatureFlags: () => ADMIN_API.get("/admin/feature-flags"),
  updateFeatureFlag: (key, data) =>
    ADMIN_API.put(`/admin/feature-flags/${encodeURIComponent(key)}`, data),
  // Skill categories (admin CRUD)
  getSkillCategories: () => ADMIN_API.get("/admin/skills"),
  createSkillCategory: (data) => ADMIN_API.post("/admin/skills", data),
  updateSkillCategory: (id, data) => ADMIN_API.put(`/admin/skills/${id}`, data),
  deleteSkillCategory: (id) => ADMIN_API.delete(`/admin/skills/${id}`),
  updateSkillCategoryStatus: (id, data) =>
    ADMIN_API.patch(`/admin/skills/${id}/status`, data),
  addSkillToCategory: (id, data) =>
    ADMIN_API.post(`/admin/skills/${id}/skills`, data),
  removeSkillFromCategory: (id, skillId) =>
    ADMIN_API.delete(`/admin/skills/${id}/skills/${skillId}`),
  getAIMatchWeights: () => API.get("/admin/ai/match-weights"),
  updateAIMatchWeights: (data) => API.put("/admin/ai/match-weights", data),
  getAITrustWeights: () => API.get("/admin/ai/trust-weights"),
  updateAITrustWeights: (data) => API.put("/admin/ai/trust-weights", data),
  getPromptTemplates: () => API.get("/admin/ai/prompt-templates"),
  createPromptTemplate: (data) => API.post("/admin/ai/prompt-templates", data),
  updatePromptTemplate: (id, data) =>
    API.put(`/admin/ai/prompt-templates/${id}`, data),
  getSkillSynonyms: (params) => API.get("/admin/ai/skill-synonyms", { params }),
  createSkillSynonym: (data) => API.post("/admin/ai/skill-synonyms", data),
  updateSkillSynonym: (id, data) =>
    API.put(`/admin/ai/skill-synonyms/${id}`, data),
  deleteSkillSynonym: (id) => API.delete(`/admin/ai/skill-synonyms/${id}`),
  getFraudQueue: () => API.get("/admin/ai/fraud-queue"),
  getOcrReviewQueue: () => API.get("/admin/ai/ocr-review-queue"),
  updateOcrReviewDecision: (id, data) =>
    API.put(`/admin/ai/ocr-review-queue/${id}`, data),
  getAIUsageDashboard: (params) => API.get("/admin/ai/usage-dashboard", { params }),
  getAIUsageLogs: (params) => API.get("/admin/ai/usage-logs", { params }),
  getDemandSnapshots: () => API.get("/admin/ai/demand-snapshots"),
  getAIFeatureSettings: () => API.get("/admin/ai/feature-settings"),
  updateAIFeatureSettings: (data) =>
    API.put("/admin/ai/feature-settings", data),
  getAiAnalysisResults: (params) =>
    API.get("/admin/ai/analysis-results", { params }),
  rerunAiAnalysis: (data) => API.post("/admin/ai/analysis-results/rerun", data),
  // =================================================================

  approveUser: (userId) => API.patch(`/admin/users/${userId}/approve`),

  rejectUser: (userId, reason = "") =>
    API.patch(`/admin/users/${userId}/reject`, { reason }),

  approveProvider: (userId) => API.patch(`/admin/users/${userId}/approve`),

  approveRecruiter: (userId) => API.patch(`/admin/users/${userId}/approve`),
  getAllReferrals: () => ADMIN_API.get("/admin/referrals"),
  getRewards: (params) => ADMIN_API.get("/admin/partners/rewards", { params }),
  updateRewardStatus: (id, data) =>
    ADMIN_API.patch(`/admin/partners/rewards/${id}/status`, data),
  markRewardsPaid: (data) =>
    ADMIN_API.post("/admin/partners/rewards/mark-paid", data),
  getPublicCompanyDetails: () => API.get("/public/company-details"),
  getCountries: () => ADMIN_API.get("/admin/countries"),
  createCountryConfig: (data) => ADMIN_API.post("/admin/countries", data),
  updateCountryConfig: (id, data) =>
    ADMIN_API.put(`/admin/countries/${id}`, data),
  deleteCountryConfig: (id) => ADMIN_API.delete(`/admin/countries/${id}`),
  validateCountryConfig: (id) =>
    ADMIN_API.post(`/admin/countries/${id}/validate`),
  activateCountryConfig: (id) =>
    ADMIN_API.post(`/admin/countries/${id}/activate`),
  deactivateCountryConfig: (id) =>
    ADMIN_API.post(`/admin/countries/${id}/deactivate`),
  startCountrySync: (id) =>
    ADMIN_API.post(`/admin/countries/${id}/start-sync`),
  pauseCountrySync: (id) =>
    ADMIN_API.post(`/admin/countries/${id}/pause-sync`),
  stopCountrySync: (id) =>
    ADMIN_API.post(`/admin/countries/${id}/stop-sync`),

  // External Job Sources
  getJobSources: () => ADMIN_API.get("/admin/job-sources"),
  createJobSource: (data) => ADMIN_API.post("/admin/job-sources", data),
  updateJobSource: (id, data) =>
    ADMIN_API.put(`/admin/job-sources/${id}`, data),
  testJobSource: (id) => ADMIN_API.post(`/admin/job-sources/${id}/test`),
  syncJobSource: (id) => ADMIN_API.post(`/admin/job-sources/${id}/sync`),
  pauseJobSource: (id) => ADMIN_API.post(`/admin/job-sources/${id}/pause`),
  resumeJobSource: (id) => ADMIN_API.post(`/admin/job-sources/${id}/resume`),

  // Company Sources
  getCompanySources: (params) =>
    ADMIN_API.get("/admin/company-sources", { params }),
  createCompanySource: (data) => ADMIN_API.post("/admin/company-sources", data),
  updateCompanySource: (id, data) =>
    ADMIN_API.put(`/admin/company-sources/${id}`, data),
  deleteCompanySource: (id) => ADMIN_API.delete(`/admin/company-sources/${id}`),
  importCompanySources: (data) =>
    ADMIN_API.post("/admin/company-sources/import", data),
  triggerDiscovery: (data) =>
    ADMIN_API.post("/admin/company-sources/discover", data),
  liveTestCrawler: (data) =>
    ADMIN_API.post("/admin/company-sources/live-test", data),

  // External Jobs
  getExternalJobs: (params) =>
    ADMIN_API.get("/external-jobs/admin/list", { params }),
  exportExternalCompaniesCsv: () =>
    ADMIN_API.get("/external-jobs/admin/companies/csv", {
      responseType: "blob",
    }),
  updateExternalJob: (id, data) =>
    ADMIN_API.put(`/external-jobs/admin/${id}`, data),
  deleteExternalJob: (id) => ADMIN_API.delete(`/external-jobs/admin/${id}`),
  refreshExternalJob: (id) =>
    ADMIN_API.post(`/external-jobs/admin/${id}/refresh`),

  // Sync logs & controls
  getSyncReports: (params) => ADMIN_API.get("/admin/sync/reports", { params }),
  getSyncLogSampleJobs: (id) => ADMIN_API.get(`/admin/sync/reports/${id}/sample-jobs`),
  getSyncStatsByCountry: () => ADMIN_API.get("/admin/sync/stats/by-country"),
  getSyncErrors: () => ADMIN_API.get("/admin/sync/errors"),
  retrySyncLog: (id) => ADMIN_API.post(`/admin/sync/errors/${id}/retry`),
  triggerDailySync: () => ADMIN_API.post("/admin/sync/run"),

  // Recruiter Leads
  getRecruiterLeads: (params) =>
    ADMIN_API.get("/admin/recruiter-leads", { params }),
  getManualOutreachLeads: () => ADMIN_API.get("/admin/recruiter-leads/manual"),
  uploadRecruiterLeadsCsv: (formData) =>
    ADMIN_API.post("/admin/recruiter-leads/upload-csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  scrapeManualLeads: (data) =>
    ADMIN_API.post("/admin/recruiter-leads/scrape-manual", data),
  updateRecruiterLead: (id, data) =>
    ADMIN_API.put(`/admin/recruiter-leads/${id}`, data),
  deleteRecruiterLead: (id) => ADMIN_API.delete(`/admin/recruiter-leads/${id}`),

  // Scraper Staging Candidates
  getStagingCandidates: (params) =>
    ADMIN_API.get("/admin/staging-candidates", { params }),
  updateStagingCandidateToggle: (id, type, value) =>
    ADMIN_API.put(`/admin/staging-candidates/${id}/toggle`, { type, value }),

  getAllRefunds: () => API.get("/refunds/admin"),
  processRefund: (id, data) => API.put(`/refunds/admin/${id}`, data),

  // =================================================================
};

export const searchAPI = {
  interpret: (data) => API.post("/search/interpret", data),
  parseIntentAI: (data) => API.post("/search/ai/parse-intent", data),
  providers: (params) => API.get("/search/providers", { params }),
  autoMatch: (data) => API.post("/search/auto-match", data),
  autoMatchPreview: (data) => API.post("/search/auto-match/preview", data),
  repeatRecommendations: (params) =>
    API.get("/search/repeat-recommendations", { params }),
  trustScore: (providerId) => API.get(`/search/trust-score/${providerId}`),
};

export const aiAPI = {
  health: () => API.get("/ai/health"),
  getJobExpiryPrediction: (jobId) =>
    API.get(`/jobs/${jobId}/expiry-prediction`),
  getRecruiterReputation: (recruiterId) =>
    API.get(`/recruiter/${recruiterId}/reputation`),

  profileBuild: (data) => API.post("/ai/profile/build", data),
  profileImprove: (data) => API.post("/ai/profile/improve", data),
  profileBuildFreeText: (data) => API.post("/ai/profile/build-free-text", data),
  profilePricingSuggest: (data) =>
    API.post("/ai/profile/pricing-suggest", data),

  ocrText: (formData) =>
    API.post("/ai/ocr/text", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  ocrDocument: (formData) =>
    API.post("/ai/ocr/document", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  ocrLabels: (formData) =>
    API.post("/ai/ocr/labels", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  createConversation: (data) => API.post("/ai/chat/conversations", data || {}),
  getConversations: (params) => API.get("/ai/chat/conversations", { params }),
  getConversationHistory: (id, params) =>
    API.get(`/ai/chat/conversations/${id}`, { params }),
  getChatHistory: (params) => API.get("/ai/chat/history", { params }),
  sendMessage: (data) => API.post("/ai/chat/send", data),
  regenerateReply: (data) => API.post("/ai/chat/regenerate", data),
  markMessageStatus: (data) => API.patch("/ai/chat/message-status", data),

  createEmbedding: (data) => API.post("/ai/embeddings/create", data),
  vectorSearch: (data) => API.post("/ai/vector/search", data),
};

export const chatAPI = {
  ask: (data) => aiAPI.sendMessage(data),
};

// Jobs APIs (provider browses / applies; recruiter views applications)
export const jobsAPI = {
  getAvailableJobs: (params) => API.get("/jobs", { params }),
  getPublicJobById: (jobId) => API.get(`/jobs/public/${jobId}`),
  applyToJob: (jobId, data) => API.post(`/jobs/${jobId}/apply`, data),
  getMyApplications: () => API.get("/jobs/my-applications"),
  getJobApplications: (jobId) => API.get(`/jobs/${jobId}/applications`),
  updateApplicationStatus: (applicationId, data) =>
    API.put(`/jobs/applications/${applicationId}`, data),
  boostJob: (jobId, days) => API.post(`/jobs/${jobId}/boost`, { days }),
};

// Subscription APIs
export const subscriptionAPI = {
  getMySubscription: () => API.get("/subscriptions/me"),
};

// Plan APIs
export const planAPI = {
  getLandingPlans: () => API.get("/plans/landing"),
  getPlansByAudience: (audience) => API.get("/plans", { params: { audience } }),
};

export const recruiterPlanAPI = {
  getAvailablePlans: () => API.get("/recruiter-plans/available"),
  getMyPlan: () => API.get("/recruiter-plans/my-plan"),
  generateCheckoutSession: (data) => API.post("/recruiter-plans/checkout", data),
  verifyPayment: (data) => API.post("/recruiter-plans/verify", data),
};

// Notification APIs
export const notificationAPI = {
  getMyNotifications: (params) => API.get("/notifications", { params }),
  markAsRead: (id) => API.patch(`/notifications/${id}/read`),
  markAllAsRead: () => API.patch("/notifications/read-all"),
  deleteNotification: (id) => API.delete(`/notifications/${id}`),
};

// Profile APIs
export const profileAPI = {
  getByUserId: (userId, params) => API.get(`/profile/${userId}`, { params }),
  updateMyProfile: (data) => API.patch("/profile", data),
  completeRole: (data) => API.post("/profile/complete-role", data),
};

// Review APIs
export const reviewAPI = {
  create: (data) => API.post("/reviews", data),
  getByUserId: (userId) => API.get(`/reviews/${userId}`),
  canReview: (revieweeId, leadId) =>
    API.get(`/reviews/can-review/${revieweeId}`, { params: { leadId } }),
  update: (id, data) => API.patch(`/reviews/${id}`, data),
  delete: (id) => API.delete(`/reviews/${id}`),
};

// Payment APIs
export const paymentAPI = {
  getConfig: () => API.get("/payments/config"),
  createOrder: (data) => API.post("/payments/create-order", data),
  createSubscription: (data) => API.post("/payments/create-subscription", data),
  verifyPayment: (data) => API.post("/payments/verify", data), // body: { sessionId }
  verifySubscription: (data) => API.post("/payments/verify-subscription", data),
  paymentFailed: (data) => API.post("/payments/failed", data), // body: { sessionId, errorMessage }
  getMyPayments: () => API.get("/payments/my-payments"),
  getPaymentById: (id) => API.get(`/payments/${id}`),
  calculateBreakdown: (data) => API.post("/payments/calculate-breakdown", data),
};

export const walletAPI = {
  getSummary: () => API.get("/wallet/summary"),
  getTransactions: () => API.get("/wallet/transactions"),
};

// Locale APIs
export const localeAPI = {
  detect: () => API.get("/locale/detect"),
  getCurrencies: () => API.get("/locale/currencies"),
  reverseGeocode: (lat, lng) =>
    API.get("/locale/reverse-geocode", { params: { lat, lng } }),
};

export const translationAPI = {
  translateText: (data) => API.post("/translate/text", data),
  translateBatch: (data) => API.post("/translate/batch", data),
};

export const locationAPI = {
  autocomplete: (query) => API.post("/location/autocomplete", { query }),
  nearby: (lat, lon) => API.post("/location/nearby", { lat, lon }),
  searchPlaces: (query, options = {}) =>
    API.get("/location/search", { params: { query, ...options } }),
  getPlaceDetails: (placeId) => API.get(`/location/details/${placeId}`),
};

export const enquiryAPI = {
  create: (data) => API.post("/enquiry", data),
  getAll: () => API.get("/enquiry"),
};

export const profileShareAPI = {
  generateToken: (candidateId, data) =>
    API.post(`/profile-share/${candidateId}`, data),
  getSharedProfile: (token) => API.get(`/profile-share/view/${token}`),
};

export const referralAPI = {
  getMyStats: () => API.get("/referrals/my-stats"),
  updatePaymentMethods: (data) => API.post("/referrals/payment-methods", data),
  requestWithdrawal: (data) => API.post("/referrals/withdraw", data),
  createUserReferral: (data) => API.post("/referrals/invite", data),
};

export const providerWalletAPI = {
  getWallet: () => API.get("/provider/wallet"),
  sendOtpForPayout: (data) =>
    API.post("/provider/wallet/payout-methods/send-otp", data),
  savePayoutMethod: (data) => API.post("/provider/wallet/payout-methods", data),
  uploadQrCode: (formData) =>
    API.post("/provider/wallet/payout-methods/upload-qr", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  setDefaultPayoutMethod: (id) =>
    API.put(`/provider/wallet/payout-methods/${id}/default`),
  deletePayoutMethod: (id) =>
    API.delete(`/provider/wallet/payout-methods/${id}`),
  requestWithdrawal: (data) => API.post("/provider/wallet/withdraw", data),
  initiatePhoneChange: (data) =>
    API.post("/provider/wallet/phone-change/initiate", data),
  verifyOldPhoneOTP: (data) =>
    API.post("/provider/wallet/phone-change/verify-old", data),
  verifyNewPhoneOTP: (data) =>
    API.post("/provider/wallet/phone-change/verify-new", data),
  raiseConcernLostPhone: (data) =>
    API.post("/provider/wallet/phone-change/raise-concern", data),
};

export const adminWithdrawalAPI = {
  getAll: (params) => API.get("/admin/payout-withdrawals", { params }),
  updateStatus: (id, data) =>
    API.put(`/admin/payout-withdrawals/${id}/status`, data),
  getCommissionSettings: () =>
    API.get("/admin/payout-withdrawals/commission-settings"),
  updateCommissionSettings: (data) =>
    API.put("/admin/payout-withdrawals/commission-settings", data),
  getBillingRuleHistory: () =>
    API.get("/admin/payout-withdrawals/commission-settings/history"),
};

export const supportAPI = {
  createTicket: (data) => AUTH_API.post("/support", data),
  getManagerTickets: () => AUTH_API.get("/support/manager"),
  resolveManagerTicket: (id) => AUTH_API.put(`/support/manager/${id}/resolve`),
  getAdminTickets: () => AUTH_API.get("/support/admin"),
  resolveAdminTicket: (id) => AUTH_API.put(`/support/admin/${id}/resolve`),
};

export const unlockProfileAPI = {
  sendOtp: (data) => AUTH_API.post("/unlock-profile/send-otp", data),
  verifyOtp: (data) => AUTH_API.post("/unlock-profile/verify", data),
  directUnlock: (data) => AUTH_API.post("/unlock-profile/direct-unlock", data),
  updateProfile: (id, data) => AUTH_API.put(`/unlock-profile/user/${id}`, data),
};

export const pipelineAdminAPI = {
  getQueries: () => AUTH_API.get("/pipeline/queries"),
  addQuery: (data) => AUTH_API.post("/pipeline/queries", data),
  triggerManualScan: (data) => AUTH_API.post("/pipeline/manual-scan", data),
  getScans: () => AUTH_API.get("/pipeline/scans"),
  getRawImports: (params) => AUTH_API.get("/pipeline/raw-jobs", { params }),
  getReviewQueue: () => AUTH_API.get("/pipeline/review-queue"),
  approveReviewJob: (id, data) =>
    AUTH_API.post(`/pipeline/review-queue/${id}/approve`, data),
  getCategories: () => AUTH_API.get("/pipeline/categories"),
  getCompanies: () => AUTH_API.get("/pipeline/companies"),
  getLocations: () => AUTH_API.get("/pipeline/locations"),
  // Also we need an endpoint to get the final pipeline jobs
  getPipelineJobs: (params) => AUTH_API.get("/pipeline/jobs", { params }),
  updatePipelineJobStatus: (id, data) => AUTH_API.put(`/pipeline/jobs/${id}/status`, data),
  autoVerifyPipelineJobs: (data) => AUTH_API.post("/pipeline/jobs/auto-verify", data),
};

export default API;
