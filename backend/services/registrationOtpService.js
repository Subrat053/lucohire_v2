/**
 * registrationOtpService.js
 * Unified OTP service for Freelancer / Provider Registration.
 *
 * Requirements:
 * - Only ONE OTP delivery service: via Email only (Resend API / dev console).
 * - If user requests mobile verification OTP, the 4-digit OTP is delivered to their email.
 * - If user requests email verification OTP, the 4-digit OTP is delivered to their email.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('./resendOtpService');

// In-memory store with 10-minute TTL
// Key: `${targetType}:${email}` -> { otpHash, email, phone, targetType, expiresAt, attempts }
const registrationOtpStore = new Map();

// Verified tokens store with 1-hour TTL
// Key: verificationToken -> { targetType, email, phone, verifiedAt }
const verifiedTokensStore = new Map();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of registrationOtpStore.entries()) {
    if (record.expiresAt < now) registrationOtpStore.delete(key);
  }
  for (const [token, record] of verifiedTokensStore.entries()) {
    if (record.verifiedAt + TOKEN_EXPIRY_MS < now) verifiedTokensStore.delete(token);
  }
}, 15 * 60 * 1000);

function generateFourDigitOtp() {
  return String(crypto.randomInt(1000, 10000));
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return '';
  const [user, domain] = email.split('@');
  const visible = user.length > 2 ? user.slice(0, 2) : user.slice(0, 1);
  return `${visible}***@${domain}`;
}

/**
 * Send 4-digit registration OTP via email.
 * @param {Object} params
 * @param {'mobile'|'email'} params.targetType
 * @param {string} params.email
 * @param {string} [params.phone]
 */
async function sendRegistrationOtp({ targetType, email, phone }) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new Error('A valid email address is required.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  let cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

  if (targetType === 'mobile') {
    if (!cleanPhone || cleanPhone.length !== 10) {
      throw new Error('A valid 10-digit mobile number is required for mobile verification.');
    }
  }

  const otp = generateFourDigitOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const key = `${targetType}:${normalizedEmail}`;

  registrationOtpStore.set(key, {
    otpHash,
    email: normalizedEmail,
    phone: cleanPhone,
    targetType,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
  });

  // Prepare email delivery
  const isMobile = targetType === 'mobile';
  const purpose = isMobile ? 'mobile_verification' : 'email_verification';

  // Send via Resend / email
  const emailResult = await sendOtpEmail({
    to: normalizedEmail,
    otp,
    purpose,
  });

  if (!emailResult.success && !emailResult.devMode) {
    registrationOtpStore.delete(key);
    throw new Error('Failed to deliver OTP email. Please check your email address and try again.');
  }

  return {
    success: true,
    targetType,
    deliveryChannel: 'email',
    maskedEmail: maskEmail(normalizedEmail),
    message: isMobile
      ? `Verification code for mobile +91 ${cleanPhone} sent to ${maskEmail(normalizedEmail)} (SMS is routed via email).`
      : `Verification code sent to ${maskEmail(normalizedEmail)}.`,
    expiresInSeconds: 600,
  };
}

/**
 * Verify 4-digit registration OTP.
 * @param {Object} params
 * @param {'mobile'|'email'} params.targetType
 * @param {string} params.email
 * @param {string} [params.phone]
 * @param {string} params.otp
 */
async function verifyRegistrationOtp({ targetType, email, phone, otp }) {
  if (!email || !otp) {
    throw new Error('Email and OTP are required.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const key = `${targetType}:${normalizedEmail}`;
  const record = registrationOtpStore.get(key);

  if (!record) {
    return {
      success: false,
      message: 'OTP has expired or not requested. Please click Resend OTP.',
    };
  }

  if (Date.now() > record.expiresAt) {
    registrationOtpStore.delete(key);
    return {
      success: false,
      message: 'OTP has expired. Please request a new OTP.',
    };
  }

  if (record.attempts >= 5) {
    registrationOtpStore.delete(key);
    return {
      success: false,
      message: 'Too many incorrect attempts. Please request a new OTP.',
    };
  }

  const isValid = await bcrypt.compare(String(otp).trim(), record.otpHash);
  if (!isValid) {
    record.attempts += 1;
    return {
      success: false,
      message: 'Incorrect 4-digit OTP. Please check your email and try again.',
      attemptsRemaining: 5 - record.attempts,
    };
  }

  // Verification succeeded
  registrationOtpStore.delete(key);

  const verificationToken = `verified_${targetType}_${crypto.randomBytes(16).toString('hex')}`;
  verifiedTokensStore.set(verificationToken, {
    targetType,
    email: normalizedEmail,
    phone: record.phone,
    verifiedAt: Date.now(),
  });

  return {
    success: true,
    verified: true,
    targetType,
    verificationToken,
    message: targetType === 'mobile'
      ? 'Mobile number verified successfully.'
      : 'Email address verified successfully.',
  };
}

/**
 * Check if a verification token is valid.
 */
function isTokenVerified(token, expectedType, expectedEmail) {
  if (!token) return false;
  const record = verifiedTokensStore.get(token);
  if (!record) return false;
  if (Date.now() - record.verifiedAt > TOKEN_EXPIRY_MS) {
    verifiedTokensStore.delete(token);
    return false;
  }
  if (expectedType && record.targetType !== expectedType) return false;
  if (expectedEmail && record.email !== expectedEmail.toLowerCase().trim()) return false;
  return true;
}

module.exports = {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  isTokenVerified,
};
