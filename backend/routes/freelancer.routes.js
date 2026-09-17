const express = require('express');
const router = express.Router();
const freelancerController = require('../controllers/freelancer.controller');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

router.use(requireOperationalFlags('ENABLE_PIPELINE_JOBS'));

// Require authentication for these routes
// Assuming auth middleware is added where mounted

router.get('/profile', freelancerController.getProfile);
router.put('/profile', freelancerController.updateProfile);
router.put('/profile/visibility', freelancerController.updateVisibility);

router.post('/contact-request', freelancerController.requestContact);
router.post('/contact-request/:id/approve', freelancerController.approveContactRequest);
router.post('/contact-request/:id/reject', freelancerController.rejectContactRequest);

module.exports = router;
