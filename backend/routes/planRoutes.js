const express = require('express');
const router = express.Router();
const { getPlansByAudience, getLandingPagePlans } = require('../controllers/subscriptionController');

router.get('/', getPlansByAudience);
router.get('/landing', getLandingPagePlans);

module.exports = router;
