const express = require('express');
const router = express.Router();
const { sendUnlockOtp, verifyUnlockOtp, updateUnlockedProfile, directUnlockProfile } = require('../controllers/unlockProfileController');
const { protect, authorize } = require('../middleware/auth');

router.post(
  '/send-otp',
  protect,
  authorize('admin', 'manager', 'partner'),
  sendUnlockOtp
);

router.post(
  '/verify',
  protect,
  authorize('admin', 'manager', 'partner'),
  verifyUnlockOtp
);

router.post(
  '/direct-unlock',
  protect,
  authorize('admin', 'manager', 'partner'),
  directUnlockProfile
);

router.put(
  '/user/:id',
  protect,
  authorize('admin', 'manager', 'partner'),
  updateUnlockedProfile
);

module.exports = router;
