const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../services/resendOtpService');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { createUser, saveUser } = require('../services/authPersistenceService');
const { saveRecruiterProfile } = require('../services/recruiterCompanyPersistenceService');
const { buildAuthPayload, verifyFirebaseIdToken, ensureRoleProfile, ensureRoleSubscription } = require('./authController');
const { createOtpLog } = require('../services/auditPersistenceService');

// ── In-memory store (TTL 10 min) ─────────────────────────────────────────────
// Map: guestToken → { otpHash, email, expiresAt, attempts }
const recruiterDiscoveryOtpStore = new Map();
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
  const now = Date.now();
  for (const [token, record] of recruiterDiscoveryOtpStore.entries()) {
    if (record.expiresAt < now) recruiterDiscoveryOtpStore.delete(token);
  }
}, 15 * 60 * 1000);

function generateSixDigitOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// ── POST /api/recruiter-guest/send-email-otp ────────────────────────────────
const sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if user already exists to fail early
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        accountExists: true,
        message: 'Account already exists' 
      });
    }

    const otp = generateSixDigitOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const guestToken = crypto.randomBytes(24).toString('hex');

    recruiterDiscoveryOtpStore.set(guestToken, {
      email: normalizedEmail,
      otpHash,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      attempts: 0
    });

    const emailResult = await sendOtpEmail({ to: normalizedEmail, otp, purpose: 'recruiter_discovery' });
    if (!emailResult.success && !emailResult.devMode) {
      recruiterDiscoveryOtpStore.delete(guestToken);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
    }

    try {
      await createOtpLog({
        target: normalizedEmail,
        channel: 'email',
        purpose: 'login',
        otpHash: 'EMAIL_OTP_MANAGED_IN_MEMORY',
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
        providerUsed: 'resend',
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] || "",
      });
    } catch (logErr) {
      console.error('Failed to write to Otp audit log:', logErr);
    }

    return res.json({
      success: true,
      guestToken,
      message: 'OTP sent to your email.',
      devMode: !!emailResult.devMode,
      otp: emailResult.devMode ? otp : undefined
    });
  } catch (err) {
    console.error('[RecruiterDiscovery SendOTP] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to initiate email verification.' });
  }
};

// ── POST /api/recruiter-guest/verify-dual ───────────────────────────────────
const verifyDualRecruiter = async (req, res) => {
  try {
    const { 
      guestToken, emailOtp, firebaseToken, 
      name = '', companyName = '', email = '', phone = '', password = '', industry = '' 
    } = req.body;

    if (!firebaseToken) {
      console.warn('[VerifyDual] Missing firebaseToken');
      return res.status(400).json({ success: false, message: 'Firebase token is required.' });
    }
    if (!guestToken || !emailOtp) {
      console.warn('[VerifyDual] Missing guestToken or emailOtp');
      return res.status(400).json({ success: false, message: 'Email OTP is required.' });
    }

    // 1. Verify Email OTP
    const record = recruiterDiscoveryOtpStore.get(guestToken);
    if (!record) {
      console.warn('[VerifyDual] Record not found. Session expired or backend restarted. GuestToken:', guestToken);
      return res.status(400).json({ success: false, message: 'Email OTP session expired or invalid. Please request a new one.' });
    }

    if (record.attempts >= 5) {
      console.warn('[VerifyDual] Too many attempts');
      recruiterDiscoveryOtpStore.delete(guestToken);
      return res.status(400).json({ success: false, message: 'Too many invalid attempts. Please request a new OTP.' });
    }

    const isMatch = await bcrypt.compare(String(emailOtp), record.otpHash);
    if (!isMatch) {
      console.warn('[VerifyDual] Incorrect Email OTP');
      record.attempts += 1;
      return res.status(400).json({ success: false, message: 'Incorrect Email OTP.' });
    }

    const verifiedEmail = record.email;
    recruiterDiscoveryOtpStore.delete(guestToken); // One-time use

    // 2. Verify Firebase Phone Token
    const decodedToken = await verifyFirebaseIdToken(firebaseToken);
    if (!decodedToken || !decodedToken.phoneNumber) {
      console.warn('[VerifyDual] Firebase token verification failed:', decodedToken);
      return res.status(400).json({ success: false, message: 'Invalid phone token or no phone number found.' });
    }
    const verifiedPhone = decodedToken.phoneNumber;

    // 3. Find or Create User
    let user = withLegacyId(await prisma.user.findFirst({
      where: { OR: [{ email: verifiedEmail }, { phone: verifiedPhone }] },
    }));

    let isNewUser = false;

    if (!user) {
      user = await createUser({
        email: verifiedEmail,
        name: name || 'Recruiter User',
        phone: verifiedPhone,
        roles: ['recruiter'],
        activeRole: 'recruiter',
        isPhoneVerified: true,
        isEmailVerified: true,
      });

      if (password) {
        user.password = password; // Will be hashed in pre-save hook
        user.hasPassword = true;
        user.authProvider = 'email';
      }
      await saveUser(user);
      isNewUser = true;
    } else {
      const existingRole = user.roles && user.roles[0] ? user.roles[0] : (user.role || 'another role');
      if (existingRole !== 'recruiter' && !user.roles.includes('admin') && !user.roles.includes('manager')) {
        return res.status(400).json({ 
          success: false, 
          message: `This email or phone is already registered as a ${existingRole}. Please use a different email or phone to register as a recruiter.` 
        });
      }

      user.isPhoneVerified = true;
      user.isEmailVerified = true;
      user.phone = verifiedPhone;
      user.email = verifiedEmail;
      
      user.activeRole = 'recruiter';

      if (password) {
        user.password = password;
        user.hasPassword = true;
        if (user.authProvider !== 'email') {
          user.authProvider = 'email';
        }
      }

      await saveUser(user);
    }

    // Ensure Profile and Subscription
    if (user.activeRole === 'recruiter') {
      const profile = await ensureRoleProfile(user._id, 'recruiter');
      if (profile) {
        if (companyName) profile.companyName = companyName;
        if (industry) profile.industry = industry;
        await saveRecruiterProfile(profile);
      }
      await ensureRoleSubscription(user, 'recruiter', { startDate: user.createdAt });
    }

    const authPayload = buildAuthPayload(user, { recruiterProfileId: user.recruiterProfileId }, 'recruiter');

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    res.cookie("token", authPayload.token, cookieOptions);

    return res.json({
      success: true,
      message: 'Dual verification successful.',
      isNewUser,
      token: authPayload.token,
      user: authPayload,
    });

  } catch (err) {
    console.error('[RecruiterDiscovery VerifyDual] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};

module.exports = {
  sendEmailOtp,
  verifyDualRecruiter
};
