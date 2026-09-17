/**
 * candidateViewController.js
 * Handles secure locked/unlocked candidate profile views for recruiters.
 *
 * Security principle: The API returns DIFFERENT data depending on access level.
 * Frontend never receives private data before unlock.
 */

const { findProviderProfileByUserId } = require('../services/providerProfilePersistenceService');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { getCandidateViewAccess, buildLockedResponse, buildUnlockedResponse } = require('../services/candidateAccessService');
const { generateAndSaveOtp, verifyOtp, maskTarget, detectChannel } = require('../services/otpService');
const { sendOtpEmail } = require('../services/resendOtpService');
const { markLatestOtpVerified } = require('../services/auditPersistenceService');
const {
  findProfileUnlock,
  incrementSubscriptionUnlockUsage,
  upsertProfileUnlock,
} = require('../services/billingPersistenceService');

// ─── GET /api/recruiter/candidates/:providerId/view ───────────────────────────
/**
 * Returns locked or unlocked candidate data based on access check.
 * No full private data is ever returned if access is locked.
 */
const getCandidateView = async (req, res) => {
  try {
    const recruiterId = req.user._id;
    const { providerId } = req.params;

    // Get provider profile + user
    const providerProfile = await findProviderProfileByUserId(providerId);
    const providerUser = withLegacyId(await prisma.user.findUnique({
      where: { id: String(providerId) },
      select: { id: true, name: true, email: true, phone: true, whatsappNumber: true, avatar: true },
    }));

    if (!providerProfile || !providerUser) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    // Provider must be active and approved
    if (!providerProfile.isApproved || providerProfile.approvalAction === 'rejected') {
      return res.status(403).json({ success: false, message: 'This provider profile is not available.' });
    }

    // Check access level
    const accessResult = await getCandidateViewAccess({
      recruiterId,
      providerId,
      recruiterUser: req.user,
    });

    if (accessResult.access === 'unlocked') {
      return res.json({
        access: 'unlocked',
        candidate: buildUnlockedResponse(providerProfile, providerUser),
        unlockRequired: null,
      });
    }

    // Locked — return only partial safe data
    return res.json({
      access: 'locked',
      candidate: buildLockedResponse(providerProfile, providerUser),
      unlockRequired: accessResult.unlockRequired,
    });
  } catch (err) {
    console.error('[CandidateView] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load candidate profile.' });
  }
};

// ─── POST /api/recruiter/candidates/:providerId/request-unlock ────────────────
/**
 * Checks plan eligibility and sends OTP to initiate unlock.
 */
const requestUnlock = async (req, res) => {
  try {
    const recruiterId = req.user._id;
    const { providerId } = req.params;
    const { phone, email } = req.body;

    // Recruiter must not be suspended
    if (req.user.isBlocked || req.user.approvalStatus === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account is suspended. You cannot unlock profiles.' });
    }

    // Check active plan
    const { getActiveSubscription } = require('../middleware/subscription');
    const { subscription, plan } = await getActiveSubscription(recruiterId, 'recruiter');

    if (!plan || plan.price === 0 || plan.slug === 'free') {
      return res.status(403).json({
        success: false,
        code: 'PLAN_REQUIRED',
        message: 'A paid plan is required to unlock candidate profiles.',
        unlockRequired: { planRequired: true, otpRequired: false, limitExceeded: false },
      });
    }

    // Check contact limit
    const contactLimit = Number(plan.contactLimit || 0);
    const usedContacts = Number(subscription?.usage?.contactsViewed || 0);
    if (contactLimit > 0 && usedContacts >= contactLimit) {
      return res.status(403).json({
        success: false,
        code: 'LIMIT_EXCEEDED',
        message: 'You have reached your contact view limit. Please upgrade your plan.',
        unlockRequired: { planRequired: false, otpRequired: false, limitExceeded: true },
      });
    }

    // Check if already unlocked with valid OTP
    const existing = await findProfileUnlock(recruiterId, providerId);
    if (existing && existing.otpVerified && (!existing.expiresAt || new Date() < new Date(existing.expiresAt))) {
      return res.json({ success: true, alreadyUnlocked: true, message: 'Profile already unlocked.' });
    }

    // Use recruiter's phone/email from user object or body
    const targetPhone = phone || req.user.phone || null;
    const targetEmail = email || req.user.email || null;

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgent = req.headers['user-agent'] || '';

    const { otp, channel, target, otpDoc } = await generateAndSaveOtp({
      userId: recruiterId,
      purpose: 'unlock_profile',
      phone: targetPhone,
      email: targetEmail,
      ipAddress,
      userAgent,
    });

    // Deliver OTP (email only; phone uses Firebase on frontend)
    if (channel === 'email') {
      const emailResult = await sendOtpEmail({ to: target, otp, purpose: 'unlock_profile' });
      if (!emailResult.success) {
        return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
      }
    }

    return res.json({
      success: true,
      channel,
      maskedTarget: maskTarget(target),
      requiresFirebase: channel === 'phone',
      expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
      message: `OTP sent to ${maskTarget(target)}. Enter it below to unlock this profile.`,
    });
  } catch (err) {
    console.error('[RequestUnlock] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not initiate unlock.' });
  }
};

// ─── POST /api/recruiter/candidates/:providerId/verify-unlock-otp ─────────────
/**
 * Verifies OTP and creates/updates the ProfileUnlock record.
 */
const verifyUnlockOtp = async (req, res) => {
  try {
    const recruiterId = req.user._id;
    const { providerId } = req.params;
    const { otp, firebaseIdToken, target } = req.body;

    let otpVerified = false;

    if (firebaseIdToken) {
      // Firebase phone auth verification
      const { verifyFirebaseIdToken } = require('../services/firebaseOtpService');
      const fbResult = await verifyFirebaseIdToken(firebaseIdToken);
      if (!fbResult.success) {
        return res.status(400).json({ success: false, code: 'FIREBASE_VERIFY_FAILED', message: 'Phone verification failed. Please try again.' });
      }
      // Mark OTP doc as verified
      await markLatestOtpVerified({ userId: recruiterId, purpose: 'unlock_profile' });
      otpVerified = true;
    } else {
      // Email OTP verification
      const result = await verifyOtp({ userId: recruiterId, purpose: 'unlock_profile', target, otp: String(otp) });
      if (!result.success) {
        return res.status(400).json(result);
      }
      otpVerified = true;
    }

    if (!otpVerified) {
      return res.status(400).json({ success: false, message: 'OTP verification failed.' });
    }

    // Get active plan for reference
    const { getActiveSubscription } = require('../middleware/subscription');
    const { subscription, plan } = await getActiveSubscription(recruiterId, 'recruiter');

    // Set unlock expiry (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgent = req.headers['user-agent'] || '';

    // Upsert the ProfileUnlock record
    await upsertProfileUnlock({
        recruiterId,
        providerId,
        purpose: 'full_profile',
        otpVerified: true,
        planId: plan?._id || null,
        sourcePlanId: plan?._id || null,
        subscriptionId: subscription?._id || null,
        unlockedAt: new Date(),
        expiresAt,
        ipAddress,
        userAgent,
    });

    // Increment usage counter on subscription and decrement credits remaining
    if (subscription) {
      await incrementSubscriptionUnlockUsage(subscription._id);
    }

    // Also decrement unlocksRemaining on RecruiterProfile
    await prisma.recruiterProfile.updateMany({
      where: { user: String(recruiterId) },
      data: { unlocksRemaining: { decrement: 1 } },
    });

    console.log(`[UnlockOTP] Recruiter=${recruiterId} unlocked Provider=${providerId}`);

    return res.json({
      success: true,
      message: 'Profile unlocked successfully!',
      unlockedUntil: expiresAt,
    });
  } catch (err) {
    console.error('[VerifyUnlockOTP] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Unlock verification failed.' });
  }
};

// ─── GET /api/recruiter/candidates/:providerId/full ───────────────────────────
/**
 * Returns full profile ONLY if valid unlock record exists.
 */
const getCandidateFull = async (req, res) => {
  try {
    const recruiterId = req.user._id;
    const { providerId } = req.params;

    // Verify unlock record
    const unlockRecord = await findProfileUnlock(recruiterId, providerId);

    if (!unlockRecord || !unlockRecord.otpVerified) {
      return res.status(403).json({
        success: false,
        code: 'UNLOCK_REQUIRED',
        message: 'Please unlock this profile first.',
      });
    }

    if (unlockRecord.expiresAt && new Date() > new Date(unlockRecord.expiresAt)) {
      return res.status(403).json({
        success: false,
        code: 'UNLOCK_EXPIRED',
        message: 'Your unlock session has expired. Please re-verify.',
      });
    }

    const providerProfile = await findProviderProfileByUserId(providerId);
    const providerUser = withLegacyId(await prisma.user.findUnique({
      where: { id: String(providerId) },
      select: { id: true, name: true, email: true, phone: true, whatsappNumber: true, avatar: true },
    }));

    if (!providerProfile || !providerUser) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    return res.json({
      access: 'unlocked',
      candidate: buildUnlockedResponse(providerProfile, providerUser),
    });
  } catch (err) {
    console.error('[CandidateFull] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load full candidate profile.' });
  }
};

module.exports = { getCandidateView, requestUnlock, verifyUnlockOtp, getCandidateFull };
