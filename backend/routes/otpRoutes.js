const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtpHandler, resendOtpHandler } = require('../controllers/otpController');
const { protect } = require('../middleware/auth');
const { otpSendLimiter, otpVerifyLimiter } = require('../middleware/otpRateLimit');

// All OTP routes require authentication
router.post('/send',   protect, otpSendLimiter,   sendOtp);
router.post('/verify', protect, otpVerifyLimiter,  verifyOtpHandler);
router.post('/resend', protect, otpSendLimiter,    resendOtpHandler);

module.exports = router;
