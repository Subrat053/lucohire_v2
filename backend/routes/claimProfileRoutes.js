const express = require('express');
const router = express.Router();
const { getClaimProfileDetails, confirmClaimProfile } = require('../controllers/claimProfileController');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

router.use(requireOperationalFlags('ENABLE_OUTREACH'));

router.get('/:token', getClaimProfileDetails);
router.post('/:token/confirm', confirmClaimProfile);

module.exports = router;
