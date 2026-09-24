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
  const uid = String(id);

  // 1. Break the circular FK reference on User and unbind self-references on other users
  await Promise.all([
    prisma.user.update({
      where: { id: uid },
      data: { providerProfileId: null, recruiterProfileId: null },
    }).catch(() => {}),
    prisma.user.updateMany({ where: { referredBy: uid }, data: { referredBy: null } }).catch(() => {}),
    prisma.user.updateMany({ where: { createdByPartnerId: uid }, data: { createdByPartnerId: null } }).catch(() => {}),
    prisma.user.updateMany({ where: { referredByPartnerId: uid }, data: { referredByPartnerId: null } }).catch(() => {}),
    prisma.user.updateMany({ where: { approvedBy: uid }, data: { approvedBy: null } }).catch(() => {}),
  ]);

  // 2. Find provider profiles to clean up child relations
  const providerProfiles = await prisma.providerProfile.findMany({
    where: { user: uid },
    select: { id: true },
  });
  const ppIds = providerProfiles.map((p) => p.id);

  if (ppIds.length > 0) {
    await Promise.all([
      prisma.aiEvaluation.deleteMany({ where: { candidateId: { in: ppIds } } }).catch(() => {}),
      prisma.candidateCareerVersion.deleteMany({ where: { providerId: { in: ppIds } } }).catch(() => {}),
      prisma.contactClickLog.deleteMany({ where: { provider: { in: ppIds } } }).catch(() => {}),
      prisma.recruiterCvViewTracker.deleteMany({ where: { candidateId: { in: ppIds } } }).catch(() => {}),
      prisma.recruiterLeadTracker.deleteMany({ where: { candidateId: { in: ppIds } } }).catch(() => {}),
      prisma.visitHistory.deleteMany({ where: { visitedProfile: { in: ppIds } } }).catch(() => {}),
    ]);
  }

  // 3. Delete provider & recruiter profiles
  await Promise.all([
    prisma.providerProfile.deleteMany({ where: { user: uid } }).catch(() => {}),
    prisma.recruiterProfile.deleteMany({ where: { user: uid } }).catch(() => {}),
  ]);

  // 4. Delete dependent usages & plans before subscriptions
  await Promise.all([
    prisma.providerUsage.deleteMany({ where: { providerId: uid } }).catch(() => {}),
    prisma.providerAiUsage.deleteMany({ where: { providerId: uid } }).catch(() => {}),
    prisma.recruiterAiUsage.deleteMany({ where: { recruiterId: uid } }).catch(() => {}),
    prisma.customVisibilityPlan.deleteMany({ where: { providerId: uid } }).catch(() => {}),
    prisma.refundRequest.deleteMany({ where: { userId: uid } }).catch(() => {}),
  ]);

  // 5. In parallel, delete all direct user foreign keys
  await Promise.all([
    prisma.lead.deleteMany({ where: { OR: [{ provider: uid }, { recruiter: uid }] } }).catch(() => {}),
    prisma.review.deleteMany({ where: { OR: [{ provider: uid }, { recruiter: uid }, { reviewerId: uid }, { revieweeId: uid }] } }).catch(() => {}),
    prisma.application.deleteMany({ where: { provider: uid } }).catch(() => {}),
    prisma.jobPost.deleteMany({ where: { recruiter: uid } }).catch(() => {}),
    prisma.savedJob.deleteMany({ where: { provider: uid } }).catch(() => {}),
    prisma.providerSubscription.deleteMany({ where: { providerId: uid } }).catch(() => {}),
    prisma.recruiterSubscription.deleteMany({ where: { recruiterId: uid } }).catch(() => {}),
    prisma.userSubscription.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.providerServiceArea.deleteMany({ where: { providerId: uid } }).catch(() => {}),
    prisma.providerAvailability.deleteMany({ where: { providerId: uid } }).catch(() => {}),
    prisma.providerEmbedding.deleteMany({ where: { providerId: uid } }).catch(() => {}),
    prisma.providerMetrics.deleteMany({ where: { providerId: uid } }).catch(() => {}),
    prisma.recruiterHireEmbedding.deleteMany({ where: { recruiterId: uid } }).catch(() => {}),
    prisma.recruiterSearchLog.deleteMany({ where: { OR: [{ recruiterId: uid }, { hiredProviderId: uid }] } }).catch(() => {}),
    prisma.trustScore.deleteMany({ where: { providerId: uid } }).catch(() => {}),
    prisma.repeatHireInsight.deleteMany({ where: { OR: [{ recruiterId: uid }, { providerId: uid }] } }).catch(() => {}),
    prisma.resumeAccessLog.deleteMany({ where: { OR: [{ recruiterId: uid }, { candidateId: uid }] } }).catch(() => {}),
    prisma.skillGapReport.deleteMany({ where: { candidateId: uid } }).catch(() => {}),
    prisma.candidateJobMatch.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.candidateDigestLog.deleteMany({ where: { candidate: uid } }).catch(() => {}),
    prisma.jobMatch.deleteMany({ where: { providerId: uid } }).catch(() => {}),
    prisma.jobSearchIntent.deleteMany({ where: { sourceUserId: uid } }).catch(() => {}),
    prisma.jobAnalyticsEvent.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.leadDistributionLog.deleteMany({ where: { OR: [{ providerId: uid }, { recruiterId: uid }] } }).catch(() => {}),
    prisma.leadEvent.deleteMany({ where: { actorId: uid } }).catch(() => {}),
    prisma.matchLog.deleteMany({ where: { OR: [{ providerId: uid }, { recruiterId: uid }] } }).catch(() => {}),
    prisma.profileShareToken.deleteMany({ where: { OR: [{ candidateId: uid }, { createdByUserId: uid }] } }).catch(() => {}),
    prisma.freelancerContactConsentRequest.deleteMany({ where: { OR: [{ freelancerId: uid }, { requesterId: uid }] } }).catch(() => {}),
    prisma.documentVerificationResult.deleteMany({ where: { OR: [{ providerId: uid }, { reviewedBy: uid }] } }).catch(() => {}),
    prisma.fraudFlag.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.incomePathCache.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.outreachCampaign.deleteMany({ where: { recruiterId: uid } }).catch(() => {}),
    prisma.partnerBankAccount.deleteMany({ where: { partnerId: uid } }).catch(() => {}),
    prisma.payoutMethod.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.payoutRequest.deleteMany({ where: { partnerId: uid } }).catch(() => {}),
    prisma.task.deleteMany({ where: { recruiterId: uid } }).catch(() => {}),
    prisma.workspaceChat.deleteMany({ where: { recruiterId: uid } }).catch(() => {}),
    prisma.aiAnalysisResult.deleteMany({ where: { user_id: uid } }).catch(() => {}),
    prisma.aIInteractionLog.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.aiUsageLog.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.visitHistory.deleteMany({ where: { OR: [{ user: uid }, { visitedUser: uid }] } }).catch(() => {}),
    prisma.profileUnlock.deleteMany({ where: { OR: [{ recruiterId: uid }, { providerId: uid }] } }).catch(() => {}),
    prisma.chatMessage.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.chatConversation.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.contactClickLog.deleteMany({ where: { user: uid } }).catch(() => {}),
    prisma.notification.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.otp.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.payment.deleteMany({ where: { user: uid } }).catch(() => {}),
    prisma.walletTransaction.deleteMany({ where: { OR: [{ userId: uid }, { sourceUserId: uid }] } }).catch(() => {}),
    prisma.providerWalletTransaction.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.providerWallet.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.providerWithdrawal.deleteMany({ where: { OR: [{ userId: uid }, { processedBy: uid }] } }).catch(() => {}),
    prisma.withdrawalRequest.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.supportTicket.deleteMany({ where: { user: uid } }).catch(() => {}),
    prisma.whatsappLog.deleteMany({ where: { user: uid } }).catch(() => {}),
    prisma.partnerProfile.deleteMany({ where: { userId: uid } }).catch(() => {}),
    prisma.partnerReward.deleteMany({ where: { OR: [{ partner: uid }, { referredUser: uid }] } }).catch(() => {}),
    prisma.referral.deleteMany({ where: { OR: [{ referrerId: uid }, { referredUserId: uid }] } }).catch(() => {}),
    prisma.auditEvent.deleteMany({ where: { actorId: uid } }).catch(() => {}),
    prisma.approvalLog.deleteMany({ where: { OR: [{ actorId: uid }, { targetUserId: uid }] } }).catch(() => {}),
  ]);

  // 6. Clean rotation pools
  try {
    const pools = await prisma.rotationPool.findMany();
    for (const p of pools) {
      if (Array.isArray(p.providers)) {
        const filtered = p.providers.filter((item) => {
          const pid = typeof item === 'string' ? item : item?.provider?.id || item?.provider?._id || item?.provider;
          return pid !== uid;
        });
        if (filtered.length !== p.providers.length) {
          await prisma.rotationPool.update({
            where: { id: p.id },
            data: { providers: filtered },
          });
        }
      }
    }
  } catch (_) {}

  // 7. Finally delete the User row
  return toAuthUser(await prisma.user.delete({ where: { id: uid } }));
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
