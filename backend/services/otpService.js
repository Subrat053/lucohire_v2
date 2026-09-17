/**
 * otpService.js
 * Core OTP business logic — generate, verify, resend.
 * Never stores OTP in plain text; uses bcrypt hashing.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');

// ─── Config from environment ──────────────────────────────────────────────────
const OTP_EXPIRY_MINUTES  = parseInt(process.env.OTP_EXPIRY_MINUTES  || '5',  10);
const OTP_MAX_ATTEMPTS    = parseInt(process.env.OTP_MAX_ATTEMPTS    || '5',  10);
const OTP_RESEND_LIMIT    = parseInt(process.env.OTP_RESEND_LIMIT    || '3',  10);
const OTP_BLOCK_MINUTES   = parseInt(process.env.OTP_BLOCK_MINUTES   || '15', 10);
const RESEND_WINDOW_MINUTES = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSixDigitOtp() {
  // Cryptographically random 6-digit string (000000–999999)
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function isIndianPhone(phone) {
  const clean = String(phone || '').trim().replace(/\s+/g, '');
  return clean.startsWith('+91') && clean.length >= 12;
}

/**
 * Determine delivery channel:
 * - +91 number → phone (Firebase)
 * - Anything else with email → email (Resend)
 * - Fallback → email
 */
function detectChannel(phone, email, preferredChannel = null) {
  if (preferredChannel === 'email' && email) return { channel: 'email', target: email.toLowerCase().trim() };
  if (preferredChannel === 'phone' && phone) return { channel: 'phone', target: String(phone).trim() };
  if (email && !phone) return { channel: 'email', target: email.toLowerCase().trim() };
  if (phone && !email) return { channel: 'phone', target: String(phone).trim() };
  if (email) return { channel: 'email', target: email.toLowerCase().trim() };
  if (phone) return { channel: 'phone', target: String(phone).trim() };
  return null;
}

/**
 * Extract E.164 country code from phone number.
 */
function extractCountryCode(phone) {
  const match = String(phone || '').match(/^(\+\d{1,3})/);
  return match ? match[1] : '';
}

// ─── Generate & Save OTP ─────────────────────────────────────────────────────

/**
 * Creates a new OTP record (or replaces existing for same userId+purpose).
 * Returns the plain OTP string for delivery — it is NOT stored plain.
 */
async function generateAndSaveOtp({ userId, purpose, phone, email, channel: preferredChannel = null, ipAddress = '', userAgent = '' }) {
  const detected = detectChannel(phone, email, preferredChannel);
  if (!detected) {
    throw new Error('A phone number or email address is required to send OTP');
  }

  const { channel, target } = detected;
  const countryCode = channel === 'phone' ? extractCountryCode(target) : '';
  const otp = generateSixDigitOtp();
  const saltRounds = 10;
  const otpHash = await bcrypt.hash(otp, saltRounds);

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Preserve previous OTPs for audit log purposes instead of deleting them.
  // The system relies on .sort({ createdAt: -1 }) to always use the most recent one.
  const delFilter = { purpose };
  if (userId) {
    delFilter.OR = [{ userId: String(userId) }, { target }];
  } else {
    delFilter.target = target;
  }
  
  // Mark previous active OTPs as expired for this target/purpose to preserve audit logs
  // Old behavior: await Otp.deleteMany(delFilter);
  await prisma.otp.updateMany({
    where: delFilter,
    data: { expiresAt: new Date() },
  });

  const otpDoc = withLegacyId(await prisma.otp.create({
    data: {
      userId: userId ? String(userId) : null,
      purpose,
      channel,
      target,
      countryCode,
      otpHash,
      expiresAt,
      resendCount: 0,
      resendWindowStart: new Date(),
      attempts: 0,
      blockedUntil: null,
      verifiedAt: null,
      ipAddress,
      userAgent,
      providerUsed: channel === 'phone' ? 'firebase' : 'resend',
    },
  }));

  console.log(`[OTP] Generated for userId=${userId} purpose=${purpose} channel=${channel} target=${maskTarget(target)}`);

  return { otp, channel, target, otpDoc };
}

// ─── Verify OTP ──────────────────────────────────────────────────────────────

/**
 * Verifies a submitted OTP.
 * Returns { success, message, code } — code is machine-readable for frontend.
 */
async function verifyOtp({ userId, purpose, target, otp }) {
  let otpDoc = withLegacyId(await prisma.otp.findFirst({
    where: {
      purpose,
      ...(userId ? { userId: String(userId) } : {}),
      ...(!userId && target ? { target } : {}),
    },
    orderBy: { createdAt: 'desc' },
  }));

  if (!otpDoc) {
    return { success: false, code: 'OTP_NOT_FOUND', message: 'No OTP found. Please request a new OTP.' };
  }

  // Already verified
  if (otpDoc.verifiedAt) {
    return { success: false, code: 'OTP_ALREADY_USED', message: 'This OTP has already been used.' };
  }

  // Blocked
  if (otpDoc.blockedUntil && new Date() < new Date(otpDoc.blockedUntil)) {
    const remainingMs = new Date(otpDoc.blockedUntil) - new Date();
    const remainingMin = Math.ceil(remainingMs / 60000);
    return {
      success: false,
      code: 'OTP_BLOCKED',
      message: `Too many wrong attempts. Try again in ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.`,
    };
  }

  // Expired
  if (new Date() > new Date(otpDoc.expiresAt)) {
    return { success: false, code: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new one.' };
  }

  // Target mismatch (extra safety)
  if (target && otpDoc.target !== target) {
    return { success: false, code: 'OTP_TARGET_MISMATCH', message: 'OTP target does not match.' };
  }

  // Compare hash
  const isMatch = await bcrypt.compare(String(otp), otpDoc.otpHash);

  if (!isMatch) {
    otpDoc.attempts += 1;
    if (otpDoc.attempts >= OTP_MAX_ATTEMPTS) {
      otpDoc.blockedUntil = new Date(Date.now() + OTP_BLOCK_MINUTES * 60 * 1000);
      otpDoc = withLegacyId(await prisma.otp.update({
        where: { id: otpDoc.id },
        data: { attempts: otpDoc.attempts, blockedUntil: otpDoc.blockedUntil },
      }));
      console.log(`[OTP] BLOCKED userId=${userId} purpose=${purpose} after ${otpDoc.attempts} wrong attempts`);
      return {
        success: false,
        code: 'OTP_BLOCKED',
        message: `Too many wrong attempts. Verification blocked for ${OTP_BLOCK_MINUTES} minutes.`,
      };
    }
    otpDoc = withLegacyId(await prisma.otp.update({
      where: { id: otpDoc.id },
      data: { attempts: otpDoc.attempts },
    }));
    const remaining = OTP_MAX_ATTEMPTS - otpDoc.attempts;
    return {
      success: false,
      code: 'OTP_WRONG',
      message: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      attemptsRemaining: remaining,
    };
  }

  // Success — mark verified
  otpDoc = withLegacyId(await prisma.otp.update({
    where: { id: otpDoc.id },
    data: { verifiedAt: new Date() },
  }));
  console.log(`[OTP] VERIFIED userId=${userId} purpose=${purpose}`);

  return { success: true, code: 'OTP_VERIFIED', message: 'OTP verified successfully.', otpDoc };
}

// ─── Resend OTP ──────────────────────────────────────────────────────────────

/**
 * Resends OTP for the latest record for userId+purpose.
 * Enforces resend limit within the resend window.
 * Returns plain OTP for delivery.
 */
async function resendOtp({ userId, purpose, ipAddress = '', userAgent = '' }) {
  let otpDoc = withLegacyId(await prisma.otp.findFirst({
    where: { userId: String(userId), purpose },
    orderBy: { createdAt: 'desc' },
  }));

  if (!otpDoc) {
    throw new Error('No OTP found for this purpose. Please request a new OTP first.');
  }

  if (otpDoc.verifiedAt) {
    throw new Error('OTP already verified. No resend needed.');
  }

  // Check resend window
  const windowStart = otpDoc.resendWindowStart || otpDoc.createdAt;
  const windowMs = RESEND_WINDOW_MINUTES * 60 * 1000;
  const windowExpired = new Date() > new Date(windowStart.getTime() + windowMs);

  if (windowExpired) {
    // Reset window
    otpDoc.resendCount = 0;
    otpDoc.resendWindowStart = new Date();
  }

  if (otpDoc.resendCount >= OTP_RESEND_LIMIT) {
    const resetAt = new Date(windowStart.getTime() + windowMs);
    const waitMin = Math.ceil((resetAt - new Date()) / 60000);
    throw new Error(`Resend limit reached. Try again in ${waitMin} minute${waitMin > 1 ? 's' : ''}.`);
  }

  // Generate fresh OTP
  const otp = generateSixDigitOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  otpDoc.otpHash = otpHash;
  otpDoc.expiresAt = expiresAt;
  otpDoc.attempts = 0;
  otpDoc.blockedUntil = null;
  otpDoc.resendCount += 1;
  otpDoc.ipAddress = ipAddress || otpDoc.ipAddress;
  otpDoc.userAgent = userAgent || otpDoc.userAgent;
  otpDoc = withLegacyId(await prisma.otp.update({
    where: { id: otpDoc.id },
    data: {
      otpHash: otpDoc.otpHash,
      expiresAt: otpDoc.expiresAt,
      attempts: otpDoc.attempts,
      blockedUntil: otpDoc.blockedUntil,
      resendCount: otpDoc.resendCount,
      resendWindowStart: otpDoc.resendWindowStart,
      ipAddress: otpDoc.ipAddress,
      userAgent: otpDoc.userAgent,
    },
  }));

  console.log(`[OTP] RESEND ${otpDoc.resendCount}/${OTP_RESEND_LIMIT} userId=${userId} purpose=${purpose} channel=${otpDoc.channel}`);

  return { otp, channel: otpDoc.channel, target: otpDoc.target, otpDoc };
}

// ─── Session Check ────────────────────────────────────────────────────────────

/**
 * Check if user has a valid verified OTP for a given purpose within the session window.
 * Session window = 30 minutes after verification (configurable).
 */
async function hasVerifiedOtpSession({ userId, purpose, windowMinutes = 30 }) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const doc = await prisma.otp.findFirst({
    where: {
      userId: String(userId),
      purpose,
      verifiedAt: { gte: since },
    },
    orderBy: { verifiedAt: 'desc' },
  });

  return !!doc;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function maskTarget(target) {
  if (!target) return '';
  if (target.includes('@')) {
    const [user, domain] = target.split('@');
    return `${user.slice(0, 2)}***@${domain}`;
  }
  return `${target.slice(0, 4)}****${target.slice(-3)}`;
}

module.exports = {
  generateAndSaveOtp,
  verifyOtp,
  resendOtp,
  hasVerifiedOtpSession,
  detectChannel,
  maskTarget,
};
