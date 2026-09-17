/**
 * guestOtpController.js
 * Handles email OTP send/verify for UNAUTHENTICATED guest users.
 * Uses Resend to deliver the OTP — no Firebase, no billing issues.
 * OTPs are stored in MongoDB with a guestToken identifier.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../services/resendOtpService');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { createUser, saveUser } = require('../services/authPersistenceService');
const {
  ensureProviderProfile,
} = require('../services/providerProfilePersistenceService');
const { buildAuthPayload, verifyFirebaseIdToken } = require('./authController');

// ── In-memory store (TTL 10 min) — lightweight for guest flow ─────────────────
// Map: guestToken → { otpHash, email, expiresAt, attempts }
const guestOtpStore = new Map();
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup expired entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, record] of guestOtpStore.entries()) {
    if (record.expiresAt < now) guestOtpStore.delete(token);
  }
}, 15 * 60 * 1000);

function generateSixDigitOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// ── POST /api/jobs/guest-otp/send ─────────────────────────────────────────────
const sendGuestOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = generateSixDigitOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const guestToken = crypto.randomBytes(24).toString('hex');

    guestOtpStore.set(guestToken, {
      otpHash,
      email: normalizedEmail,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      attempts: 0,
    });

    // Send via Resend
    const emailResult = await sendOtpEmail({ to: normalizedEmail, otp, purpose: 'guest_discovery' });
    if (!emailResult.success && !emailResult.devMode) {
      guestOtpStore.delete(guestToken);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
    }

    console.log(`[GuestOTP] OTP sent to ${normalizedEmail}`);

    return res.json({
      success: true,
      guestToken,
      maskedEmail: normalizedEmail.replace(/(.{2}).+?(@.+)/, '$1***$2'),
      message: 'OTP sent to your email.',
    });
  } catch (err) {
    console.error('[GuestOTP Send] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

// ── POST /api/jobs/guest-otp/verify ───────────────────────────────────────────
const verifyGuestOtp = async (req, res) => {
  try {
    const { guestToken, otp } = req.body;

    if (!guestToken || !otp) {
      return res.status(400).json({ success: false, message: 'Guest token and OTP are required.' });
    }

    const record = guestOtpStore.get(guestToken);
    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
    }

    if (Date.now() > record.expiresAt) {
      guestOtpStore.delete(guestToken);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (record.attempts >= 5) {
      guestOtpStore.delete(guestToken);
      return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    const isValid = await bcrypt.compare(String(otp).trim(), record.otpHash);
    if (!isValid) {
      record.attempts += 1;
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please try again.',
        attemptsRemaining: 5 - record.attempts,
      });
    }

    // Verified — remove from store
    const verifiedEmail = record.email;
    guestOtpStore.delete(guestToken);

    console.log(`[GuestOTP] Verified for ${verifiedEmail}`);

    // Try to find the user
    let user = withLegacyId(await prisma.user.findUnique({ where: { email: verifiedEmail } }));
    let isNewUser = false;
    
    // Extract additional details from request body (passed from frontend)
    const { name = '', skills = '', experience = '' } = req.body;

    if (!user) {
      // Create new user (hasPassword will be false by default as no password provided)
      user = await createUser({
        email: verifiedEmail,
        name: name || verifiedEmail.split('@')[0],
        roles: ['provider'], // Default role for candidates
        activeRole: 'provider',
        isEmailVerified: true
      });
      isNewUser = true;
    } else {
      user.isEmailVerified = true;
      if (!user.roles.includes('provider')) {
        user.roles.push('provider');
        user.activeRole = 'provider';
      }
      await saveUser(user);
    }

    // Ensure they have a profile
    const profile = await ensureProviderProfile(user._id, {
        category: skills ? skills.split(',')[0].trim() : '',
      });
    if (!user.providerProfileId) {
      user.providerProfileId = profile._id;
      await saveUser(user);
    }

    const authPayload = buildAuthPayload(user, { providerProfileId: profile._id });

    return res.json({
      success: true,
      message: 'Email verified successfully.',
      isNewUser,
      token: authPayload.token,
      user: authPayload,
    });
  } catch (err) {
    console.error('[GuestOTP Verify] Error:', err.message);
    return res.status(500).json({ success: false, message: 'OTP verification failed. Please try again.' });
  }
};

const verifyGuestFirebase = async (req, res) => {
  try {
    const { firebaseToken, fullName = '', emailId = '', phone = '', password = '', skills = '', experience = '' } = req.body;
    const name = fullName;
    const email = emailId;

    if (!firebaseToken) {
      return res.status(400).json({ success: false, message: 'Firebase token is required.' });
    }

    // Verify token with Firebase
    const decodedToken = await verifyFirebaseIdToken(firebaseToken);
    if (!decodedToken || !decodedToken.phoneNumber) {
      return res.status(400).json({ success: false, message: 'Invalid token or no phone number found.' });
    }

    const verifiedPhone = decodedToken.phoneNumber;

    // Optional: check if verifiedPhone matches req.body.phone
    // if (phone && verifiedPhone !== phone && verifiedPhone !== `+${phone.replace(/\D/g, '')}`) {
    //   // They might mismatch slightly depending on formatting, so we trust Firebase's verifiedPhone.
    // }

    // Try to find the user by phone or email
    const OR = [{ phone: verifiedPhone }];
    if (email) OR.push({ email });
    let user = withLegacyId(await prisma.user.findFirst({ where: { OR } }));
    
    let isNewUser = false;

    if (!user) {
      // Create new user
      user = await createUser({
        email: email || `${verifiedPhone.replace('+', '')}@placeholder.lucohire.com`, // fallback email if not provided
        name: name || 'Guest User',
        phone: verifiedPhone,
        roles: ['provider'], // Default role for candidates
        activeRole: 'provider',
        isPhoneVerified: true,
        isEmailVerified: !!email, // If they provided an email in this flow, we might assume it's true or leave false. Actually, let's leave it false unless we know.
      });
      
      if (password) {
        user.password = password; // Will be hashed in pre-save hook
        user.hasPassword = true;
      }
      
      await saveUser(user);
      isNewUser = true;
    } else {
      user.isPhoneVerified = true;
      user.phone = verifiedPhone; // Update phone to verified one if it was missing
      if (!user.roles.includes('provider')) {
        user.roles.push('provider');
        user.activeRole = 'provider';
      }
      // If user provided a new password and had none, maybe set it? 
      // But typically, we just use their existing account.
      if (!user.hasPassword && password) {
         user.password = password;
         user.hasPassword = true;
      }
      await saveUser(user);
    }

    // Ensure they have a profile
    const profile = await ensureProviderProfile(user._id, {
        category: skills ? skills.split(',')[0].trim() : '',
      });
    if (!user.providerProfileId) {
      user.providerProfileId = profile._id;
      await saveUser(user);
    }

    const authPayload = buildAuthPayload(user, { providerProfileId: profile._id });

    return res.json({
      success: true,
      message: 'Mobile number verified successfully.',
      isNewUser,
      token: authPayload.token,
      user: authPayload,
    });
  } catch (err) {
    console.error('[GuestFirebase Verify] Error:', err.message);
    return res.status(500).json({ success: false, message: 'OTP verification failed. Please try again.' });
  }
};

module.exports = { sendGuestOtp, verifyGuestOtp, verifyGuestFirebase };
