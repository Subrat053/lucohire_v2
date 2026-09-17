const express = require("express");
const router = express.Router();
const { getWageEstimate } = require("../controllers/wageEstimatorController");
const { protect } = require("../middleware/auth");
const { aiRateLimiter } = require("../middleware/aiRateLimit");
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

router.post("/", requireOperationalFlags('AI_FEATURES_ENABLED', 'ENABLE_WAGE_AI'), protect, aiRateLimiter, getWageEstimate);

module.exports = router;
