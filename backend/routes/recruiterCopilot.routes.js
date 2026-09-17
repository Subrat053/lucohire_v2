const express = require('express');
const { protect, authorizeRoleFromActive } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { body, query } = require('express-validator');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

const {
  copilotSearch,
  generateJD,
  getCandidateAnalytics,
  bulkUnlock,
  getSimilarCandidates,
  expandSearch
} = require('../controllers/recruiterCopilot.controller');

const router = express.Router();

router.use(requireOperationalFlags('AI_FEATURES_ENABLED', 'ENABLE_RECRUITER_AI'));

const ensurePremiumRecruiter = [protect, authorizeRoleFromActive('recruiter')];

router.post(
  '/search',
  ensurePremiumRecruiter,
  body('command').optional().isString(),
  body('filters').optional().isObject(),
  validateRequest,
  copilotSearch
);

router.post(
  '/generate-jd',
  ensurePremiumRecruiter,
  body('prompt').isString().notEmpty(),
  validateRequest,
  generateJD
);

router.get(
  '/analytics/:candidateId',
  ensurePremiumRecruiter,
  getCandidateAnalytics
);

router.post(
  '/bulk-unlock',
  ensurePremiumRecruiter,
  body('candidateIds').isArray({ min: 1 }),
  validateRequest,
  bulkUnlock
);

router.get(
  '/similar/:candidateId',
  ensurePremiumRecruiter,
  getSimilarCandidates
);

router.post(
  '/expand-search',
  ensurePremiumRecruiter,
  body('querySkills').isArray({ min: 1 }),
  validateRequest,
  expandSearch
);

module.exports = router;
