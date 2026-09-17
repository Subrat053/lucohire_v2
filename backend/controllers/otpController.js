/**
 * otpController.js
 * Handles OTP send, verify, and resend API endpoints.
 *
 * For Indian phone (+91): sends via Firebase Phone Auth (frontend-driven SMS).
 *   - Backend only generates the record; the actual SMS is sent by Firebase client SDK.
 *   - On verify, backend validates the Firebase idToken, then marks OTP as verified.
 *
 * For international/email: sends via Resend email API.
 */

const { generateAndSaveOtp, verifyOtp, resendOtp, maskTarget, detectChannel } = require('../services/otpService');
const { sendOtpEmail } = require('../services/resendOtpService');
const { verifyFirebaseIdToken } = require('../services/firebaseOtpService');
const { markLatestOtpVerified } = require('../services/auditPersistenceService');

// ─── POST /api/otp/send ───────────────────────────────────────────────────────
const sendOtp = async (req, res) => {
  try {
    const { purpose, phone, email } = req.body;
    const userId = req.user._id;

    const VALID_PURPOSES = [
      'login', 'register', 'unlock_profile', 'payment_verification',
      'sensitive_action', 'change_phone', 'change_email', 'enable_2fa', 'disable_2fa',
    ];
    if (!purpose || !VALID_PURPOSES.includes(purpose)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP purpose.' });
    }

    const detected = detectChannel(phone, email);
    if (!detected) {
      return res.status(400).json({ success: false, message: 'Phone number or email required.' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgent = req.headers['user-agent'] || '';

    const { otp, channel, target, otpDoc } = await generateAndSaveOtp({
      userId,
      purpose,
      phone,
      email,
      ipAddress,
      userAgent,
    });

    // Deliver OTP based on channel
    if (channel === 'email') {
      const emailResult = await sendOtpEmail({ to: target, otp, purpose });
      if (!emailResult.success) {
        // Don't expose internal error details
        console.error('[OTP Send] Email delivery failed:', emailResult.error);
        return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
      }
    }
    // For phone channel: Firebase client SDK handles SMS delivery using reCAPTCHA + signInWithPhoneNumber.
    // Backend only stores the OTP record. On verify, the frontend sends the Firebase idToken.

    return res.json({
      success: true,
      channel,
      maskedTarget: maskTarget(target),
      // For phone OTP: inform frontend to use Firebase phone auth flow
      requiresFirebase: channel === 'phone',
      // Expose config for frontend countdown
      expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
      resendRemaining: Math.max(0, parseInt(process.env.OTP_RESEND_LIMIT || '3', 10) - (otpDoc.resendCount || 0)),
    });
  } catch (err) {
    console.error('[OTP Send] Error:', err.message);
    return res.status(500).json({ success: false, message: 'OTP send failed. Please try again.' });
  }
};

// ─── POST /api/otp/verify ─────────────────────────────────────────────────────
const verifyOtpHandler = async (req, res) => {
  try {
    const { purpose, target, otp, firebaseIdToken } = req.body;
    const userId = req.user._id;

    if (!purpose) {
      return res.status(400).json({ success: false, message: 'Purpose is required.' });
    }

    // Phone OTP: verify Firebase ID token (Firebase did the SMS delivery + verification)
    if (firebaseIdToken) {
      const fbResult = await verifyFirebaseIdToken(firebaseIdToken);
      if (!fbResult.success) {
        return res.status(400).json({ success: false, code: 'FIREBASE_VERIFY_FAILED', message: 'Phone OTP verification failed. Please try again.' });
      }

      // Mark the OTP record as verified
      const result = await verifyOtp({ userId, purpose, target: fbResult.phone, otp: 'FIREBASE_VERIFIED' });

      // For Firebase flow, we bypass hash check — mark verified directly
      await markLatestOtpVerified({ userId, purpose });

      return res.json({ success: true, code: 'OTP_VERIFIED', message: 'Phone verified successfully.' });
    }

    // Email OTP: verify the 6-digit code against stored hash
    if (!otp || String(otp).length !== 6) {
      return res.status(400).json({ success: false, message: 'A 6-digit OTP is required.' });
    }

    const result = await verifyOtp({ userId, purpose, target, otp: String(otp) });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      code: 'OTP_VERIFIED',
      message: 'OTP verified successfully.',
    });
  } catch (err) {
    console.error('[OTP Verify] Error:', err.message);
    return res.status(500).json({ success: false, message: 'OTP verification failed.' });
  }
};

// ─── POST /api/otp/resend ─────────────────────────────────────────────────────
const resendOtpHandler = async (req, res) => {
  try {
    const { purpose } = req.body;
    const userId = req.user._id;

    if (!purpose) {
      return res.status(400).json({ success: false, message: 'Purpose is required.' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgent = req.headers['user-agent'] || '';

    const { otp, channel, target, otpDoc } = await resendOtp({ userId, purpose, ipAddress, userAgent });

    if (channel === 'email') {
      const emailResult = await sendOtpEmail({ to: target, otp, purpose });
      if (!emailResult.success) {
        console.error('[OTP Resend] Email delivery failed:', emailResult.error);
        return res.status(500).json({ success: false, message: 'Failed to resend OTP email. Please try again.' });
      }
    }

    return res.json({
      success: true,
      channel,
      maskedTarget: maskTarget(target),
      requiresFirebase: channel === 'phone',
      resendCount: otpDoc.resendCount,
      resendRemaining: Math.max(0, parseInt(process.env.OTP_RESEND_LIMIT || '3', 10) - otpDoc.resendCount),
      expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
    });
  } catch (err) {
    console.error('[OTP Resend] Error:', err.message);
    // Expose safe user-facing message
    const isUserError = err.message.includes('limit') || err.message.includes('verified') || err.message.includes('found');
    return res.status(isUserError ? 400 : 500).json({
      success: false,
      message: isUserError ? err.message : 'Failed to resend OTP. Please try again.',
    });
  }
};

module.exports = { sendOtp, verifyOtpHandler, resendOtpHandler };
