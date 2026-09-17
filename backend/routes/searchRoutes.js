const express = require('express');
const { protect, authorizeRoleFromActive } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { aiRateLimiter } = require('../middleware/aiRateLimit');
const {
  interpretSearchValidation,
  searchProvidersValidation,
  autoMatchValidation,
} = require('../validators/searchValidators');
const {
  interpretSearch,
  searchProviders,
  autoMatch,
  parseSearchIntentAI,
  getProviderTrustScore,
  getRepeatRecommendations,
  autoMatchPreview,
} = require('../controllers/searchController');

const router = express.Router();
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');
const matchingGate = requireOperationalFlags('ENABLE_RECRUITER_MATCHING');

const cleanEmptyQueries = (req, res, next) => {
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (req.query[key] === '') {
        delete req.query[key];
      }
    });
  }
  next();
};

router.post(
  '/interpret',
  matchingGate,
  protect,
  authorizeRoleFromActive('recruiter', 'provider'),
  interpretSearchValidation,
  validateRequest,
  interpretSearch
);

router.get('/providers', matchingGate, cleanEmptyQueries, searchProvidersValidation, validateRequest, searchProviders);

router.post(
  '/auto-match',
  matchingGate,
  protect,
  authorizeRoleFromActive('recruiter', 'provider'),
  autoMatchValidation,
  validateRequest,
  autoMatch
);

router.post(
  '/ai/parse-intent',
  requireOperationalFlags('AI_FEATURES_ENABLED', 'ENABLE_RECRUITER_MATCHING'),
  aiRateLimiter,
  interpretSearchValidation,
  validateRequest,
  parseSearchIntentAI
);

router.post(
  '/auto-match/preview',
  matchingGate,
  protect,
  authorizeRoleFromActive('recruiter', 'provider'),
  autoMatchValidation,
  validateRequest,
  autoMatchPreview
);

router.get(
  '/repeat-recommendations',
  matchingGate,
  protect,
  authorizeRoleFromActive('recruiter', 'provider'),
  getRepeatRecommendations
);

router.get('/trust-score/:providerId', getProviderTrustScore);

module.exports = router;
