/**
 * resendOtpService.js
 * Sends OTP via email using the Resend API.
 * Used for international users (non +91 phone or email-only users).
 */

let resendClient = null;

function getResendClient() {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[ResendOTP] RESEND_API_KEY not set — email OTP will not be sent.');
    return null;
  }

  try {
    const { Resend } = require('resend');
    resendClient = new Resend(apiKey);
  } catch (err) {
    console.error('[ResendOTP] Failed to init Resend client:', err.message);
    return null;
  }

  return resendClient;
}

/**
 * Send OTP email via Resend.
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit OTP (plain, only for delivery)
 * @param {string} purpose - Human-readable purpose string
 * @returns {{ success: boolean, error?: string }}
 */
async function sendOtpEmail({ to, otp, purpose = 'verification' }) {
  const client = getResendClient();

  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@lucohire.com';
  const fromName  = process.env.EMAIL_FROM_NAME  || 'Lucohire';
  const expiryMin = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);

  const purposeLabel = {
    login: 'Login',
    register: 'Registration',
    unlock_profile: 'Profile Unlock',
    payment_verification: 'Payment Verification',
    sensitive_action: 'Account Action',
    change_phone: 'Phone Change',
    change_email: 'Email Change',
    enable_2fa: '2FA Setup',
    disable_2fa: '2FA Removal',
  }[purpose] || 'Verification';

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#1a1a2e;margin-bottom:8px;">Your ${purposeLabel} OTP</h2>
      <p style="color:#555;margin-bottom:24px;">Use the code below to complete your ${purposeLabel.toLowerCase()}.</p>
      <div style="background:#fff;border:2px solid #e2e8f0;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
        <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#6366f1;">${otp}</span>
      </div>
      <p style="color:#888;font-size:13px;">This code expires in <strong>${expiryMin} minutes</strong>. Do not share it with anyone.</p>
      <p style="color:#aaa;font-size:12px;margin-top:24px;">If you did not request this, please ignore this email.</p>
    </div>
  `;

  if (!client) {
    // Dev mode — log to console instead of sending
    console.log(`[ResendOTP][DEV] Would send to ${to}: OTP = ${otp} (purpose: ${purpose})`);
    return { success: true, devMode: true };
  }

  try {
    const result = await client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: `${otp} is your ${fromName} ${purposeLabel} code`,
      html: htmlBody,
    });

    if (result.error) {
      console.error('[ResendOTP] Send failed:', result.error);
      return { success: false, error: result.error.message || 'Email send failed' };
    }

    console.log(`[ResendOTP] Sent to ${to} (id: ${result.data?.id})`);
    return { success: true, messageId: result.data?.id };
  } catch (err) {
    console.error('[ResendOTP] Exception:', err.message);
    return { success: false, error: 'Email delivery failed. Please try again.' };
  }
}

module.exports = { sendOtpEmail };
