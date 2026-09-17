const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { generateReferralCode } = require("../utils/generateReferralCode");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    phone_hash: { type: String, index: true, sparse: true },
    email_hash: { type: String, index: true, sparse: true },
    source_profile_url: { type: String, sparse: true },
    countryCode: {
      type: String,
      trim: true,
      default: "",
    },
    nationalNumber: {
      type: String,
      trim: true,
      default: "",
    },
    fullPhone: {
      type: String,
      trim: true,
      default: "",
    },
    password: { type: String, minlength: 6, select: false },
    hasPassword: { type: Boolean, default: false },
    roles: [
      { type: String, enum: ["provider", "recruiter", "admin", "manager", "partner"] },
    ],
    activeRole: {
      type: String,
      enum: ["provider", "recruiter", "admin", "manager", "partner"],
    },
    // Legacy field kept temporarily for old records. Avoid using in new logic.
    role: {
      type: String,
      enum: ["provider", "recruiter", "admin", "manager", "partner"],
      required: false,
      select: false,
    },
    referredByPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdByPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referralCodeUsed: { type: String, default: "" },
    source: {
      type: String,
      enum: ["direct", "partner", "referral_link"],
      default: "direct",
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    referredUsersCount: { type: Number, default: 0 },
    partnerStatus: {
      type: String,
      enum: ["active", "suspended", "blocked", "pending"],
      default: "active",
    },
    firstSubscriptionCompleted: { type: Boolean, default: false },
    avatar: { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    profilePhotoApproval: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
      pendingUrl: { type: String, default: "" },
      approvedUrl: { type: String, default: "" },
      rejectionReason: { type: String, default: "" },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      reviewedAt: { type: Date, default: null },
    },
    resumeApproval: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
      pendingUrl: { type: String, default: "" },
      approvedUrl: { type: String, default: "" },
      rejectionReason: { type: String, default: "" },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      reviewedAt: { type: Date, default: null },
    },
    authProvider: {
      type: String,
      enum: ["email", "google", "phone", "whatsapp"],
      default: "email",
    },
    googleId: { type: String, unique: true, sparse: true },
    firebaseUid: { type: String, unique: true, sparse: true },
    isVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    emailOtp: { type: String, default: "" },
    emailOtpExpires: { type: Date, default: null },
    unlockOtp: { type: String, default: "" },
    unlockOtpExpires: { type: Date, default: null },
    whatsappConsent: { type: Boolean, default: false },
    isPublicProfile: { type: Boolean, default: false },
    whatsappNumber: { type: String, default: "" },
    isWhatsappSameAsMobile: { type: Boolean, default: true },
    whatsappAlerts: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    termsAccepted: { type: Boolean, default: false },
    lastLogin: { type: Date },
    deviceInfo: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    latitude: { type: Number },
    longitude: { type: Number },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: undefined,
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
    timezone: { type: String, trim: true },
    cityName: { type: String, trim: true },
    // Localization
    locale: {
      type: String,
      trim: true,
      default: "en",
    },
    preferredLanguage: {
      type: String,
      trim: true,
      default: "en",
    },
    country: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    // Subscription validity
    accountExpiresAt: { type: Date },
    renewalReminderSent: { type: Boolean, default: false },
    renewalReminder2Sent: { type: Boolean, default: false },
    // Badge
    subscriptionBadge: { type: String, default: "" },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "approved",
    },
    approvedAt: { type: Date, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: { type: String, default: "" },
    roleIntent: {
      type: String,
      enum: ["provider", "recruiter", "both"],
      default: "provider",
    },
    panelAccess: {
      provider: {
        enabled: { type: Boolean, default: true },
        source: {
          type: String,
          enum: ["free_plan", "paid_plan", "admin", "none"],
          default: "none",
        },
      },
      recruiter: {
        enabled: { type: Boolean, default: true },
        source: {
          type: String,
          enum: ["free_plan", "paid_plan", "admin", "none"],
          default: "none",
        },
      },
    },
    activePanel: {
      type: String,
      enum: ["provider", "recruiter"],
      default: null,
    },
    // --- Referral Fields ---
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referredByCode: { type: String, default: "" },
    referrerType: {
      type: String,
      enum: ["user", "partner", "admin", null],
      default: null,
    },
    firstRegisteredRole: {
      type: String,
      enum: ["provider", "recruiter"],
      default: null,
    },
    providerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProviderProfile",
      default: null,
    },
    recruiterProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecruiterProfile",
      default: null,
    },
    referralWalletBalance: { type: Number, default: 0 },
    totalReferralCommission: { type: Number, default: 0 },
    totalReferrals: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "blocked", "pending"],
      default: "active",
    },
    commissionBalance: { type: Number, default: 0 },
    signupCashbackCredited: { type: Boolean, default: false },
    signupCashbackCreditedAt: { type: Date, default: null },
    bankDetails: {
      accountHolderName: { type: String },
      accountNumber: { type: String },
      upiId: { type: String },
      qrCodeUrl: { type: String }, // Cloudinary URL
    },
    phoneVerification: {
      otp: { type: String },
      expiresAt: { type: Date },
      verified: { type: Boolean, default: false },
      lastVerifiedNumber: { type: String },
    },
    claimToken: { type: String, sparse: true, index: true },
    phoneHistory: [
      {
        phone: { type: String },
        countryCode: { type: String },
        nationalNumber: { type: String },
        fullPhone: { type: String },
        changedAt: { type: Date, default: Date.now }
      }
    ],
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date,
    magicLinkToken: String,
    magicLinkExpires: Date,
  },
  { timestamps: true },
);

// ----------- Field Encryption ----------
const fieldEncryption = require('mongoose-field-encryption').fieldEncryption;
userSchema.plugin(fieldEncryption, {
  fields: [
    'bankDetails.accountHolderName',
    'bankDetails.accountNumber',
    'bankDetails.upiId',
  ],
  secret: process.env.ENCRYPTION_SECRET,
});

userSchema.pre("validate", function (next) {
  const lat = Number(this.latitude);
  const lng = Number(this.longitude);

  const hasValidCoordinates =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  if (hasValidCoordinates) {
    this.location = {
      type: "Point",
      coordinates: [lng, lat],
    };
  } else {
    this.location = undefined;
  }

  if (!Array.isArray(this.roles)) this.roles = [];

  if (!this.activeRole) {
    this.activeRole = this.roles[0] || this.role || null;
  }

  if (this.activeRole && !this.roles.includes(this.activeRole)) {
    this.roles.push(this.activeRole);
  }

  if (this.roles.length === 0 && this.role) {
    this.roles = [this.role];
    this.activeRole = this.role;
  }

  if (this.activeRole) {
    this.role = this.activeRole;
  }

  if (!this.roleIntent) {
    const hasProvider =
      this.roles.includes("provider") || this.role === "provider";
    const hasRecruiter =
      this.roles.includes("recruiter") || this.role === "recruiter";
    if (hasProvider && hasRecruiter) this.roleIntent = "both";
    else if (hasRecruiter) this.roleIntent = "recruiter";
    else if (hasProvider) this.roleIntent = "provider";
  }

  if (this.isNew && !this.panelAccess) {
    this.panelAccess = {
      provider: { enabled: true, source: "free_plan" },
      recruiter: { enabled: true, source: "free_plan" },
    };
  }
  // Only auto-approve on brand-new user creation.
  // Admin-set statuses (suspended, blocked, rejected) must never be overridden.
  if (this.isNew && !this.approvalStatus) {
    this.approvalStatus = "approved";
  }

  if (this.fullPhone) {
    this.phone = this.fullPhone;
  } else if (this.phone) {
    const { parsePhoneString } = require("../utils/phoneValidation");
    const parsed = parsePhoneString(this.phone);
    this.countryCode = parsed.countryCode;
    this.nationalNumber = parsed.nationalNumber;
    this.fullPhone = parsed.fullPhone;
    this.phone = parsed.fullPhone;
  }

  if (this.phone === "") {
    this.phone = undefined;
  }

  next();
});

userSchema.pre("save", async function (next) {
  // Generate referral code if not present
  if (!this.referralCode) {
    this.referralCode = generateReferralCode();
  }

  if (!this.isModified("password") || !this.password) return next();

  // Prevent re-hashing if already a bcrypt hash
  if (
    typeof this.password === "string" &&
    (this.password.startsWith("$2a$") ||
      this.password.startsWith("$2b$") ||
      this.password.startsWith("$2y$"))
  ) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.hasPassword = true;
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = require("crypto").randomBytes(32).toString("hex");

  this.passwordResetToken = require("crypto")
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

userSchema.methods.createMagicLinkToken = function () {
  const token = require("crypto").randomBytes(32).toString("hex");

  this.magicLinkToken = require("crypto")
    .createHash("sha256")
    .update(token)
    .digest("hex");

  this.magicLinkExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

  return token;
};

userSchema.index({ roles: 1 });
userSchema.index({ activeRole: 1 });
userSchema.index({ status: 1 });
userSchema.index({ approvalStatus: 1 });
userSchema.index({ location: "2dsphere" }, { sparse: true });
userSchema.index({ phone_hash: 1, source_profile_url: 1 }, { unique: true, sparse: true });

// Pre-save hook to generate hashes for duplicate checking
const crypto = require('crypto');
userSchema.pre('save', function(next) {
  if (this.isModified('phone') && this.phone) {
    this.phone_hash = crypto.createHash('sha256').update(this.phone.trim()).digest('hex');
  }
  if (this.isModified('email') && this.email) {
    this.email_hash = crypto.createHash('sha256').update(this.email.trim().toLowerCase()).digest('hex');
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
