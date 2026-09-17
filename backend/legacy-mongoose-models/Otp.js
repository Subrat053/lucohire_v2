const mongoose = require("mongoose");

/**
 * Full-security OTP model.
 * - OTP is NEVER stored in plain text — only bcrypt hash.
 * - TTL index auto-deletes expired documents.
 */
const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    // Purpose of the OTP
    purpose: {
      type: String,
      enum: [
        "login",
        "register",
        "unlock_profile",
        "payment_verification",
        "sensitive_action",
        "change_phone",
        "change_email",
        "enable_2fa",
        "disable_2fa",
      ],
      required: true,
    },
    // Delivery channel
    channel: {
      type: String,
      enum: ["phone", "email"],
      required: true,
    },
    // Phone number or email address
    target: { type: String, required: true, trim: true },
    // E.164 country code (e.g. '+91')
    countryCode: { type: String, default: "" },
    // bcrypt hash of the 6-digit OTP
    otpHash: { type: String, required: true },
    // Expiry time (used by TTL index)
    expiresAt: { type: Date, required: true },
    // Resend tracking
    resendCount: { type: Number, default: 0 },
    resendWindowStart: { type: Date, default: null },
    // Wrong-attempt tracking
    attempts: { type: Number, default: 0 },
    blockedUntil: { type: Date, default: null },
    // Set when OTP is successfully verified
    verifiedAt: { type: Date, default: null },
    // Audit metadata
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    // AI provider used for audit (reserved for future use)
    providerUsed: { type: String, default: "" },
  },
  { timestamps: true },
);

// Auto-delete expired OTP documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// Retain OTP audit logs for 30 days before cleanup
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Fast lookup for verify/resend flows
otpSchema.index({ userId: 1, purpose: 1 });
otpSchema.index({ target: 1, purpose: 1 });

module.exports = mongoose.model("Otp", otpSchema);
