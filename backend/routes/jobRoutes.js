const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const {
  getAvailableJobs,
  applyToJob,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  getNearbyJobs,
  getJobExpiryPrediction,
  getGuestRecommendedJobs,
  boostJob,
  getPublicJobById
} = require('../controllers/jobController');
const {
  sendGuestOtp,
  verifyGuestOtp,
  verifyGuestFirebase
} = require('../controllers/guestOtpController');
const {
  sendEmailOtp,
  verifyDualRecruiter
} = require('../controllers/recruiterDiscoveryController');
const { protect, authorizeRoleFromActive } = require('../middleware/auth');
const { checkApplyLimit, attachSubscription } = require('../middleware/subscription');
const { ensureProviderApproved } = require('../middleware/providerApproval');
const upload = require('../middleware/upload');
const { parseGuestResume, requireResumeAiEnabled } = require('../controllers/resumeParserController');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

// Optional auth: attach req.user if token present, but don't block
const optionalAuth = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer')) {
    try {
      const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: String(decoded.id) },
        select: {
          id: true, roles: true, activeRole: true, role: true, panelAccess: true,
          isBlocked: true, email: true, name: true, phone: true, whatsappNumber: true,
          authProvider: true, approvalStatus: true, roleIntent: true, activePanel: true,
          country: true, currency: true, locale: true, preferredLanguage: true,
          avatar: true, termsAccepted: true, profilePhoto: true, profilePhotoApproval: true,
        },
      });
      req.user = withLegacyId(user);
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

// Provider: my applications (must come BEFORE the generic /:jobId routes)
router.get('/my-applications', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getMyApplications);
router.get('/nearby', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, getNearbyJobs);

// Recruiter: view applications for a specific job
router.get('/:jobId/applications', protect, authorizeRoleFromActive('recruiter'), getJobApplications);

// Recruiter: update application status
router.put('/applications/:applicationId', protect, authorizeRoleFromActive('recruiter'), updateApplicationStatus);

// Recruiter: boost a job
router.post('/:jobId/boost', protect, authorizeRoleFromActive('recruiter'), boostJob);

// Browse jobs (public, but logged-in providers get applied status)
router.get('/', optionalAuth, attachSubscription, getAvailableJobs);

// Guest Recommended Jobs (no auth required)
router.post('/guest-recommended', getGuestRecommendedJobs);

// Guest OTP Routes (no auth required)
router.post('/guest-otp/send', sendGuestOtp);
router.post('/guest-otp/verify', verifyGuestOtp);
router.post('/guest-firebase/verify', verifyGuestFirebase);
router.post('/guest-resume/parse', requireResumeAiEnabled, upload.single('resume'), parseGuestResume);

// Recruiter Discovery Routes (no auth required)
router.post('/recruiter-discovery/send-email-otp', sendEmailOtp);
router.post('/recruiter-discovery/verify-dual', verifyDualRecruiter);

// Provider: apply to job (with subscription limit check)
router.post('/:jobId/apply', protect, authorizeRoleFromActive('provider'), ensureProviderApproved, checkApplyLimit, applyToJob);

// AI Decision Engine: Job Expiry Predictor (Accessible by candidates/providers)
router.get('/:id/expiry-prediction', requireOperationalFlags('AI_FEATURES_ENABLED', 'ENABLE_JOB_AI_EXPIRY'), optionalAuth, getJobExpiryPrediction);

// Public Job Detail
router.get('/public/:jobId', getPublicJobById);

module.exports = router;
