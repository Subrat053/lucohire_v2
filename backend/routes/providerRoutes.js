const express = require('express');
const router = express.Router();
const {
  getProviderJobs,
  getProviderJobById,
  applyToJobFromProvider,
  getProviderApplications,
  toggleSavedJob,
  getSavedJobs,
  withdrawApplication
} = require('../controllers/jobInteractionController');
const { getJobAiInsights } = require('../controllers/providerJobsAIController');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { findProviderProfileByUserId } = require('../services/providerProfilePersistenceService');
const { checkAiLimit } = require('../middleware/aiUsage');
const {
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
} = require('../controllers/providerController');
const {
  getProviderPlans,
  getMyPlan,
  getCurrentSubscription,
  previewPlan,
  checkoutPlan,
  paymentSuccess,
  getActiveSubscriptionDetail,
  getProviderUsageMetrics,
  calculateCustomPriceController,
  purchaseFixedPlan,
  purchaseCustomPlan,
  confirmPaymentSuccessController,

  toggleAutoRenewController,
} = require('../controllers/providerPlanController');
const {
  respondToFollowBack,
  resubmitProfileForReview,
} = require('../controllers/profileReviewController');
const { protect, authorizeRoleFromActive } = require('../middleware/auth');
const { ensureProviderApproved } = require('../middleware/providerApproval');
const { requireFeatureFlag } = require('../middleware/featureFlag');
const { validateRequest } = require('../middleware/validate');
const { aiRateLimiter } = require('../middleware/aiRateLimit');
const { providerProfileAISuggestValidation } = require('../validators/aiValidators');
const upload = require('../middleware/upload');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

const providerProfileAiGate = requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_PROFILE_ENABLED');
const providerMatchingGate = requireOperationalFlags('ENABLE_PROVIDER_AI_JOBS');

// Optional auth: attach req.user when token is provided.
const optionalAuth = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer')) {
    try {
      const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
      req.user = withLegacyId(await prisma.user.findUnique({
        where: { id: String(decoded.id) },
        select: {
          id: true, roles: true, activeRole: true, role: true, panelAccess: true,
          isBlocked: true, email: true, name: true, phone: true,
          whatsappNumber: true, authProvider: true, approvalStatus: true,
          roleIntent: true, activePanel: true, country: true, currency: true,
          locale: true, preferredLanguage: true, avatar: true, termsAccepted: true,
          profilePhoto: true, profilePhotoApproval: true,
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

router.get('/profile', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getMyProfile);
router.put('/profile', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, updateProfile);
router.post('/profile/send-phone-change-otp', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, sendPhoneChangeOtp);
router.post('/profile/follow-back/respond', protect, respondToFollowBack);
router.post('/profile/resubmit', protect, resubmitProfileForReview);

const { getProviderMatches, scrapeAndGetMatches } = require('../controllers/matchmakingController');
router.get('/matches', providerMatchingGate, protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getProviderMatches);
router.get('/scrape-matches', requireOperationalFlags('ENABLE_PROVIDER_AI_JOBS', 'ENABLE_CRAWLERS'), protect, authorizeRoleFromActive('provider'), ensureProviderApproved, scrapeAndGetMatches);

router.post(
  '/profile/ai-suggest',
  providerProfileAiGate,
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  providerProfileAISuggestValidation,
  validateRequest,
  aiSuggestProfile
);
router.post(
  '/ai/build-profile',
  providerProfileAiGate,
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  buildAIProfile
);
router.post(
  '/ai/provider-builder-suggestion',
  providerProfileAiGate,
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  providerBuilderSuggestion
);
router.post(
  '/ai/extract-profile',
  providerProfileAiGate,
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  aiRateLimiter,
  extractAndLockProfileData
);
router.get(
  '/ai/pricing-suggestion',
  providerProfileAiGate,
  protect,
  authorizeRoleFromActive('provider'),
  ensureProviderApproved,
  requireFeatureFlag('ai.feature.profile', { defaultEnabled: true }),
  aiRateLimiter,
  getAIPricingSuggestion
);

router.get('/dashboard', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getDashboard);
router.get('/plans', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getPlans);
router.post('/plans/purchase', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, purchasePlan);
router.get('/my-plan', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getMyPlan);
router.get('/subscription/current', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getCurrentSubscription);
router.get('/plan/list', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getProviderPlans);
router.post('/plan/preview', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, previewPlan);
router.post('/plan/checkout', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, checkoutPlan);

router.post('/plan/payment-success', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, paymentSuccess);
// Public routes
router.get('/top-talent', getTopTalent);

// New provider plans / subscriptions flow endpoints (Step 10)
router.get('/subscription/active', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getActiveSubscriptionDetail);
router.get('/subscription/usage', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getProviderUsageMetrics);
router.post('/subscription/calculate-custom-price', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, calculateCustomPriceController);
router.post('/subscription/purchase-fixed', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, purchaseFixedPlan);
router.post('/subscription/purchase-custom', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, purchaseCustomPlan);
router.post('/subscription/payment-success', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, confirmPaymentSuccessController);
router.patch('/subscription/auto-renew', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, toggleAutoRenewController);
router.get('/leads', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getMyLeads);
router.put('/leads/:id', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, updateLeadStatus);
router.get('/history', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getMyHistory);

const { getMarketBenchmark } = require('../controllers/candidateBenchmark.controller');
router.get('/benchmark/:candidateId', requireOperationalFlags('AI_FEATURES_ENABLED', 'ENABLE_PROVIDER_AI_INSIGHTS'), protect, getMarketBenchmark);

router.get('/public/:id', optionalAuth, getPublicProfile);
router.get('/public/:id/whatsapp-redirect', getPublicWhatsAppRedirect);
router.post('/public/:id/contact-click', protect, logContactClick);
// Profile photo & document uploads
router.post('/profile/photo', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, upload.single('profilePhoto'), uploadProfilePhoto);
router.delete('/profile/photo', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, deleteProfilePhoto);

// Resume upload
router.post('/profile/resume', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, upload.single('resume'), uploadResume);
router.delete('/profile/resume', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, deleteResume);
router.get('/profile/resume/preview', protect, authorizeRoleFromActive('provider'), async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const https = require('https');

    const profile = await findProviderProfileByUserId(req.user._id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // Log all URL fields for debugging
    console.log('[Resume Preview] resumeUrl:', profile.resumeUrl);
    console.log('[Resume Preview] pendingUrl:', profile.resumeApproval?.pendingUrl);
    console.log('[Resume Preview] approvedUrl:', profile.resumeApproval?.approvedUrl);

    // Prefer local /uploads path (guaranteed to exist if upload succeeded)
    // Only fall back to Cloudinary URLs if no local file
    const localUrl = [profile.resumeUrl, profile.resumeApproval?.approvedUrl, profile.resumeApproval?.pendingUrl]
      .find(u => u && u.startsWith('/uploads/'));
    const cloudinaryUrl = [profile.resumeApproval?.approvedUrl, profile.resumeApproval?.pendingUrl, profile.resumeUrl]
      .find(u => u && u.includes('cloudinary.com'));
    const rawUrl = localUrl || cloudinaryUrl;

    if (!rawUrl) return res.status(404).json({ message: 'No resume uploaded' });
    console.log('[Resume Preview] Using URL:', rawUrl);

    // Local file
    if (rawUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', rawUrl);
      console.log('[Resume Preview] Serving local file:', filePath);
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on disk' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
      return fs.createReadStream(filePath).pipe(res);
    }


    // For Cloudinary URLs — use SDK to generate a signed download URL
    if (rawUrl.includes('cloudinary.com')) {
      try {
        const { getCloudinaryInstance } = require('../utils/cloudinary');
        const cloudinary = await getCloudinaryInstance();

        // Extract base path from URL (after /upload/ and stripping version)
        const parts = rawUrl.split('/');
        const uploadIdx = parts.indexOf('upload');
        const pathAfterUpload = parts.slice(uploadIdx + 1);
        if (pathAfterUpload[0] && pathAfterUpload[0].match(/^v\d+$/)) pathAfterUpload.shift();

        const fullPath = pathAfterUpload.join('/').replace(/\.pdf\.pdf$/i, '.pdf');
        // Two public_id variants:
        // - raw resources: public_id INCLUDES the .pdf extension
        // - image resources: public_id does NOT include the extension
        const publicIdWithExt = fullPath.endsWith('.pdf') ? fullPath : fullPath + '.pdf';
        const publicIdNoExt = fullPath.replace(/\.pdf$/i, '').replace(/\.docx?$/i, '');

        console.log('[Resume Preview] publicIdWithExt:', publicIdWithExt);
        console.log('[Resume Preview] publicIdNoExt:', publicIdNoExt);

        const tryStream = (urlOrPublicId, resourceType) => new Promise((resolve, reject) => {
          // If resourceType is 'direct', we just fetch the url directly
          const targetUrl = resourceType === 'direct' 
            ? urlOrPublicId 
            : cloudinary.url(urlOrPublicId, {
                resource_type: resourceType,
                type: 'upload',
                sign_url: true,
                expires_at: Math.floor(Date.now() / 1000) + 120,
              });
              
          console.log(`[Resume Preview] Trying [${resourceType}] ${targetUrl}`);
          https.get(targetUrl, (fileRes) => {
            console.log(`[Resume Preview]   → status ${fileRes.statusCode}`);
            if (fileRes.statusCode === 200) resolve(fileRes);
            else if (fileRes.statusCode === 301 || fileRes.statusCode === 302) {
              // Handle redirect
              https.get(fileRes.headers.location, (r2) => {
                if (r2.statusCode === 200) resolve(r2);
                else { r2.resume(); reject(new Error(`${r2.statusCode}`)); }
              }).on('error', reject);
            }
            else { fileRes.resume(); reject(new Error(`${fileRes.statusCode}`)); }
          }).on('error', reject);
        });

        // Try all combinations. Existing files in DB were uploaded as 'image' (old bug),
        // new files are uploaded as 'raw'. Try both public_id forms × both resource types.
        const attempts = [
          [rawUrl,          'direct'],  // 1. Try the exact URL stored in DB first
          [publicIdNoExt,   'image'],   // 2. existing uploads (old bug: PDF as image)
          [publicIdWithExt, 'raw'],     // 3. new uploads (fixed: PDF as raw, with extension in ID)
          [publicIdNoExt,   'raw'],     // 4. raw without extension
          [publicIdWithExt, 'image'],   // 5. image with extension
          [publicIdNoExt,   'auto'],
        ];

        let stream = null;
        for (const [pid, rt] of attempts) {
          try {
            stream = await tryStream(pid, rt);
            console.log(`[Resume Preview] SUCCESS: [${rt}]`);
            break;
          } catch (e) {
            console.warn(`[Resume Preview] FAIL [${rt}]: ${e.message}`);
          }
        }

        if (!stream) {
          console.warn(`[Resume Preview] Cloudinary fetch failed for ${publicIdNoExt}. Attempting ultimate local fallback...`);
          // ULTIMATE FALLBACK: Find the latest local file for this user
          const resumesDir = path.join(__dirname, '..', 'uploads', 'resumes');
          if (fs.existsSync(resumesDir)) {
            const files = fs.readdirSync(resumesDir)
              .filter(f => f.includes(req.user._id.toString()))
              .map(f => ({
                name: f,
                time: fs.statSync(path.join(resumesDir, f)).mtime.getTime()
              }))
              .sort((a, b) => b.time - a.time);

            if (files.length > 0) {
              const latestFile = path.join(resumesDir, files[0].name);
              console.log(`[Resume Preview] Found local fallback: ${latestFile}`);
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
              return fs.createReadStream(latestFile).pipe(res);
            }
          }
          return res.status(502).json({ message: `Resume file not found in Cloudinary after trying all combinations. public_id base: ${publicIdNoExt}` });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
        res.setHeader('Cache-Control', 'no-cache');
        stream.pipe(res);

      } catch (cloudErr) {
        console.error('[Resume Preview] Cloudinary SDK error:', cloudErr.message);
        return res.status(502).json({ message: 'Cloudinary SDK error: ' + cloudErr.message });
      }
      return;
    }





    // R2 or other remote URL — stream directly
    https.get(rawUrl, (fileRes) => {
      if (fileRes.statusCode !== 200) {
        fileRes.resume();
        return res.status(502).json({ message: `Remote returned ${fileRes.statusCode}` });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
      fileRes.pipe(res);
    }).on('error', (err) => res.status(502).json({ message: err.message }));

  } catch (err) {
    console.error('[Resume Preview] Error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});


// Document upload
router.post('/profile/document', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, upload.single('document'), uploadDocument);

// Provider Job and Application Visibility routes
router.get('/jobs', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getProviderJobs);
router.get('/saved-jobs', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getSavedJobs);
router.get('/jobs/:jobId', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getProviderJobById);
router.post('/jobs/:jobId/save', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, toggleSavedJob);
router.post('/jobs/:jobId/apply', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, applyToJobFromProvider);
router.delete('/jobs/:jobId/apply', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, withdrawApplication);
router.get('/applications', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getProviderApplications);
router.post('/jobs/ai-insights', requireOperationalFlags('AI_FEATURES_ENABLED', 'ENABLE_PROVIDER_AI_INSIGHTS'), protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getJobAiInsights);

// ─── AI Resume Parser Routes ──────────────────────────────────────────────────
const {
  triggerResumeParse,
  getParseStatus,
  applyParsedResume,
  requireResumeAiEnabled,
  retryParse,
} = require('../controllers/resumeParserController');

// Trigger AI parse on existing resume (or file upload)
router.post('/resume/parse', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, requireResumeAiEnabled, upload.single('resume'), checkAiLimit('resumeImprovement'), triggerResumeParse);
// Poll parsing status + get parsed data
router.get('/resume/parse-status', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getParseStatus);
// Apply accepted parsed fields to profile
router.patch('/resume/apply-parsed', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, applyParsedResume);
// Retry a failed parse
router.post('/resume/retry-parse', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, requireResumeAiEnabled, checkAiLimit('resumeImprovement'), retryParse);

module.exports = router;

