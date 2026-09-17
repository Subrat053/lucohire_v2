const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');

const AUTH_USER_SELECT = {
  id: true,
  roles: true,
  activeRole: true,
  role: true,
  panelAccess: true,
  isBlocked: true,
  status: true,
  email: true,
  name: true,
  phone: true,
  whatsappNumber: true,
  authProvider: true,
  approvalStatus: true,
  roleIntent: true,
  activePanel: true,
  country: true,
  currency: true,
  locale: true,
  preferredLanguage: true,
  avatar: true,
  termsAccepted: true,
  profilePhoto: true,
  profilePhotoApproval: true,
  hasPassword: true,
};

const normalizeUserRoles = (user) => {
  const roles = Array.isArray(user.roles) ? [...new Set(user.roles)] : [];
  const legacyRole = user.role;

  if (legacyRole && !roles.includes(legacyRole)) {
    roles.push(legacyRole);
  }

  let activeRole = user.activeRole;
  if (!activeRole) activeRole = roles[0] || null;
  if (activeRole && !roles.includes(activeRole)) roles.push(activeRole);

  if (roles.includes('admin')) activeRole = 'admin';
  else if (roles.includes('manager')) activeRole = 'manager';

  return { roles, activeRole };
};

// ─── Protect routes — verify JWT and enforce account status ──────────────────
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = withLegacyId(await prisma.user.findUnique({
      where: { id: String(decoded.id) },
      select: AUTH_USER_SELECT,
    }));

    if (!req.user) {
      console.log(`[AUTH] User not found for ID: ${decoded.id}`);
      return res.status(401).json({ message: 'User not found' });
    }

    const { roles, activeRole } = normalizeUserRoles(req.user);
    req.user.roles = roles;
    req.user.activeRole = activeRole;

    // ── Admin bypass: admins are never blocked by status checks ──────────────
    const isAdmin = activeRole === 'admin' || activeRole === 'manager';

    // ── Hard block check (applies to ALL roles including admin) ──────────────
    if (req.user.isBlocked) {
      console.log(`[AUTH] Blocked user attempted access: ${req.user.email}`);
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_BLOCKED',
        message: 'Your account has been blocked. Please contact support.',
      });
    }

    // ── Suspended account check ───────────────────────────────────────────────
    if (req.user.approvalStatus === 'suspended') {
      console.log(`[AUTH] Suspended user attempted access: ${req.user.email}`);
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended due to a violation of our policies. Please contact support to appeal.',
      });
    }

    // ── Status checks for non-admin users ────────────────────────────────────
    if (!isAdmin) {
      const accountStatus = req.user.status || 'active';

      if (accountStatus === 'deactivated') {
        console.log(`[AUTH] Deactivated user attempted access: ${req.user.email}`);
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated. Please contact support.',
        });
      }

      if (accountStatus === 'inactive') {
        console.log(`[AUTH] Inactive user attempted access: ${req.user.email}`);
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_INACTIVE',
          message: 'Your account is inactive. Please contact support to reactivate.',
        });
      }

      if (accountStatus === 'blocked') {
        console.log(`[AUTH] Blocked-status user attempted access: ${req.user.email}`);
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_BLOCKED',
          message: 'Your account has been blocked. Please contact support.',
        });
      }
    }

    next();
  } catch (error) {
    console.log(`[AUTH] Token verification failed: ${error.message}`);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// ─── Role authorization ───────────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (req.user.activeRole === 'admin') return next();
    if (!roles.includes(req.user.activeRole)) {
      return res.status(403).json({ message: `Role '${req.user.activeRole}' is not authorized` });
    }
    next();
  };
};

const authorizeRoleFromActive = (...requiredRoles) => {
  return (req, res, next) => {
    if (req.user.activeRole === 'admin') return next();
    const allowedRoles = requiredRoles.flat().filter(Boolean);
    if (!allowedRoles.includes(req.user.activeRole)) {
      console.log(`[AUTH] Role mismatch. Required: [${allowedRoles}], Active: ${req.user.activeRole}`);
      return res.status(403).json({
        message: `Active role '${req.user.activeRole}' is not authorized for this route`,
      });
    }
    next();
  };
};

/**
 * requireOtpVerified(purpose)
 * Middleware factory — ensures the current user has a valid verified OTP session
 * for the specified purpose within the last 30 minutes.
 *
 * Usage: router.post('/sensitive', protect, requireOtpVerified('unlock_profile'), handler)
 *
 * Note: Session-based — if OTP was verified within 30 minutes, user can proceed
 * without re-verifying on each individual action (Option B per user preference).
 */
const requireOtpVerified = (purpose) => {
  return async (req, res, next) => {
    try {
      const { hasVerifiedOtpSession } = require('../services/otpService');
      const sessionValid = await hasVerifiedOtpSession({
        userId: req.user._id,
        purpose,
        windowMinutes: parseInt(process.env.OTP_SESSION_MINUTES || '30', 10),
      });

      if (!sessionValid) {
        return res.status(403).json({
          success: false,
          code: 'OTP_REQUIRED',
          purpose,
          message: `OTP verification required for this action (${purpose}). Please verify your identity first.`,
        });
      }

      next();
    } catch (err) {
      console.error('[requireOtpVerified] Error:', err.message);
      return res.status(500).json({ success: false, message: 'OTP verification check failed.' });
    }
  };
};

module.exports = { protect, authorize, authorizeRoleFromActive, requireOtpVerified };




