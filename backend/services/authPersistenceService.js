const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = require('../config/prisma');
const { generateReferralCode } = require('../utils/generateReferralCode');
const { withLegacyId } = require('../utils/prismaResponse');

const USER_WRITE_FIELDS = new Set([
  'accountExpiresAt', 'activePanel', 'activeRole', 'approvalStatus', 'approvedAt',
  'approvedBy', 'authProvider', 'avatar', 'bankDetails', 'cityName', 'claimToken',
  'commissionBalance', 'country', 'countryCode', 'createdByPartnerId', 'currency',
  'deviceInfo', 'email', 'emailOtp', 'emailOtpExpires', 'email_hash', 'firebaseUid',
  'firstRegisteredRole', 'firstSubscriptionCompleted', 'fullPhone', 'googleId',
  'hasPassword', 'ipAddress', 'isActive', 'isBlocked', 'isEmailVerified',
  'isPhoneVerified', 'isPublicProfile', 'isVerified', 'isWhatsappSameAsMobile',
  'lastLogin', 'latitude', 'locale', 'location', 'longitude', 'magicLinkExpires',
  'magicLinkToken', 'name', 'nationalNumber', 'panelAccess', 'partnerStatus',
  'password', 'passwordChangedAt', 'passwordResetExpires', 'passwordResetToken',
  'phone', 'phoneHistory', 'phoneVerification', 'phone_hash', 'preferredLanguage',
  'profilePhoto', 'profilePhotoApproval', 'providerProfileId', 'recruiterProfileId',
  'referralCode', 'referralCodeUsed', 'referralWalletBalance', 'referredBy',
  'referredByCode', 'referredByPartnerId', 'referredUsersCount', 'referrerType',
  'rejectionReason', 'renewalReminder2Sent', 'renewalReminderSent', 'resumeApproval',
  'role', 'roleIntent', 'roles', 'signupCashbackCredited', 'signupCashbackCreditedAt',
  'source', 'source_profile_url', 'status', 'subscriptionBadge', 'termsAccepted',
  'timezone', 'totalReferralCommission', 'totalReferrals', 'unlockOtp',
  'unlockOtpExpires', 'whatsappAlerts', 'whatsappConsent', 'whatsappNumber',
]);

const DATE_FIELDS = new Set([
  'accountExpiresAt', 'approvedAt', 'emailOtpExpires', 'lastLogin', 'magicLinkExpires',
  'passwordChangedAt', 'passwordResetExpires', 'signupCashbackCreditedAt',
  'unlockOtpExpires',
]);

const isBcryptHash = (value) => typeof value === 'string' && /^\$2[aby]\$/.test(value);
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');

const toAuthUser = (record) => withLegacyId(record);

const normalizeRolesForWrite = (data) => {
  if (!Object.prototype.hasOwnProperty.call(data, 'roles')
    && !Object.prototype.hasOwnProperty.call(data, 'role')
    && !Object.prototype.hasOwnProperty.call(data, 'activeRole')) return;

  const roles = Array.isArray(data.roles) ? [...new Set(data.roles.filter(Boolean))] : [];
  if (data.role && !roles.includes(data.role)) roles.push(data.role);
  if (!data.activeRole) data.activeRole = roles[0] || data.role || null;
  if (data.activeRole && !roles.includes(data.activeRole)) roles.push(data.activeRole);
  data.roles = roles;
  if (data.activeRole) data.role = data.activeRole;

  if (!data.roleIntent) {
    const provider = roles.includes('provider');
    const recruiter = roles.includes('recruiter');
    if (provider && recruiter) data.roleIntent = 'both';
    else if (recruiter) data.roleIntent = 'recruiter';
    else if (provider) data.roleIntent = 'provider';
  }
};

async function prepareUserData(source, { isNew = false } = {}) {
  const data = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (USER_WRITE_FIELDS.has(key) && value !== undefined) data[key] = value;
  }

  normalizeRolesForWrite(data);

  if (isNew) {
    if (!data.referralCode) data.referralCode = generateReferralCode();
    if (!data.panelAccess) {
      data.panelAccess = {
        provider: { enabled: true, source: 'free_plan' },
        recruiter: { enabled: true, source: 'free_plan' },
      };
    }
    if (!data.approvalStatus) data.approvalStatus = 'approved';
  }

  if (data.email) {
    data.email = data.email.trim().toLowerCase();
    data.email_hash = digest(data.email);
  }
  if (data.fullPhone) data.phone = data.fullPhone;
  if (data.phone === '') data.phone = null;
  if (data.phone) data.phone_hash = digest(String(data.phone).trim());
  if (data.password && !isBcryptHash(data.password)) {
    data.password = await bcrypt.hash(data.password, 10);
    data.hasPassword = true;
  }

  for (const field of DATE_FIELDS) {
    if (typeof data[field] === 'number') data[field] = new Date(data[field]);
  }

  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  if (Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180) {
    data.location = { type: 'Point', coordinates: [longitude, latitude] };
  }

  return data;
}

async function createUser(data) {
  return toAuthUser(await prisma.user.create({
    data: await prepareUserData(data, { isNew: true }),
  }));
}

function mergeSavedUser(user, saved) {
  for (const key of Object.keys(user)) {
    if (Object.prototype.hasOwnProperty.call(saved, key)) user[key] = saved[key];
  }
  user.id = saved.id;
  user._id = saved._id;
  return user;
}

async function saveUser(user) {
  const saved = toAuthUser(await prisma.user.update({
    where: { id: user.id || user._id },
    data: await prepareUserData(user),
  }));
  return mergeSavedUser(user, saved);
}

async function deleteUser(id) {
  return toAuthUser(await prisma.user.delete({ where: { id: String(id) } }));
}

async function verifyPassword(user, password) {
  return Boolean(user?.password) && bcrypt.compare(password, user.password);
}

function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    passwordResetToken: digest(token),
    passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
  };
}

function createMagicLinkToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    magicLinkToken: digest(token),
    magicLinkExpires: new Date(Date.now() + 15 * 60 * 1000),
  };
}

module.exports = {
  createMagicLinkToken,
  createPasswordResetToken,
  createUser,
  deleteUser,
  mergeSavedUser,
  prepareUserData,
  saveUser,
  toAuthUser,
  verifyPassword,
};
