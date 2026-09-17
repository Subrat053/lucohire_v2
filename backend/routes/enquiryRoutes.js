const express = require('express');
const router = express.Router();
const { createEnquiry, getEnquiries } = require('../controllers/enquiryController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', createEnquiry);
router.get('/', protect, authorize('admin'), getEnquiries);

module.exports = router;
