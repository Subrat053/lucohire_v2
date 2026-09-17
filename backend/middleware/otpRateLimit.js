/**
 * otpRateLimit.js
 * Per-route rate limiters for OTP endpoints.
 * Separate from the global API limiter for tighter control.
 */

const rateLimit = require('express-rate-limit');

/** OTP send: max 5 requests per IP per 15 minutes */
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many OTP requests. Please wait 15 minutes before requesting again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** OTP verify: max 10 attempts per IP per 15 minutes */
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many verification attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Candidate unlock: max 20 per IP per 15 minutes */
const unlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.ip,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many unlock requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { otpSendLimiter, otpVerifyLimiter, unlockLimiter };
