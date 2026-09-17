const User = require("../models/User");
const axios = require("axios");
const ProviderProfile = require("../models/ProviderProfile");
const RecruiterProfile = require("../models/RecruiterProfile");
const UserSubscription = require("../models/UserSubscription");
const Otp = require("../models/Otp");
const generateToken = require("../utils/generateToken");
const { OAuth2Client } = require("google-auth-library");
const {
  generateOTP,
  sendPhoneOTP,
  sendEmailOTP,
  sendWhatsAppMessage,
} = require("../utils/messaging");
const { assignFreePlan } = require("./subscriptionController");
const { creditSignupCashback } = require("../services/cashbackService");

const {
  SUPPORTED_LOCALES,
  detectLocaleFromRequest,
  normalizeCountryCode,
  normalizeCurrencyCode,
  normalizeLanguageCode,
} = require("../utils/geoLocation");
const {
  processRegistrationReferral,
} = require("../services/referralTrackingService");
const crypto = require("crypto");
const { sendMail } = require("../services/mailService");
const { sanitizeString, sanitizeEmail, sanitizePhone } = require("../utils/sanitize");


const VALID_ROLES = ["provider", "recruiter"];
const OTP_VALIDITY_MS = 10 * 60 * 1000;
const VALIDITY_DAYS = parseInt(process.env.PROFILE_VALIDITY_DAYS || 365, 10);

const admin = require("../config/firebaseAdmin");

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleOAuthClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const verifyFirebaseIdToken = async (firebaseToken) => {
  try {
    const decoded = await admin.auth().verifyIdToken(firebaseToken);
    return {
      uid: decoded.uid,
      phoneNumber: decoded.phone_number || decoded.phoneNumber || null,
      email: decoded.email || null,
      name: decoded.name || null,
      picture: decoded.picture || null,
    };
  } catch (error) {
    const apiKey =
      process.env.FIREBASE_WEB_API_KEY || process.env.FIREBASE_API_KEY;

    if (!apiKey) {
      throw error;
    }

    try {
      const { data } = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        { idToken: firebaseToken },
        { timeout: 8000 },
      );

      const user = Array.isArray(data?.users) ? data.users[0] : null;

      if (!user?.localId) {
        throw new Error("Firebase lookup returned no user");
      }

      return {
        uid: user.localId,
        phoneNumber: user.phoneNumber || null,
        email: user.email || null,
        name: user.displayName || null,
        picture: user.photoUrl || null,
      };
    } catch (lookupError) {
      lookupError.cause = error;
      throw lookupError;
    }
  }
};

const deriveRoleIntent = (roles = []) => {
  const hasProvider = roles.includes("provider");
  const hasRecruiter = roles.includes("recruiter");
  if (hasProvider && hasRecruiter) return "both";
  if (hasRecruiter) return "recruiter";
  return "provider";
};

const { generateAndSaveOtp } = require('../services/otpService');

const issueEmailOtp = async (user, purpose = 'register') => {
  const { otp } = await generateAndSaveOtp({
    userId: user._id,
    purpose,
    email: user.email,
    channel: 'email',
  });
  await sendEmailOTP(user.email, otp);
};

const normalizeRoles = (user, preferredRole = null) => {
  const roles = Array.isArray(user.roles) ? [...new Set(user.roles)] : [];
  if (user.role && !roles.includes(user.role)) roles.push(user.role);
  if (user.activeRole && !roles.includes(user.activeRole))
    roles.push(user.activeRole);

  let activeRole = user.activeRole || user.activePanel || user.role || roles[0] || null;

  if (roles.includes("admin")) activeRole = "admin";
  else if (roles.includes("manager")) activeRole = "manager";

  return { roles, activeRole };
};

const buildPlanSummary = async (userId, role) => {
  const subscription = await UserSubscription.findOne({
    userId,
    role,
    status: "active",
    endDate: { $gt: new Date() },
  }).populate("planId");

  if (!subscription || !subscription.planId) return null;
  const plan = subscription.planId;
  return {
    planId: plan._id,
    code: plan.code || plan.slug,
    name: plan.name,
    planType: plan.planType || (Number(plan.price || 0) > 0 ? "paid" : "free"),
    price: plan.price,
    billingCycle: plan.billingCycle || "monthly",
    durationDays: plan.durationDays || plan.duration,
    contactLimit: plan.contactLimit || null,
    visibility: plan.visibility || null,
    limits: plan.limits || null,
    status: subscription.status,
    startedAt: subscription.startDate,
    expiresAt: subscription.endDate,
  };
};

const parseRoleSelection = (payload = {}) => {
  const candidateRoles = [];
  if (Array.isArray(payload.roles)) candidateRoles.push(...payload.roles);
  if (typeof payload.role === "string") candidateRoles.push(payload.role);

  const roles = [
    ...new Set(candidateRoles.filter((role) => VALID_ROLES.includes(role))),
  ];
  const requestedActiveRole = payload.activeRole;
  const activeRole = roles.includes(requestedActiveRole)
    ? requestedActiveRole
    : roles[0] || null;

  return { roles, activeRole };
};

const ensureRoleProfile = async (userId, role) => {
  if (role === "provider") {
    let profile = await ProviderProfile.findOne({ user: userId });
    if (!profile) {
      profile = await ProviderProfile.create({
        user: userId,
        city: "",
        profileExpiresAt: new Date(
          Date.now() + VALIDITY_DAYS * 24 * 60 * 60 * 1000,
        ),
      });
    }
    return profile;
  }

  if (role === "recruiter") {
    let profile = await RecruiterProfile.findOne({ user: userId });
    if (!profile) {
      profile = await RecruiterProfile.create({
        user: userId,
        freeViewResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        freeUnlockResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        unlocksRemaining: 2,
        unlockPackSize: 2,
        profileExpiresAt: new Date(
          Date.now() + VALIDITY_DAYS * 24 * 60 * 60 * 1000,
        ),
      });
    }
    return profile;
  }

  return null;
};

const ensureRoleSubscription = async (user, role, options = {}) => {
  if (!VALID_ROLES.includes(role)) return;

  if (role === 'provider') {
    try {
      const providerPlanService = require('../services/providerPlanService');
      const existing = await providerPlanService.getActiveProviderSubscription(user._id);
      if (!existing) {
        await providerPlanService.assignDefaultProviderPlan(user._id);
      }
    } catch (err) {
      console.error('Failed to assign default provider subscription on registration/login:', err.message);
    }
  } else {
    const existing = await UserSubscription.findOne({
      userId: user._id,
      role,
      status: "active",
      endDate: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (existing) return;

    await assignFreePlan(user._id, role);
  }
};

const getProfileByRole = async (userId, role) => {
  if (role === "provider") return ProviderProfile.findOne({ user: userId });
  if (role === "recruiter") return RecruiterProfile.findOne({ user: userId });
  return null;
};

const buildAuthPayload = (user, extra = {}, preferredRole = null) => {
  const { roles, activeRole } = normalizeRoles(user, preferredRole);
  const token = generateToken(user._id, activeRole);

  let cleanName = user.name || "";
  const cleanPhone = String(user.phone || "").replace(/\D/g, "");
  if (cleanPhone && cleanName && (cleanName === user.phone || cleanName === user.fullPhone || cleanName.replace(/\D/g, "") === cleanPhone)) {
    cleanName = "";
  }

  let cleanEmail = user.email || "";
  if (cleanEmail && cleanEmail.endsWith("@phone.lucohire.local")) {
    cleanEmail = "";
  }

  const hasPassword = user.hasPassword === true;

  return {
    _id: user._id,
    name: cleanName,
    email: cleanEmail,
    phone: user.phone,
    whatsappNumber: user.whatsappNumber,
    isWhatsappSameAsMobile: user.isWhatsappSameAsMobile,
    roles,
    activeRole,
    role: activeRole,
    authProvider: user.authProvider || "email",
    isVerified: user.isVerified || user.isEmailVerified || user.isPhoneVerified,
    avatar: user.avatar,
    profilePhoto: user.profilePhoto,
    profilePhotoApproval: user.profilePhotoApproval,
    country: user.country,
    currency: user.currency,
    locale: user.locale,
    preferredLanguage: user.preferredLanguage || user.locale,
    approvalStatus: user.approvalStatus || "pending",
    roleIntent: user.roleIntent || deriveRoleIntent(roles),
    hasPassword,
    panelAccess: user.panelAccess || {
      provider: { enabled: true, source: 'free_plan' },
      recruiter: { enabled: true, source: 'free_plan' },
    },
    activePanel: user.activePanel || activeRole || null,
    token,
    ...extra,
  };
};

// @desc    Register user with email
// @route   POST /api/auth/register
const registerEmail = async (req, res) => {
  try {
    const { password, firebaseToken } = req.body;
    // Sanitize all incoming string fields consistently
    const name = sanitizeString(req.body.name);
    const normalizedEmail = sanitizeEmail(req.body.email || "");
    
    const countryCode = sanitizeString(req.body.countryCode || "");
    const nationalNumber = sanitizeString(req.body.nationalNumber || "");
    let phone = sanitizePhone(req.body.phone || "");
    let isPhoneVerified = false;
    let firebaseUid = null;

    if (firebaseToken) {
      const decodedToken = await verifyFirebaseIdToken(firebaseToken);
      phone = decodedToken.phoneNumber;
      isPhoneVerified = true;
      firebaseUid = decodedToken.uid;
    } else {
      if (countryCode && nationalNumber) {
        const { isValidPhoneNumber } = require("../utils/phoneValidation");
        if (!isValidPhoneNumber(countryCode, nationalNumber)) {
          return res.status(400).json({
            success: false,
            code: "INVALID_PHONE",
            message: `Please enter a valid phone number for country code ${countryCode}.`,
          });
        }
        phone = countryCode + nationalNumber;
      } else if (phone) {
        const { parsePhoneString, isValidPhoneNumber } = require("../utils/phoneValidation");
        const parsed = parsePhoneString(phone);
        if (parsed.countryCode && !isValidPhoneNumber(parsed.countryCode, parsed.nationalNumber)) {
          return res.status(400).json({
            success: false,
            code: "INVALID_PHONE",
            message: `Please enter a valid phone number.`,
          });
        }
        phone = parsed.fullPhone;
      }
    }

    const { roles: requestedRoles, activeRole: requestedActiveRole } =
      parseRoleSelection(req.body);

    if (!name || !normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Backend validation for email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message: "Please enter a valid email address.",
      });
    }

    const targetRole = requestedActiveRole || requestedRoles[0] || 'provider';

    // Role-specific validation
    if (targetRole === 'provider') {
      const skills = req.body.skills || (req.body.providerProfile && req.body.providerProfile.skills);
      if (!skills || !Array.isArray(skills) || skills.length === 0) {
        return res.status(400).json({
          success: false,
          code: "VALIDATION_ERROR",
          message: "Please select at least one skill/speciality for Service Provider registration."
        });
      }
    } else if (targetRole === 'recruiter') {
      const companyName = req.body.companyName || (req.body.recruiterProfile && req.body.recruiterProfile.companyName);
      if (!companyName || !companyName.trim()) {
        return res.status(400).json({
          success: false,
          code: "VALIDATION_ERROR",
          message: "Company Name is required for Recruiter registration."
        });
      }
      // GST validation if entered
      const gstNumber = req.body.gstNumber || (req.body.recruiterProfile && req.body.recruiterProfile.gstNumber);
      if (gstNumber && gstNumber.trim()) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(gstNumber.trim().toUpperCase())) {
          return res.status(400).json({
            success: false,
            code: "INVALID_GST",
            message: "Invalid GST Number format. Must be a valid 15-character GSTIN."
          });
        }
      }
    }

    const userExists = await User.findOne({ email: normalizedEmail }).select(
      "+password +role",
    );

    if (userExists) {
      const existingRole = userExists.roles && userExists.roles[0] ? userExists.roles[0] : (userExists.role || 'another role');
      if (existingRole === targetRole) {
        return res.status(400).json({
          success: false,
          code: "ROLE_PROFILE_ALREADY_EXISTS",
          message: `This email is already registered with a ${targetRole} profile. Please login to your existing account.`,
        });
      } else {
        if (password) {
          const isMatch = await userExists.matchPassword(password);
          if (!isMatch) {
            return res.status(400).json({
              success: false,
              code: "INVALID_CREDENTIALS_FOR_ROLE_ADD",
              message: `This email is already registered as a ${existingRole}. Please enter the correct password to add a ${targetRole} profile, or use a different email.`,
            });
          }

          if (!userExists.roles.includes(targetRole)) {
            userExists.roles.push(targetRole);
            await userExists.save();
          }

          if (!userExists.isVerified && !userExists.isEmailVerified && !firebaseToken && targetRole !== 'provider') {
            await issueEmailOtp(userExists, 'register');
            return res.status(201).json({
              message: "OTP sent to your email. Please verify to complete registration.",
              requiresEmailVerification: true,
              email: userExists.email,
              roles: userExists.roles || [],
              activeRole: userExists.activeRole || null,
              isNewUser: false,
            });
          }

          await ensureRoleProfile(userExists._id, targetRole);
          await ensureRoleSubscription(userExists, targetRole);
          const providerPlanSummary = await buildPlanSummary(userExists._id, "provider");
          const recruiterPlanSummary = await buildPlanSummary(userExists._id, "recruiter");
          return res.status(201).json(
            buildAuthResponse(
              userExists,
              { providerPlanSummary, recruiterPlanSummary, isNewUser: false },
              targetRole,
            ),
          );
        } else {
          return res.status(400).json({
            success: false,
            code: "CROSS_ROLE_REGISTRATION_BLOCKED",
            message: `This email is already registered as a ${existingRole}. Please use a different email to register as a ${targetRole}.`,
          });
        }
      }
    }

    const detectedLocale = await detectLocaleFromRequest(req);

    // Extract referral data from request
    const { referralCode, referredBy } = req.body;

    const { parsePhoneString } = require("../utils/phoneValidation");
    const parsedPhone = parsePhoneString(phone);

    // WhatsApp validation and formatting
    const isWhatsappSame = req.body.isWhatsappSameAsMobile === true || req.body.isWhatsappSameAsMobile === 'true' || req.body.isWhatsappSameAsMobile === undefined;
    let finalWhatsappNumber = "";

    if (isWhatsappSame) {
      finalWhatsappNumber = parsedPhone.fullPhone || phone || "";
    } else if (req.body.whatsappNumber) {
      const { parsePhoneString: parseWhatsappStr, isValidPhoneNumber: isWhatsappValid } = require("../utils/phoneValidation");
      const parsedWhatsapp = parseWhatsappStr(req.body.whatsappNumber);
      if (parsedWhatsapp.countryCode && !isWhatsappValid(parsedWhatsapp.countryCode, parsedWhatsapp.nationalNumber)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_WHATSAPP",
          message: "Please enter a valid WhatsApp number.",
        });
      }
      finalWhatsappNumber = parsedWhatsapp.fullPhone || req.body.whatsappNumber;
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: parsedPhone.fullPhone || phone || "",
      countryCode: parsedPhone.countryCode || "",
      nationalNumber: parsedPhone.nationalNumber || "",
      fullPhone: parsedPhone.fullPhone || phone || "",
      whatsappNumber: finalWhatsappNumber,
      isWhatsappSameAsMobile: isWhatsappSame,
      password,
      roles: requestedRoles,
      activeRole: requestedActiveRole,
      role: requestedActiveRole || null,
      roleIntent: deriveRoleIntent(requestedRoles),
      authProvider: firebaseToken ? "phone" : "email",
      firebaseUid,
      isPhoneVerified,
      isEmailVerified: false,
      termsAccepted: true,
      ipAddress: detectedLocale.ip || req.ip,
      country: detectedLocale.country,
      currency: detectedLocale.currency,
      locale: detectedLocale.locale,
      preferredLanguage: detectedLocale.locale,
      accountExpiresAt: new Date(
        Date.now() + VALIDITY_DAYS * 24 * 60 * 60 * 1000,
      ),
      approvalStatus: "approved",
      panelAccess: {
        provider: { enabled: true, source: "free_plan" },
        recruiter: { enabled: true, source: "free_plan" },
      },
    });

    if (user.activeRole) {
      const profile = await ensureRoleProfile(user._id, user.activeRole);
      
      // Save dynamic fields to profile
      if (user.activeRole === 'provider') {
        const skills = req.body.skills || (req.body.providerProfile && req.body.providerProfile.skills);
        const city = req.body.city || req.body.location || (req.body.providerProfile && req.body.providerProfile.location);
        const experience = req.body.experience || (req.body.providerProfile && req.body.providerProfile.experience);

        if (profile) {
          if (skills) profile.skills = skills;
          if (city) profile.city = city;
          if (experience) profile.experience = experience;
          await profile.save();
        }
      } else if (user.activeRole === 'recruiter') {
        const companyName = req.body.companyName || (req.body.recruiterProfile && req.body.recruiterProfile.companyName);
        const gstNumber = req.body.gstNumber || (req.body.recruiterProfile && req.body.recruiterProfile.gstNumber);
        const companyLocation = req.body.companyLocation || (req.body.recruiterProfile && req.body.recruiterProfile.companyLocation);

        if (profile) {
          if (companyName) profile.companyName = companyName;
          if (gstNumber) profile.gstNumber = gstNumber;
          if (companyLocation) profile.city = companyLocation;
          await profile.save();
        }
      }

      await ensureRoleSubscription(user, user.activeRole, {
        startDate: user.createdAt,
      });
    }

    // Process referral code if provided (non-blocking)
    if (referralCode || referredBy) {
      const referralResult = await processRegistrationReferral({
        referralCode,
        referredBy,
        newUserId: user._id,
        role: requestedActiveRole || requestedRoles[0],
      });
      if (referralResult) {
        user.referredByPartnerId = referralResult.partnerId;
        user.referralCodeUsed = referralResult.referralCode;
        user.source = "referral_link";
        await user.save();
      }
    }

    if (!firebaseToken && targetRole !== 'provider') {
      await issueEmailOtp(user, 'register');
      return res.status(201).json({
        message: "OTP sent to your email. Please verify to complete registration.",
        requiresEmailVerification: true,
        email: user.email,
        roles: user.roles || [],
        activeRole: user.activeRole || null,
        isNewUser: true,
      });
    }

    // If Firebase Token was provided, or if it's a provider and we're skipping email OTP
    const providerPlanSummary = await buildPlanSummary(user._id, "provider");
    const recruiterPlanSummary = await buildPlanSummary(user._id, "recruiter");
    
    res.status(201).json(
      buildAuthPayload(
        user,
        { providerPlanSummary, recruiterPlanSummary, isNewUser: true },
        targetRole,
      ),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Send (or resend) registration email OTP
// @route   POST /api/auth/register/send-otp
const sendRegistrationEmailOtp = async (req, res) => {
  try {
    const normalizedEmail = (req.body.email || "").trim().toLowerCase();
    if (!normalizedEmail)
      return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.authProvider !== "email") {
      return res
        .status(404)
        .json({ message: "No email account found for this address" });
    }
    if (user.isBlocked) {
      return res
        .status(403)
        .json({ message: "Account blocked. Contact admin." });
    }
    if (user.isEmailVerified) {
      return res
        .status(400)
        .json({ message: "Email is already verified. Please login." });
    }

    await issueEmailOtp(user, 'register');
    res.json({ message: "Verification OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Confirm registration email OTP and activate account
// @route   POST /api/auth/register/verify-otp
const confirmRegistrationEmailOtp = async (req, res) => {
  try {
    const { email, otp, whatsappNumber } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password +role",
    );
    if (!user || user.authProvider !== "email") {
      return res
        .status(404)
        .json({ message: "No email account found for this address" });
    }
    if (user.isBlocked) {
      return res
        .status(403)
        .json({ message: "Account blocked. Contact admin." });
    }

    const { verifyOtp } = require('../services/otpService');
    const verifyResult = await verifyOtp({
      userId: user._id,
      purpose: 'register',
      target: normalizedEmail,
      otp,
    });

    if (!verifyResult.success) {
      return res.status(400).json({ message: verifyResult.message, code: verifyResult.code });
    }

    const normalized = normalizeRoles(user);
    user.roles = normalized.roles;
    user.activeRole = normalized.activeRole;
    user.roleIntent = user.roleIntent || deriveRoleIntent(user.roles);
    user.isEmailVerified = true;
    user.lastLogin = new Date();
    user.ipAddress = req.ip;
    if (req.body.isWhatsappSameAsMobile !== undefined) {
      user.isWhatsappSameAsMobile = req.body.isWhatsappSameAsMobile === true || req.body.isWhatsappSameAsMobile === 'true';
    }
    if (whatsappNumber) {
      user.whatsappNumber = whatsappNumber;
      user.whatsappConsent = true;
    } else if (user.isWhatsappSameAsMobile) {
      user.whatsappNumber = user.phone || "";
      user.whatsappConsent = true;
    }
    await user.save();

    if (user.activeRole) {
      await ensureRoleProfile(user._id, user.activeRole);
      await ensureRoleSubscription(user, user.activeRole);
    }

    const providerPlanSummary = await buildPlanSummary(user._id, "provider");
    const recruiterPlanSummary = await buildPlanSummary(user._id, "recruiter");
    res.json(
      buildAuthPayload(user, {
        isNewUser: true,
        providerPlanSummary,
        recruiterPlanSummary,
      }),
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password, activeRole: requestedActiveRole, role: requestedRole } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();
    const preferredRole = VALID_ROLES.includes(requestedActiveRole)
      ? requestedActiveRole
      : (VALID_ROLES.includes(requestedRole) ? requestedRole : null);

    const user = await User.findOne({ email: normalizedEmail }).select("+password roles activeRole role panelAccess isBlocked email name phone whatsappNumber isWhatsappSameAsMobile authProvider approvalStatus roleIntent activePanel country currency locale preferredLanguage avatar termsAccepted profilePhoto profilePhotoApproval");
    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "No account found with this email."
      });
    }
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: "Account disabled or blocked. Please contact administrator."
      });
    }

    if (user.authProvider !== "email" && !user.password) {
      return res.status(400).json({
        success: false,
        code: "SOCIAL_AUTH_REQUIRED",
        message: user.authProvider === "google"
          ? "This account uses Google sign-in. Please continue with Google."
          : "This account uses WhatsApp sign-in. Please continue with WhatsApp OTP.",
      });
    }

    if (preferredRole && !user.roles.includes(preferredRole) && !user.roles.includes("admin") && !user.roles.includes("manager")) {
      const actualRole = user.roles[0] || "another role";
      return res.status(403).json({
        success: false,
        code: "ROLE_MISMATCH",
        message: `You are registered as a ${actualRole}. You cannot log into the ${preferredRole} portal.`
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: "WRONG_PASSWORD",
        message: "Incorrect password. Please try again."
      });
    }

    if (!user.isEmailVerified) {
      const hasOtpHistory = await Otp.exists({
        identifier: user.email,
        type: "email",
      });

      if (hasOtpHistory) {
        await issueEmailOtp(user, 'login');
        return res.status(403).json({
          success: false,
          code: "EMAIL_NOT_VERIFIED",
          message: "Email not verified. We sent a fresh OTP to your email.",
          requiresEmailVerification: true,
          email: user.email,
        });
      }

      user.isEmailVerified = true;
    }

    const normalized = normalizeRoles(user, preferredRole);
    user.roles = normalized.roles;
    user.activeRole = normalized.activeRole;
    user.roleIntent = user.roleIntent || deriveRoleIntent(user.roles);
    user.lastLogin = new Date();
    user.ipAddress = req.ip;

    if (!user.country || !user.currency || !user.locale) {
      const detectedLocale = await detectLocaleFromRequest(req);
      user.country = user.country || detectedLocale.country;
      user.currency = user.currency || detectedLocale.currency;
      user.locale = user.locale || detectedLocale.locale;
      user.preferredLanguage = user.preferredLanguage || user.locale;
    }

    await user.save();

    if (user.activeRole) {
      await ensureRoleProfile(user._id, user.activeRole);
      await ensureRoleSubscription(user, user.activeRole);
    }

    const providerPlanSummary = await buildPlanSummary(user._id, "provider");
    const recruiterPlanSummary = await buildPlanSummary(user._id, "recruiter");
    res.json(
      buildAuthPayload(
        user,
        { providerPlanSummary, recruiterPlanSummary },
        preferredRole,
      ),
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const validatePasswordStrength = (password) => {
  return password && password.length >= 6;
};

// @desc    Change password
// @route   PATCH /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "Please provide all required password fields" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    user.authProvider = "email";
    user.passwordChangedAt = Date.now();
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Forgot password - send reset link
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email. Please create an account." });
    }

    const successMsg = "Password reset instructions have been sent to your email.";

    if (user.authProvider !== "email") {
      return res.status(400).json({
        message: `This account uses ${user.authProvider} login. Please use that method.`,
      });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || req.get("origin")}/reset-password/${resetToken}`;

    if (process.env.NODE_ENV !== "production") {
      console.log("Password Reset URL:", resetUrl);
    }

    const appName = process.env.EMAIL_FROM_NAME || "ServiceHub";
    const subject = `Password Reset Request - ${appName}`;
    const text = `You are receiving this email because you (or someone else) have requested the reset of a password. Please click on the following link, or paste this into your browser to complete the process within 10 minutes:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:520px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 10px;color:#1f2937;">Password Reset</h2>
        <p style="margin:0 0 14px;">You requested a password reset for your ${appName} account. Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Reset Password</a>
        <p style="margin:14px 0 0;">This link will expire in 10 minutes.</p>
        <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    try {
      await sendMail({ to: user.email, subject, text, html });
      res.json({ success: true, message: successMsg });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res
        .status(500)
        .json({ message: "Email could not be sent", error: err.message });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const { token } = req.params;

    if (!newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "Please provide and confirm your new password" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Reset link is invalid or has expired" });
    }

    user.password = newPassword;
    user.authProvider = "email";
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Google login/signup
// @route   POST /api/auth/google
const googleAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;
    const { roles: requestedRoles, activeRole: requestedActiveRole } =
      parseRoleSelection(req.body);
    const preferredRole = VALID_ROLES.includes(requestedActiveRole)
      ? requestedActiveRole
      : null;

    if (!accessToken) {
      return res.status(400).json({ message: "Google access token required" });
    }

    const googleRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(accessToken)}`,
    );

    if (!googleRes.ok) {
      return res
        .status(401)
        .json({ message: "Invalid or expired Google token" });
    }

    const googleUser = await googleRes.json();
    const {
      sub: googleId,
      name,
      email,
      picture: avatar,
      email_verified,
    } = googleUser;

    if (!email || !googleId) {
      return res
        .status(400)
        .json({ message: "Could not retrieve Google account info" });
    }
    if (!email_verified) {
      return res
        .status(400)
        .json({ message: "Google account email is not verified" });
    }

    let user = await User.findOne({ email }).select("+password +role");
    let isNewUser = false;

    if (user) {
      if (user.isBlocked) {
        return res.status(403).json({ message: "Account blocked" });
      }

      const normalized = normalizeRoles(user, preferredRole);
      const nextRoles = [...new Set([...normalized.roles, ...requestedRoles])];

      user.lastLogin = new Date();
      user.googleId = googleId;
      if (avatar) user.avatar = avatar;
      user.roles = nextRoles;
      user.activeRole =
        preferredRole || normalized.activeRole || nextRoles[0] || null;
      user.roleIntent = user.roleIntent || deriveRoleIntent(nextRoles);
      await user.save();

      if (user.activeRole) {
        await ensureRoleProfile(user._id, user.activeRole);
        await ensureRoleSubscription(user, user.activeRole);
      }
    } else {
      const detectedLocale = await detectLocaleFromRequest(req);
      const { referralCode, referredBy } = req.body;

      user = await User.create({
        name,
        email,
        googleId,
        avatar: avatar || "",
        roles: requestedRoles,
        activeRole: requestedActiveRole,
        role: requestedActiveRole || null,
        roleIntent: deriveRoleIntent(requestedRoles),
        authProvider: "google",
        isEmailVerified: true,
        termsAccepted: true,
        ipAddress: detectedLocale.ip || req.ip,
        country: detectedLocale.country,
        currency: detectedLocale.currency,
        locale: detectedLocale.locale,
        preferredLanguage: detectedLocale.locale,
        approvalStatus: "approved",
        panelAccess: {
          provider: { enabled: true, source: "free_plan" },
          recruiter: { enabled: true, source: "free_plan" },
        },
      });

      if (user.activeRole) {
        await ensureRoleProfile(user._id, user.activeRole);
        await ensureRoleSubscription(user, user.activeRole, {
          startDate: user.createdAt,
        });
      }

      // Process referral code if provided
      if (referralCode || referredBy) {
        const referralResult = await processRegistrationReferral({
          referralCode,
          referredBy,
          newUserId: user._id,
          role: requestedActiveRole || requestedRoles[0],
        });
        if (referralResult) {
          user.referredByPartnerId = referralResult.partnerId;
          user.referralCodeUsed = referralResult.referralCode;
          user.source = "referral_link";
          await user.save();
        }
      }

      isNewUser = true;
    }

    const providerPlanSummary = await buildPlanSummary(user._id, "provider");
    const recruiterPlanSummary = await buildPlanSummary(user._id, "recruiter");
    res.json(
      buildAuthPayload(user, {
        isNewUser,
        providerPlanSummary,
        recruiterPlanSummary,
      }),
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    WhatsApp login/signup - send OTP
// @route   POST /api/auth/whatsapp/send-otp
const whatsappSendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone)
      return res.status(400).json({ message: "Phone number required" });

    const otp = generateOTP();
    await Otp.create({
      identifier: phone,
      otp,
      type: "phone",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendPhoneOTP(phone, otp);
    res.json({ message: "OTP sent to WhatsApp", phone });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    WhatsApp login/signup - verify OTP
// @route   POST /api/auth/whatsapp/verify-otp
const whatsappVerifyOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    const { roles: requestedRoles, activeRole: requestedActiveRole } =
      parseRoleSelection(req.body);
    if (!phone || !otp)
      return res.status(400).json({ message: "Phone and OTP required" });

    const otpRecord = await Otp.findOne({
      identifier: phone,
      otp,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    otpRecord.isUsed = true;
    await otpRecord.save();

    let user = await User.findOne({ phone }).select("+role");
    let isNewUser = false;

    if (user) {
      const normalized = normalizeRoles(user, preferredRole);
      const nextRoles = [...new Set([...normalized.roles, ...requestedRoles])];

      user.roles = nextRoles;
      user.activeRole =
        preferredRole || normalized.activeRole || nextRoles[0] || null;
      user.isPhoneVerified = true;
      user.lastLogin = new Date();
      user.roleIntent = user.roleIntent || deriveRoleIntent(nextRoles);
      await user.save();

      if (user.activeRole) {
        await ensureRoleProfile(user._id, user.activeRole);
        await ensureRoleSubscription(user, user.activeRole);
      }
    } else {
      if (!name) {
        return res.status(400).json({
          message: "Name required for new user",
          needsRegistration: true,
          phoneVerified: true,
        });
      }

      const detectedLocale = await detectLocaleFromRequest(req);
      const { referralCode, referredBy } = req.body;

      user = await User.create({
        name,
        email: `${phone}@whatsapp.servicehub.com`,
        phone,
        roles: requestedRoles,
        activeRole: requestedActiveRole,
        role: requestedActiveRole || null,
        roleIntent: deriveRoleIntent(requestedRoles),
        authProvider: "whatsapp",
        isPhoneVerified: true,
        whatsappConsent: true,
        termsAccepted: true,
        ipAddress: detectedLocale.ip || req.ip,
        country: detectedLocale.country,
        currency: detectedLocale.currency,
        locale: detectedLocale.locale,
        preferredLanguage: detectedLocale.locale,
        approvalStatus: "approved",
        panelAccess: {
          provider: { enabled: true, source: "free_plan" },
          recruiter: { enabled: true, source: "free_plan" },
        },
      });

      if (user.activeRole) {
        await ensureRoleProfile(user._id, user.activeRole);
        await ensureRoleSubscription(user, user.activeRole, {
          startDate: user.createdAt,
        });
      }

      // Process referral code if provided
      if (referralCode || referredBy) {
        const referralResult = await processRegistrationReferral({
          referralCode,
          referredBy,
          newUserId: user._id,
          role: requestedActiveRole || requestedRoles[0],
        });
        if (referralResult) {
          user.referredByPartnerId = referralResult.partnerId;
          user.referralCodeUsed = referralResult.referralCode;
          user.source = "referral_link";
          await user.save();
        }
      }

      isNewUser = true;
      await sendWhatsAppMessage(phone, "welcome", { name: user.name });
    }

    const providerPlanSummary = await buildPlanSummary(user._id, "provider");
    const recruiterPlanSummary = await buildPlanSummary(user._id, "recruiter");
    res.json(
      buildAuthPayload(user, {
        isNewUser,
        providerPlanSummary,
        recruiterPlanSummary,
      }),
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Send email OTP for verification
// @route   POST /api/auth/verify-email/send
const sendEmailVerification = async (req, res) => {
  try {
    const email = req.user.email;
    if (!email || email.endsWith("@phone.lucohire.local")) {
      return res.status(400).json({ message: "No valid email associated with this account." });
    }

    const { generateAndSaveOtp } = require("../services/otpService");
    const { sendOtpEmail } = require("../services/resendOtpService");

    const { otp, target } = await generateAndSaveOtp({
      userId: req.user._id,
      purpose: "change_email",
      email,
      ipAddress: req.ip || "",
      userAgent: req.headers["user-agent"] || "",
    });

    const emailResult = await sendOtpEmail({ to: target, otp, purpose: "change_email" });
    if (!emailResult.success) {
      console.error("[Email Verification] Email delivery failed:", emailResult.error);
      return res.status(500).json({ message: "Failed to send OTP email. Please try again." });
    }

    res.json({ message: "Verification OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Verify email OTP
// @route   POST /api/auth/verify-email/confirm
const confirmEmailVerification = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.user.email;
    if (!email || email.endsWith("@phone.lucohire.local")) {
      return res.status(400).json({ message: "No valid email associated with this account." });
    }

    const { verifyOtp } = require("../services/otpService");
    const result = await verifyOtp({
      userId: req.user._id,
      purpose: "change_email",
      target: email,
      otp: String(otp),
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message || "Invalid or expired OTP" });
    }

    req.user.isEmailVerified = true;
    await req.user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update and verify email (new email flow)
// @route   PUT /api/auth/update-email
const updateEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && String(existingUser._id) !== String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "This email address is already registered by another account."
      });
    }

    const Otp = require("../models/Otp");
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const verifiedOtp = await Otp.findOne({
      userId: req.user._id,
      purpose: "change_email",
      target: normalizedEmail,
      verifiedAt: { $gte: since },
    }).sort({ createdAt: -1 });

    if (!verifiedOtp) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email via OTP first before updating."
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    user.email = normalizedEmail;
    user.isEmailVerified = true;
    await user.save();

    res.json({
      success: true,
      message: "Email updated and verified successfully.",
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error("[UPDATE EMAIL ERROR]", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("roles activeRole role panelAccess isBlocked email name phone whatsappNumber authProvider approvalStatus roleIntent activePanel country currency locale preferredLanguage avatar termsAccepted profilePhoto profilePhotoApproval hasPassword");
    const normalized = normalizeRoles(user);
    user.roles = normalized.roles;
    user.activeRole = normalized.activeRole;
    user.roleIntent = user.roleIntent || deriveRoleIntent(user.roles);

    const profile = user.activeRole
      ? await getProfileByRole(user._id, user.activeRole)
      : null;
    const providerPlanSummary = await buildPlanSummary(user._id, "provider");
    const recruiterPlanSummary = await buildPlanSummary(user._id, "recruiter");

    const userObj = user.toObject();
    if (userObj.email && userObj.email.endsWith("@phone.lucohire.local")) {
      userObj.email = "";
    }
    const cleanPhone = String(userObj.phone || "").replace(/\D/g, "");
    if (userObj.name && (userObj.name === userObj.phone || userObj.name === userObj.fullPhone || String(userObj.name).replace(/\D/g, "") === cleanPhone)) {
      userObj.name = "";
    }

    res.json({
      user: {
        ...userObj,
        role: user.activeRole,
      },
      profile,
      providerPlanSummary,
      recruiterPlanSummary,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Switch active role
// @route   POST /api/auth/switch-role
const switchRole = async (req, res) => {
  try {
    const role = req.body.role || req.body.panel;
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: "Invalid role/panel. Allowed values: provider, recruiter.",
      });
    }

    const user = await User.findById(req.user._id).select("roles activeRole role panelAccess isBlocked email name phone whatsappNumber authProvider approvalStatus roleIntent activePanel country currency locale preferredLanguage avatar termsAccepted profilePhoto profilePhotoApproval");
    if (!user) return res.status(404).json({ message: "User not found" });

    const normalized = normalizeRoles(user);
    if (
      normalized.roles.includes("admin") ||
      normalized.roles.includes("manager")
    ) {
      return res.status(403).json({
        message:
          "Role switching is not available for admin or manager accounts.",
      });
    }

    const nextRoles = [...new Set([...normalized.roles, role])];

    user.roles = nextRoles;
    user.activeRole = role;
    await user.save();

    await ensureRoleProfile(user._id, role);
    await ensureRoleSubscription(user, role);

    const profile = await getProfileByRole(user._id, role);

    res.json({
      user: {
        ...user.toObject(),
        role: role,
      },
      roles: user.roles,
      activeRole: role,
      panel: role,
      redirectPath: `/${role}/dashboard`,
      profile,
      token: generateToken(user._id, role),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Switch active panel (provider/recruiter) when approved
// @route   PATCH /api/auth/switch-panel
const switchPanel = async (req, res) => {
  try {
    const panel = req.body.panel;
    if (!VALID_ROLES.includes(panel)) {
      return res.status(400).json({
        message: "Invalid panel. Allowed values: provider, recruiter.",
      });
    }

    const user = await User.findById(req.user._id).select("roles activeRole role panelAccess isBlocked email name phone whatsappNumber authProvider approvalStatus roleIntent activePanel country currency locale preferredLanguage avatar termsAccepted profilePhoto profilePhotoApproval");
    if (!user) return res.status(404).json({ message: "User not found" });

    const normalized = normalizeRoles(user);
    user.roles = normalized.roles;
    user.activeRole = normalized.activeRole;
    user.roleIntent = user.roleIntent || deriveRoleIntent(user.roles);

    const profile = await getProfileByRole(user._id, panel);
    if (!profile) {
      return res.json({
        needsProfileCompletion: true,
        role: panel,
        message: `${panel} profile is incomplete. Please complete it first.`
      });
    }

    user.activePanel = panel;
    user.activeRole = panel;
    if (!user.roles.includes(panel)) user.roles.push(panel);
    await user.save();
    const providerPlanSummary = await buildPlanSummary(user._id, "provider");
    const recruiterPlanSummary = await buildPlanSummary(user._id, "recruiter");

    res.json({
      user: {
        ...user.toObject(),
        role: panel,
      },
      roles: user.roles,
      activeRole: panel,
      activePanel: panel,
      panel,
      profile,
      providerPlanSummary,
      recruiterPlanSummary,
      token: generateToken(user._id, panel),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update WhatsApp number (for email/google signup users)
// @route   PUT /api/auth/whatsapp-number
const updateWhatsappNumber = async (req, res) => {
  try {
    const { whatsappNumber } = req.body;
    if (!whatsappNumber)
      return res.status(400).json({ message: "WhatsApp number is required" });

    const user = await User.findById(req.user._id);
    user.whatsappNumber = whatsappNumber;
    user.whatsappConsent = true;
    await user.save();

    res.json({
      message: "WhatsApp number updated",
      whatsappNumber: user.whatsappNumber,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update user locale/country preference
// @route   PUT /api/auth/locale
const updateLocale = async (req, res) => {
  try {
    const { locale, language, country, currency } = req.body;
    const user = await User.findById(req.user._id);
    const nextLanguage = locale || language;

    const nextLocaleCode = normalizeLanguageCode(nextLanguage);
    const nextCountryCode = normalizeCountryCode(country);
    const nextCurrencyCode = normalizeCurrencyCode(currency);

    if (nextLocaleCode && SUPPORTED_LOCALES.has(nextLocaleCode)) {
      user.locale = nextLocaleCode;
      user.preferredLanguage = nextLocaleCode;
    }
    if (nextCountryCode) user.country = nextCountryCode;
    if (nextCurrencyCode) user.currency = nextCurrencyCode;
    await user.save();

    res.json({
      locale: user.locale,
      preferredLanguage: user.preferredLanguage || user.locale,
      country: user.country,
      currency: user.currency,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update user language preference
// @route   PUT /api/user/language
const updateLanguagePreference = async (req, res) => {
  try {
    const { language } = req.body;
    if (!language || !SUPPORTED_LOCALES.has(language)) {
      return res.status(400).json({ message: "Unsupported language" });
    }

    const user = await User.findById(req.user._id);
    user.locale = language;
    user.preferredLanguage = language;
    await user.save();

    res.json({ language: user.preferredLanguage, locale: user.locale });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Toggle WhatsApp alerts
// @route   PUT /api/auth/whatsapp-alerts
const toggleWhatsappAlerts = async (req, res) => {
  try {
    const { enabled } = req.body;
    const user = await User.findById(req.user._id).select("+role");
    user.whatsappAlerts = enabled !== false;
    await user.save();

    const activeRole = user.activeRole || user.role;
    if (activeRole === "provider") {
      await ProviderProfile.findOneAndUpdate(
        { user: user._id },
        { whatsappAlerts: user.whatsappAlerts },
      );
    } else if (activeRole === "recruiter") {
      await RecruiterProfile.findOneAndUpdate(
        { user: user._id },
        { whatsappAlerts: user.whatsappAlerts },
      );
    }

    res.json({ whatsappAlerts: user.whatsappAlerts });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//firebase OTP login

const firebaseOtpLogin = async (req, res) => {
  try {
    const {
      firebaseToken,
      role: requestedRole,
      activeRole: requestedActiveRole,
      roles: requestedRoles,
      name: requestedName,
      email: requestedEmail,
    } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase token is required",
      });
    }

    const decodedToken = await verifyFirebaseIdToken(firebaseToken);

    const firebaseUid = decodedToken.uid;
    const phone = decodedToken.phoneNumber;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number not found in Firebase token",
      });
    }

    let user = await User.findOne({
      $or: [{ firebaseUid }, { phone }],
    }).select("+password +role");
    let isNewUser = false;

    const roleCandidates = [
      requestedRole,
      requestedActiveRole,
      Array.isArray(requestedRoles) ? requestedRoles[0] : null,
      user?.activeRole,
      user?.role,
    ].filter(Boolean);

    const resolvedRole = roleCandidates.find((candidate) =>
      ["provider", "recruiter"].includes(candidate),
    );

    const finalRole = resolvedRole || "provider";

    if (!finalRole) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const normalizedPhone = String(phone || "").replace(/\D/g, "");
    const fallbackEmail = normalizedPhone
      ? `${normalizedPhone}@phone.lucohire.local`
      : `phone_user_${Date.now()}@phone.lucohire.local`;
    const fallbackName = requestedName || "";
    const rolesArray = Array.isArray(requestedRoles)
      ? requestedRoles.filter((r) => ["provider", "recruiter"].includes(r))
      : [finalRole];
    const roleIntent = deriveRoleIntent(rolesArray);

    const { parsePhoneString } = require("../utils/phoneValidation");
    const parsedPhone = parsePhoneString(phone);

    if (!user) {
      // WhatsApp validation and formatting
      const isWhatsappSame = req.body.isWhatsappSameAsMobile === true || req.body.isWhatsappSameAsMobile === 'true' || req.body.isWhatsappSameAsMobile === undefined;
      let finalWhatsappNumber = "";

      if (isWhatsappSame) {
        finalWhatsappNumber = parsedPhone.fullPhone || phone || "";
      } else if (req.body.whatsappNumber) {
        const { parsePhoneString: parseWhatsappStr, isValidPhoneNumber: isWhatsappValid } = require("../utils/phoneValidation");
        const parsedWhatsapp = parseWhatsappStr(req.body.whatsappNumber);
        if (parsedWhatsapp.countryCode && !isWhatsappValid(parsedWhatsapp.countryCode, parsedWhatsapp.nationalNumber)) {
          return res.status(400).json({
            success: false,
            message: "Please enter a valid WhatsApp number.",
          });
        }
        finalWhatsappNumber = parsedWhatsapp.fullPhone || req.body.whatsappNumber;
      }

      user = await User.create({
        firebaseUid,
        phone: parsedPhone.fullPhone || phone,
        countryCode: parsedPhone.countryCode || "",
        nationalNumber: parsedPhone.nationalNumber || "",
        fullPhone: parsedPhone.fullPhone || phone,
        whatsappNumber: finalWhatsappNumber,
        isWhatsappSameAsMobile: isWhatsappSame,
        name: requestedName || fallbackName,
        email: requestedEmail || fallbackEmail,
        roles: rolesArray,
        activeRole: finalRole,
        role: finalRole,
        roleIntent,
        isPhoneVerified: true,
        status: "active",
      });
      isNewUser = true;
    } else {
      user.firebaseUid = user.firebaseUid || firebaseUid;
      user.phone = user.phone || parsedPhone.fullPhone || phone;
      user.countryCode = user.countryCode || parsedPhone.countryCode || "";
      user.nationalNumber = user.nationalNumber || parsedPhone.nationalNumber || "";
      user.fullPhone = user.fullPhone || parsedPhone.fullPhone || phone;
      user.isPhoneVerified = true;

      if (!user.name) {
        user.name = requestedName || fallbackName;
      }

      if (!user.email) {
        user.email = requestedEmail || fallbackEmail;
      }

      if (!user.role) {
        user.role = finalRole;
      }

      if (!Array.isArray(user.roles) || user.roles.length === 0) {
        user.roles = rolesArray;
      }

      if (!user.activeRole) {
        user.activeRole = finalRole;
      }

      if (!user.roleIntent) {
        user.roleIntent = roleIntent;
      }

      await user.save();
    }

    return res.status(200).json(
      buildAuthPayload(user, {
        success: true,
        message: "OTP login successful",
        isNewUser,
      }),
    );
  } catch (error) {
    console.error("Firebase OTP Login Error:", error);
    const isDev = (process.env.NODE_ENV || "development") !== "production";

    return res.status(401).json({
      success: false,
      message: "Firebase token verification failed",
      ...(isDev
        ? { details: error?.message || "Unknown verification error" }
        : {}),
    });
  }
};

const buildAuthResponse = (user, extra = {}, preferredRole = null) => {
  const payload = buildAuthPayload(user, extra, preferredRole);
  const { token, ...userPayload } = payload;
  return {
    success: true,
    data: {
      token,
      user: userPayload,
    },
  };
};

const googleLoginV1 = async (req, res) => {
  try {
    console.log("[GOOGLE LOGIN BODY]", req.body);
    const { credential, accessToken, firebaseToken } = req.body || {};
    const { roles: requestedRoles, activeRole: requestedActiveRole } =
      parseRoleSelection(req.body);
    const preferredRole = VALID_ROLES.includes(requestedActiveRole)
      ? requestedActiveRole
      : null;

    let googleProfile = null;

    if (firebaseToken) {
      const decodedToken = await verifyFirebaseIdToken(firebaseToken);
      console.log("[FIREBASE DECODED TOKEN FOR GOOGLE LOGIN]:", JSON.stringify(decodedToken));
      googleProfile = {
        sub: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || "",
        picture: decodedToken.picture || ""
      };
      console.log("[MAPPED GOOGLE PROFILE]:", googleProfile);
    } else if (credential) {
      if (!googleOAuthClient) {
        return res.status(500).json({
          success: false,
          message: "Google OAuth client is not configured",
        });
      }

      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      googleProfile = ticket.getPayload();
    } else if (accessToken) {
      const googleRes = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(accessToken)}`
      );

      if (!googleRes.ok) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid Google token" });
      }

      googleProfile = await googleRes.json();
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Google token required" });
    }

    const googleId = googleProfile.sub || googleProfile.id;
    const email = googleProfile.email;
    const name = googleProfile.name || "";
    const avatar = googleProfile.picture || "";

    if (!googleId || !email) {
      return res.status(400).json({
        success: false,
        message: "Google profile incomplete",
      });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] }).select(
      "+password +role"
    );
    let isNewUser = false;

    if (user) {
      if (user.isBlocked) {
        return res.status(403).json({ success: false, message: "Account blocked" });
      }

      const normalized = normalizeRoles(user);
      const nextRoles = [...new Set([...normalized.roles, ...requestedRoles])];

      user.googleId = user.googleId || googleId;
      user.authProvider = "google";
      user.isVerified = true;
      user.isEmailVerified = true;
      if (!user.name) user.name = name;
      if (!user.avatar) user.avatar = avatar;
      user.lastLogin = new Date();
      user.roles = nextRoles;
      user.activeRole =
        requestedActiveRole || normalized.activeRole || nextRoles[0] || null;
      user.roleIntent = user.roleIntent || deriveRoleIntent(nextRoles);
      await user.save();

      if (user.activeRole) {
        await ensureRoleProfile(user._id, user.activeRole);
        await ensureRoleSubscription(user, user.activeRole);
      }
    } else {
      const detectedLocale = await detectLocaleFromRequest(req);
      user = await User.create({
        name,
        email,
        googleId,
        avatar: avatar || "",
        roles: requestedRoles,
        activeRole: requestedActiveRole,
        role: requestedActiveRole || null,
        roleIntent: deriveRoleIntent(requestedRoles),
        authProvider: "google",
        isEmailVerified: true,
        isVerified: true,
        termsAccepted: true,
        ipAddress: detectedLocale.ip || req.ip,
        country: detectedLocale.country,
        currency: detectedLocale.currency,
        locale: detectedLocale.locale,
        preferredLanguage: detectedLocale.locale,
        approvalStatus: "approved",
        panelAccess: {
          provider: { enabled: true, source: "free_plan" },
          recruiter: { enabled: true, source: "free_plan" },
        },
      });

      if (user.activeRole) {
        await ensureRoleProfile(user._id, user.activeRole);
        await ensureRoleSubscription(user, user.activeRole, {
          startDate: user.createdAt,
        });
      }

      isNewUser = true;
    }

    if (isNewUser) {
      await creditSignupCashback(user._id);
    }

    console.log("[GOOGLE PAYLOAD]", { googleId, email });
    return res.json(buildAuthResponse(user, { isNewUser }, preferredRole));
  } catch (error) {
    console.error("[GOOGLE LOGIN V1]", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

const phoneLoginV1 = async (req, res) => {
  try {
    console.log("[PHONE LOGIN BODY]", req.body);
    const { firebaseToken, roles, activeRole, role } = req.body || {};
    const preferredRole = VALID_ROLES.includes(activeRole)
      ? activeRole
      : (VALID_ROLES.includes(role) ? role : null);

    if (!firebaseToken) {
      return res
        .status(400)
        .json({ success: false, message: "Firebase token required" });
    }

    const decodedToken = await verifyFirebaseIdToken(firebaseToken);
    console.log("[FIREBASE PHONE DECODED]", {
      uid: decodedToken.uid,
      phone: decodedToken.phoneNumber,
    });
    const firebaseUid = decodedToken.uid;
    const phone = decodedToken.phoneNumber;

    if (!phone) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number missing" });
    }

    let user = await User.findOne({ $or: [{ firebaseUid }, { phone }] }).select(
      "+password +role"
    );
    let isNewUser = false;

    const candidateRoles = Array.isArray(roles) ? roles : [];
    let desiredRole = preferredRole || candidateRoles[0] || "provider";

    if (user) {
      desiredRole = preferredRole || user.activeRole || user.role || desiredRole;
    }

    const { parsePhoneString } = require("../utils/phoneValidation");
    const parsedPhone = parsePhoneString(phone);

    if (!user) {
      // WhatsApp validation and formatting
      const isWhatsappSame = req.body.isWhatsappSameAsMobile === true || req.body.isWhatsappSameAsMobile === 'true' || req.body.isWhatsappSameAsMobile === undefined;
      let finalWhatsappNumber = "";

      if (isWhatsappSame) {
        finalWhatsappNumber = parsedPhone.fullPhone || phone || "";
      } else if (req.body.whatsappNumber) {
        const { parsePhoneString: parseWhatsappStr, isValidPhoneNumber: isWhatsappValid } = require("../utils/phoneValidation");
        const parsedWhatsapp = parseWhatsappStr(req.body.whatsappNumber);
        if (parsedWhatsapp.countryCode && !isWhatsappValid(parsedWhatsapp.countryCode, parsedWhatsapp.nationalNumber)) {
          return res.status(400).json({
            success: false,
            message: "Please enter a valid WhatsApp number.",
          });
        }
        finalWhatsappNumber = parsedWhatsapp.fullPhone || req.body.whatsappNumber;
      }

      const detectedLocale = await detectLocaleFromRequest(req);
      user = await User.create({
        phone: parsedPhone.fullPhone || phone,
        countryCode: parsedPhone.countryCode || "",
        nationalNumber: parsedPhone.nationalNumber || "",
        fullPhone: parsedPhone.fullPhone || phone,
        whatsappNumber: finalWhatsappNumber,
        isWhatsappSameAsMobile: isWhatsappSame,
        firebaseUid,
        authProvider: "phone",
        isVerified: true,
        isPhoneVerified: true,
        roles: candidateRoles.length ? candidateRoles : [desiredRole],
        activeRole: desiredRole,
        role: desiredRole,
        roleIntent: deriveRoleIntent(
          candidateRoles.length ? candidateRoles : [desiredRole]
        ),
        termsAccepted: true,
        ipAddress: detectedLocale.ip || req.ip,
        country: detectedLocale.country,
        currency: detectedLocale.currency,
        locale: detectedLocale.locale,
        preferredLanguage: detectedLocale.locale,
        approvalStatus: "approved",
        panelAccess: {
          provider: { enabled: true, source: "free_plan" },
          recruiter: { enabled: true, source: "free_plan" },
        },
      });

      if (user.activeRole) {
        await ensureRoleProfile(user._id, user.activeRole);
        await ensureRoleSubscription(user, user.activeRole, {
          startDate: user.createdAt,
        });
      }

      isNewUser = true;
    } else {
      user.firebaseUid = user.firebaseUid || firebaseUid;
      user.phone = user.phone || parsedPhone.fullPhone || phone;
      user.countryCode = user.countryCode || parsedPhone.countryCode || "";
      user.nationalNumber = user.nationalNumber || parsedPhone.nationalNumber || "";
      user.fullPhone = user.fullPhone || parsedPhone.fullPhone || phone;
      user.authProvider = user.authProvider || "phone";
      user.isVerified = true;
      user.isPhoneVerified = true;
      user.lastLogin = new Date();
      if (!Array.isArray(user.roles)) user.roles = [];
      const newRoles = candidateRoles.length ? candidateRoles : [desiredRole];
      newRoles.forEach((r) => {
        if (!user.roles.includes(r)) {
          user.roles.push(r);
        }
      });
      if (!user.activeRole) user.activeRole = desiredRole;
      if (!user.role) user.role = desiredRole;
      
      if (!user.roleIntent) {
        user.roleIntent = deriveRoleIntent(
          candidateRoles.length ? candidateRoles : [desiredRole]
        );
      }
      await user.save();
    }

    if (isNewUser) {
      await creditSignupCashback(user._id);
    }

    try {
      await Otp.updateMany(
        { target: parsedPhone.fullPhone || phone, providerUsed: 'firebase', verifiedAt: null },
        { $set: { verifiedAt: new Date() } }
      );
    } catch (err) {
      console.error("Failed to mark Firebase OTP logs as verified:", err);
    }

    return res.json(buildAuthResponse(user, { isNewUser }, preferredRole));
  } catch (error) {
    console.error("[PHONE LOGIN V1]", error);
    return res
      .status(401)
      .json({ success: false, message: "Firebase token verification failed" });
  }
};

const registerEmailV1 = async (req, res) => {
  try {
    console.log("[EMAIL REGISTER]", req.body?.email);
    const { name, email, password, phone, isWhatsappSameAsMobile, whatsappNumber } = req.body || {};
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!name || !normalizedEmail || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, email, and password required",
        });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const { roles: requestedRoles, activeRole: requestedActiveRole } =
      parseRoleSelection(req.body);

    const targetRole = requestedActiveRole || requestedRoles[0] || 'provider';

    // Role-specific validation
    if (targetRole === 'provider') {
      const skills = req.body.skills || (req.body.providerProfile && req.body.providerProfile.skills);
      if (!skills || !Array.isArray(skills) || skills.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please select at least one skill/speciality for Service Provider registration."
        });
      }
    } else if (targetRole === 'recruiter') {
      const companyName = req.body.companyName || (req.body.recruiterProfile && req.body.recruiterProfile.companyName);
      if (!companyName || !companyName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Company Name is required for Recruiter registration."
        });
      }
      // GST validation if entered
      const gstNumber = req.body.gstNumber || (req.body.recruiterProfile && req.body.recruiterProfile.gstNumber);
      if (gstNumber && gstNumber.trim()) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(gstNumber.trim().toUpperCase())) {
          return res.status(400).json({
            success: false,
            message: "Invalid GST Number format. Must be a valid 15-character GSTIN."
          });
        }
      }
    }

    let user = await User.findOne({ email: normalizedEmail }).select(
      "+role"
    );

    if (user && user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please login.",
      });
    }

    if (user && user.authProvider && user.authProvider !== "email") {
      return res.status(400).json({
        success: false,
        message: "This email is linked to another login method.",
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_VALIDITY_MS);

    const { parsePhoneString } = require("../utils/phoneValidation");
    const parsedPhone = parsePhoneString(phone);

    const isWhatsappSame = isWhatsappSameAsMobile === true || isWhatsappSameAsMobile === 'true' || isWhatsappSameAsMobile === undefined;
    let finalWhatsappNumber = "";

    if (isWhatsappSame) {
      finalWhatsappNumber = parsedPhone.fullPhone || phone || "";
    } else if (whatsappNumber) {
      const { parsePhoneString: parseWhatsappStr, isValidPhoneNumber: isWhatsappValid } = require("../utils/phoneValidation");
      const parsedWhatsapp = parseWhatsappStr(whatsappNumber);
      if (parsedWhatsapp.countryCode && !isWhatsappValid(parsedWhatsapp.countryCode, parsedWhatsapp.nationalNumber)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid WhatsApp number.",
        });
      }
      finalWhatsappNumber = parsedWhatsapp.fullPhone || whatsappNumber;
    }

    if (!user) {
      const detectedLocale = await detectLocaleFromRequest(req);
      user = await User.create({
        name: name || "",
        email: normalizedEmail,
        password,
        phone: parsedPhone.fullPhone || undefined,
        countryCode: parsedPhone.countryCode || undefined,
        nationalNumber: parsedPhone.nationalNumber || undefined,
        fullPhone: parsedPhone.fullPhone || undefined,
        whatsappNumber: finalWhatsappNumber,
        isWhatsappSameAsMobile: isWhatsappSame,
        authProvider: "email",
        isVerified: false,
        isEmailVerified: false,
        emailOtp: otp,
        emailOtpExpires: expiresAt,
        roles: requestedRoles,
        activeRole: requestedActiveRole,
        role: requestedActiveRole || null,
        roleIntent: deriveRoleIntent(requestedRoles),
        termsAccepted: true,
        ipAddress: detectedLocale.ip || req.ip,
        country: detectedLocale.country,
        currency: detectedLocale.currency,
        locale: detectedLocale.locale,
        preferredLanguage: detectedLocale.locale,
      });
    } else {
      user.name = name || user.name;
      user.password = password;
      if (parsedPhone.fullPhone) {
        user.phone = parsedPhone.fullPhone;
        user.countryCode = parsedPhone.countryCode;
        user.nationalNumber = parsedPhone.nationalNumber;
        user.fullPhone = parsedPhone.fullPhone;
      }
      user.whatsappNumber = finalWhatsappNumber;
      user.isWhatsappSameAsMobile = isWhatsappSame;
      user.authProvider = "email";
      user.isVerified = false;
      user.isEmailVerified = false;
      user.emailOtp = otp;
      user.emailOtpExpires = expiresAt;
      if (!user.roles || user.roles.length === 0) {
        user.roles = requestedRoles;
      }
      if (!user.activeRole && requestedActiveRole) {
        user.activeRole = requestedActiveRole;
        user.role = requestedActiveRole;
      }
      if (!user.roleIntent && requestedRoles.length) {
        user.roleIntent = deriveRoleIntent(requestedRoles);
      }
      await user.save();
    }

    // Save dynamic fields to profile
    if (user.activeRole) {
      const profile = await ensureRoleProfile(user._id, user.activeRole);
      if (user.activeRole === 'provider') {
        const skills = req.body.skills || (req.body.providerProfile && req.body.providerProfile.skills);
        const city = req.body.city || req.body.location || (req.body.providerProfile && req.body.providerProfile.location);
        const experience = req.body.experience || (req.body.providerProfile && req.body.providerProfile.experience);

        if (profile) {
          if (skills) profile.skills = skills;
          if (city) {
            profile.city = city;
            profile.locations = [city];
            profile.serviceLocations = [{
              placeId: "",
              name: city,
              formattedAddress: city,
              city: city,
              state: "",
              country: "",
              lat: null,
              lng: null,
              source: "google"
            }];
          }
          if (experience) profile.experience = experience;
          await profile.save();
        }
      } else if (user.activeRole === 'recruiter') {
        const companyName = req.body.companyName || (req.body.recruiterProfile && req.body.recruiterProfile.companyName);
        const gstNumber = req.body.gstNumber || (req.body.recruiterProfile && req.body.recruiterProfile.gstNumber);
        const companyLocation = req.body.companyLocation || req.body.city || (req.body.recruiterProfile && req.body.recruiterProfile.companyLocation);

        if (profile) {
          if (companyName) profile.companyName = companyName;
          if (gstNumber) profile.gstNumber = gstNumber;
          if (companyLocation) {
            profile.city = companyLocation;
          }
          await profile.save();
        }
      }
    }

    // Save OTP to audit log collection for admin tracking
    try {
      const bcrypt = require('bcryptjs');
      await Otp.updateMany(
        { target: normalizedEmail, purpose: 'register' },
        { $set: { expiresAt: new Date() } }
      );
      await Otp.create({
        userId: user._id,
        purpose: 'register',
        channel: 'email',
        target: normalizedEmail,
        otpHash: await bcrypt.hash(otp, 10),
        expiresAt,
        resendCount: 0,
        attempts: 0,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        providerUsed: 'resend'
      });
    } catch (otpErr) {
      console.error('[OTP AUDIT LOG CREATE FAILED]', otpErr.message);
    }

    await sendEmailOTP(normalizedEmail, otp);

    return res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    console.error("[REGISTER EMAIL V1]", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

const verifyEmailOtpV1 = async (req, res) => {
  try {
    console.log("[EMAIL VERIFY]", req.body?.email);
    const { email, otp } = req.body || {};
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP required" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+role"
    );
    if (!user || user.authProvider !== "email") {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    if (!user.emailOtp || user.emailOtp !== otp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });
    }

    if (user.emailOtpExpires && user.emailOtpExpires < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired" });
    }

    user.isVerified = true;
    user.isEmailVerified = true;
    user.emailOtp = "";
    user.emailOtpExpires = null;
    user.lastLogin = new Date();
    if (req.body.isWhatsappSameAsMobile !== undefined) {
      user.isWhatsappSameAsMobile = req.body.isWhatsappSameAsMobile === true || req.body.isWhatsappSameAsMobile === 'true';
    }
    if (req.body.whatsappNumber) {
      user.whatsappNumber = req.body.whatsappNumber;
      user.whatsappConsent = true;
    } else if (user.isWhatsappSameAsMobile) {
      user.whatsappNumber = user.phone || "";
      user.whatsappConsent = true;
    }
    await user.save();

    try {
      await Otp.updateMany(
        { target: normalizedEmail, verifiedAt: null },
        { $set: { verifiedAt: new Date(), userId: user._id } }
      );
    } catch (e) {
      console.error("[OTP LOG VERIFY UPDATE]", e.message);
    }

    await creditSignupCashback(user._id);

    if (user.activeRole) {
      await ensureRoleProfile(user._id, user.activeRole);
      await ensureRoleSubscription(user, user.activeRole);
    }

    return res.json(buildAuthResponse(user, { isNewUser: true }));
  } catch (error) {
    console.error("[VERIFY EMAIL V1]", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

const loginEmailV1 = async (req, res) => {
  try {
    console.log("[EMAIL LOGIN]", req.body?.email);
    const { email, password, activeRole, role } = req.body || {};
    const normalizedEmail = (email || "").trim().toLowerCase();
    const preferredRole = VALID_ROLES.includes(activeRole)
      ? activeRole
      : (VALID_ROLES.includes(role) ? role : null);

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password +role"
    );
    if (!user || (user.authProvider !== "email" && !user.password)) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isVerified && !user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const normalized = normalizeRoles(user, preferredRole);
    user.roles = normalized.roles;
    user.activeRole = normalized.activeRole;
    user.roleIntent = user.roleIntent || deriveRoleIntent(user.roles);
    await user.save();

    return res.json(buildAuthResponse(user, {}, preferredRole));
  } catch (error) {
    console.error("[LOGIN EMAIL V1]", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

const getMeV1 = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const payload = buildAuthPayload(req.user);
  const { token, ...userPayload } = payload;

  return res.json({
    success: true,
    data: {
      user: userPayload,
    },
  });
};

// @desc    Request a magic link
// @route   POST /api/auth/magic-link/request
const requestMagicLink = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    // Always return generic success for security
    const successMsg = "If this email exists, a magic link has been sent.";

    if (!user) {
      return res.json({ success: true, message: successMsg });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Account blocked. Contact admin." });
    }

    const magicToken = user.createMagicLinkToken();
    await user.save({ validateBeforeSave: false });

    const redirectPath = req.body.redirect || '/';
    const magicUrl = `${process.env.FRONTEND_URL || req.get("origin")}/auth/magic?token=${magicToken}&redirect=${encodeURIComponent(redirectPath)}`;

    if (process.env.NODE_ENV !== "production") {
      console.log("Magic Link URL:", magicUrl);
    }

    const appName = process.env.EMAIL_FROM_NAME || "ServiceHub";
    const subject = `Your Magic Link - ${appName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:520px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 10px;color:#1f2937;">Login securely</h2>
        <p style="margin:0 0 14px;">Click the button below to instantly log into your ${appName} account:</p>
        <a href="${magicUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Login to Account</a>
        <p style="margin:14px 0 0;">This link will expire in 15 minutes.</p>
        <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    try {
      await sendMail({ to: user.email, subject, text: "Click the link to login.", html });
      res.json({ success: true, message: successMsg });
    } catch (err) {
      user.magicLinkToken = undefined;
      user.magicLinkExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: "Email could not be sent", error: err.message });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Verify magic link
// @route   POST /api/auth/magic-link/verify
const verifyMagicLink = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      magicLinkToken: hashedToken,
      magicLinkExpires: { $gt: Date.now() },
    }).select("+roles +activeRole +role +panelAccess +isBlocked +email +name +phone +whatsappNumber +isWhatsappSameAsMobile +authProvider +approvalStatus +roleIntent +activePanel +country +currency +locale +preferredLanguage +avatar +termsAccepted +profilePhoto +profilePhotoApproval");

    if (!user) {
      return res.status(400).json({ message: "Magic link is invalid or has expired" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Account blocked. Contact admin." });
    }

    // Clear token
    user.magicLinkToken = undefined;
    user.magicLinkExpires = undefined;

    // Login logic
    if (!user.isEmailVerified) user.isEmailVerified = true;
    
    const normalized = normalizeRoles(user);
    user.roles = normalized.roles;
    user.activeRole = normalized.activeRole;
    user.roleIntent = user.roleIntent || deriveRoleIntent(user.roles);
    user.lastLogin = new Date();
    user.ipAddress = req.ip;

    if (!user.country || !user.currency || !user.locale) {
      const detectedLocale = await detectLocaleFromRequest(req);
      user.country = user.country || detectedLocale.country;
      user.currency = user.currency || detectedLocale.currency;
      user.locale = user.locale || detectedLocale.locale;
      user.preferredLanguage = user.preferredLanguage || user.locale;
    }

    await user.save();

    if (user.activeRole) {
      await ensureRoleProfile(user._id, user.activeRole);
      await ensureRoleSubscription(user, user.activeRole);
    }

    const providerPlanSummary = await buildPlanSummary(user._id, "provider");
    const recruiterPlanSummary = await buildPlanSummary(user._id, "recruiter");
    
    res.json(buildAuthPayload(user, { providerPlanSummary, recruiterPlanSummary }));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update timezone
// @route   POST /api/auth/update-timezone
const updateTimezone = async (req, res) => {
  try {
    const { timezone } = req.body;

    if (!timezone || typeof timezone !== 'string') {
      return res.status(400).json({ message: "Timezone is required and must be a string." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.timezone = timezone;
    await user.save();

    res.json({ success: true, message: "Timezone updated successfully", timezone: user.timezone });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Permanently erase user account and all cascading data
// @route   DELETE /api/users/profile/erase
const eraseAccountData = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { deleteFromCloudinary } = require('../utils/cloudinary');
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1. Fetch profiles to extract media for Cloudinary deletion
    const providerProfile = await ProviderProfile.findOne({ user: userId });
    if (providerProfile) {
      if (providerProfile.profilePhoto) await deleteFromCloudinary(providerProfile.profilePhoto).catch(e => console.error(e));
      if (providerProfile.resume) await deleteFromCloudinary(providerProfile.resume).catch(e => console.error(e));
      
      if (providerProfile.portfolio && providerProfile.portfolio.length > 0) {
        for (const item of providerProfile.portfolio) {
          if (item.fileUrl) await deleteFromCloudinary(item.fileUrl).catch(e => console.error(e));
        }
      }
    }

    const recruiterProfile = await RecruiterProfile.findOne({ user: userId });
    if (recruiterProfile && recruiterProfile.profilePhoto) {
      await deleteFromCloudinary(recruiterProfile.profilePhoto).catch(e => console.error(e));
    }

    // 2. Begin Cascading Deletions across collections
    
    // Core Profiles
    await ProviderProfile.deleteOne({ user: userId });
    await RecruiterProfile.deleteOne({ user: userId });

    // Job matching and outreach
    try {
      const JobPost = require('../models/JobPost');
      const Lead = require('../models/Lead');
      const Application = require('../models/Application');
      const Review = require('../models/Review');
      const Notification = require('../models/Notification');
      const JobMatch = require('../models/JobMatch');
      const MatchLog = require('../models/MatchLog');
      const CandidateDigestLog = require('../models/CandidateDigestLog');

      await JobPost.deleteMany({ recruiter: userId });
      await Lead.deleteMany({ $or: [{ provider: userId }, { recruiter: userId }] });
      await Application.deleteMany({ $or: [{ provider: userId }, { recruiter: userId }] });
      await Review.deleteMany({ $or: [{ provider: userId }, { recruiter: userId }, { reviewerId: userId }, { revieweeId: userId }] });
      await Notification.deleteMany({ user: userId });
      await JobMatch.deleteMany({ provider: userId });
      await MatchLog.deleteMany({ $or: [{ providerId: userId }, { recruiterId: userId }] });
      await CandidateDigestLog.deleteMany({ recruiterId: userId });
    } catch (e) { console.error("Error deleting job matching data:", e); }

    // Chat
    try {
      const ChatConversation = require('../models/ChatConversation');
      const ChatMessage = require('../models/ChatMessage');
      await ChatConversation.deleteMany({ participants: userId });
      await ChatMessage.deleteMany({ sender: userId });
    } catch (e) { /* Models might not exist in this scope if not loaded, safe to ignore if optional */ }

    // AI footprint
    try {
      const ProviderAIProfile = require('../models/ProviderAIProfile');
      const ProviderEmbedding = require('../models/ProviderEmbedding');
      await ProviderAIProfile.deleteOne({ providerId: userId });
      await ProviderEmbedding.deleteOne({ providerId: userId });
    } catch (e) { console.error("Error deleting AI footprint:", e); }

    // Subscriptions (Wipe reference or delete)
    await UserSubscription.deleteMany({ userId: userId });
    
    // Delete the base User record
    await User.findByIdAndDelete(userId);

    // 3. Clear auth cookie to fully log out
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      expires: new Date(0),
    });

    res.json({ success: true, message: "Account and all associated data permanently deleted." });
  } catch (error) {
    console.error("Error in eraseAccountData:", error);
    res.status(500).json({ message: "Server error during data erasure", error: error.message });
  }
};

// @desc    Log a Firebase OTP attempt from frontend
// @route   POST /api/auth/v1/log-firebase-otp
const logFirebaseOtpAttempt = async (req, res) => {
  try {
    const { phone, purpose = 'login', channel = 'phone' } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone required" });
    }

    const { parsePhoneString } = require("../utils/phoneValidation");
    const parsed = parsePhoneString(phone);

    await Otp.create({
      target: parsed.fullPhone || phone,
      countryCode: parsed.countryCode || "",
      channel,
      purpose,
      otpHash: 'FIREBASE_MANAGED_OTP',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      providerUsed: 'firebase',
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "",
    });

    res.status(200).json({ success: true, message: "Logged successfully" });
  } catch (error) {
    console.error("Failed to log firebase OTP attempt:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ─── Unified Email-Only Registration OTP Handlers ─────────────────────────────
const {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  isTokenVerified,
} = require("../services/registrationOtpService");
const {
  calculateProfileCompletion,
} = require("../services/providerProfilePersistenceService");
const bcrypt = require("bcryptjs");

const sendRegistrationOtpHandler = async (req, res) => {
  try {
    const { targetType, email, phone } = req.body;
    if (!targetType || !["mobile", "email"].includes(targetType)) {
      return res.status(400).json({ success: false, message: "Invalid targetType (mobile or email required)." });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required to receive the verification OTP." });
    }

    const result = await sendRegistrationOtp({ targetType, email, phone });
    return res.json(result);
  } catch (error) {
    console.error("[sendRegistrationOtpHandler] Error:", error.message);
    return res.status(400).json({ success: false, message: error.message || "Failed to send OTP." });
  }
};

const verifyRegistrationOtpHandler = async (req, res) => {
  try {
    const { targetType, email, phone, otp } = req.body;
    if (!targetType || !otp) {
      return res.status(400).json({ success: false, message: "targetType and 4-digit OTP are required." });
    }

    const result = await verifyRegistrationOtp({ targetType, email, phone, otp });
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("[verifyRegistrationOtpHandler] Error:", error.message);
    return res.status(400).json({ success: false, message: error.message || "Failed to verify OTP." });
  }
};

const registerFreelancerProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      photo,
      professionalTitle,
      city,
      state,
      travelRadius,
      category,
      experience,
      skills,
      pricingEntries,
      headlineSkill,
      about,
      achievement,
      education,
      portfolioLinks,
      resumeUrl,
      languages,
      languageEntries,
      availability,
      workHours,
      preferredProjectDuration,
      whatsappAvailability,
      contactConsent,
      contactMediums,
      voiceIntroUrl,
      videoIntroUrl,
      idVerification,
      termsAccepted,
      mobileVerified,
      emailVerified,
    } = req.body;

    const normalizedEmail = (email || "").trim().toLowerCase();
    const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const OR = [{ email: normalizedEmail }];
    if (cleanPhone) OR.push({ phone: cleanPhone });
    let user = await User.findOne({ OR });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = await User.create({
        email: normalizedEmail,
        phone: cleanPhone || "",
        name: name || normalizedEmail.split("@")[0],
        roles: ["provider"],
        activeRole: "provider",
        roleIntent: "provider",
        isEmailVerified: !!emailVerified,
        isPhoneVerified: !!mobileVerified,
        termsAccepted: termsAccepted !== false,
        profilePhoto: photo || "",
        avatar: photo || "",
        status: "active",
        panelAccess: {
          provider: { enabled: true, source: "free_plan" },
          recruiter: { enabled: true, source: "free_plan" },
        },
      });

      if (password && password.trim().length >= 6) {
        user.password = await bcrypt.hash(password.trim(), 10);
        user.hasPassword = true;
      }
      await user.save();
    } else {
      if (name) user.name = name;
      if (photo) {
        user.profilePhoto = photo;
        user.avatar = photo;
      }
      if (cleanPhone) user.phone = cleanPhone;
      if (!user.roles.includes("provider")) {
        user.roles.push("provider");
      }
      user.activeRole = "provider";
      if (emailVerified) user.isEmailVerified = true;
      if (mobileVerified) user.isPhoneVerified = true;
      if (termsAccepted) user.termsAccepted = true;
      if (password && password.trim().length >= 6) {
        user.password = await bcrypt.hash(password.trim(), 10);
        user.hasPassword = true;
      }
      await user.save();
    }

    let profile = await ProviderProfile.findOne({ user: user._id });
    if (!profile) {
      profile = await ProviderProfile.create({
        user: user._id,
        profileName: name || user.name || "",
        city: city || "",
        state: state || "",
        profileExpiresAt: new Date(Date.now() + VALIDITY_DAYS * 24 * 60 * 60 * 1000),
      });
    }

    if (name) profile.profileName = name;
    if (photo) {
      profile.photo = photo;
      profile.profilePhoto = photo;
    }
    if (professionalTitle) profile.professionalTitle = professionalTitle;
    if (city) profile.city = city;
    if (state) profile.state = state;
    if (travelRadius !== undefined) profile.willingToTravelKm = parseFloat(travelRadius) || 80;
    if (category) profile.category = category;
    if (experience) profile.experience = experience;

    if (Array.isArray(skills)) profile.skills = skills;
    if (Array.isArray(pricingEntries)) {
      profile.pricingEntries = pricingEntries;
      const firstEntry = pricingEntries[0];
      if (firstEntry) {
        if (firstEntry.startingPrice) profile.pricing = String(firstEntry.startingPrice);
        if (firstEntry.priceType) profile.pricingType = firstEntry.priceType;
        if (firstEntry.skillLevel) profile.skillLevel = firstEntry.skillLevel.toLowerCase();
      }
    }
    if (headlineSkill) profile.headlineSkill = headlineSkill;

    if (about) {
      profile.description = about;
      profile.finalBio = about;
    }
    if (achievement) profile.keyAchievement = achievement;
    if (Array.isArray(education)) profile.education = education;
    if (Array.isArray(portfolioLinks)) profile.portfolioLinks = portfolioLinks;
    if (resumeUrl) profile.resumeUrl = resumeUrl;

    if (Array.isArray(languages)) profile.languages = languages;
    if (Array.isArray(languageEntries)) profile.languageEntries = languageEntries;
    if (availability) profile.availability = availability;
    if (workHours) profile.workHours = workHours;
    if (preferredProjectDuration) profile.preferredProjectDuration = preferredProjectDuration;
    if (whatsappAvailability) {
      profile.whatsappAvailability = whatsappAvailability;
      profile.whatsappAlerts = whatsappAvailability.enabled !== false;
    }
    if (contactConsent !== undefined) profile.contactConsent = !!contactConsent;
    if (Array.isArray(contactMediums)) profile.contactMediums = contactMediums;
    if (voiceIntroUrl) profile.voiceIntroUrl = voiceIntroUrl;
    if (videoIntroUrl) profile.videoIntroUrl = videoIntroUrl;
    if (idVerification) {
      profile.idVerification = idVerification;
      if (idVerification.enabled) profile.isVerified = true;
    }

    const completion = calculateProfileCompletion(profile, user);
    profile.profileCompletion = completion.percentage;
    profile.profileStatus = "active";
    await profile.save();

    user.providerProfileId = profile._id;
    await user.save();

    await ensureRoleSubscription(user, "provider", { startDate: user.createdAt });

    const authPayload = buildAuthPayload(user, {
      providerProfileId: profile._id,
      profileCompletion: completion.percentage,
      isNewUser,
    }, "provider");

    return res.status(201).json({
      success: true,
      message: "Freelancer profile created successfully!",
      token: authPayload.token,
      user: authPayload,
      profile,
      profileCompletion: completion.percentage,
    });
  } catch (error) {
    console.error("[registerFreelancerProfile] Error:", error);
    return res.status(500).json({ success: false, message: "Registration failed.", error: error.message });
  }
};

module.exports = {
  sendRegistrationOtpHandler,
  verifyRegistrationOtpHandler,
  registerFreelancerProfile,
  logFirebaseOtpAttempt,
  registerEmail,
  sendRegistrationEmailOtp,
  confirmRegistrationEmailOtp,
  loginUser,
  googleAuth,
  whatsappSendOtp,
  whatsappVerifyOtp,
  sendEmailVerification,
  confirmEmailVerification,
  updateEmail,
  getMe,
  updateWhatsappNumber,
  updateLocale,
  updateLanguagePreference,
  toggleWhatsappAlerts,
  firebaseOtpLogin,
  changePassword,
  forgotPassword,
  resetPassword,
  googleLoginV1,
  phoneLoginV1,
  registerEmailV1,
  verifyEmailOtpV1,
  loginEmailV1,
  getMeV1,
  requestMagicLink,
  verifyMagicLink,
  verifyFirebaseIdToken,
  updateTimezone,
  eraseAccountData,
  buildAuthPayload,
  ensureRoleProfile,
  ensureRoleSubscription,
  switchRole,
  switchPanel,
};
