const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');

const RECRUITER_PROFILE_FIELDS = new Set([
  'activityLogs', 'aiCopilotRemaining', 'aiJdGeneratorRemaining',
  'aiJdParsingRemaining', 'approvalAction', 'approvalNote', 'approvalSections',
  'approvedAt', 'approvedBy', 'approvedByRole', 'avgRating', 'bio',
  'boostDaysRemaining', 'boostJobsRemaining', 'businessType',
  'careerPageSettings', 'city', 'companyLogo', 'companyName', 'companySize',
  'companyType', 'companyWebsite', 'contactPersonName', 'countryCode',
  'currentPlan', 'customReportsRemaining', 'description', 'designation',
  'directMessagingRemaining', 'foundedYear', 'freeProfileViews',
  'freeUnlockResetAt', 'freeViewResetAt', 'geoPoint', 'gstNumber',
  'hiringLocation', 'hiringPreferences', 'industry', 'interviewKitsRemaining',
  'isApproved', 'isVerified', 'jobPostLimitRemaining', 'latitude', 'location',
  'locationData', 'locationUpdatedAt', 'longitude', 'nearestLocation',
  'outreachCampaignsRemaining', 'planExpiresAt', 'profileExpiresAt',
  'profileName', 'profilePhoto', 'profilePhotoApproval', 'renewalReminderSent',
  'skillsNeeded', 'state', 'timezone', 'totalHires', 'totalJobsPosted',
  'totalReviews', 'totalUnlocks', 'unlockPackSize', 'unlocksRemaining', 'user',
  'whatsappAlerts',
]);

const COMPANY_SOURCE_FIELDS = new Set([
  'activeJobCount', 'atsIdentifier', 'atsType', 'careerUrl', 'companyDomain',
  'companyName', 'countryCode', 'failureCount', 'hiringLevel', 'lastCheckedAt',
  'lastError', 'lastSyncedAt', 'source', 'status', 'successCount',
]);

const DATE_FIELDS = new Set([
  'approvedAt', 'freeUnlockResetAt', 'freeViewResetAt', 'locationUpdatedAt',
  'planExpiresAt', 'profileExpiresAt', 'lastCheckedAt', 'lastSyncedAt',
]);

const JSON_FIELDS = new Set([
  'activityLogs', 'approvalSections', 'careerPageSettings', 'geoPoint',
  'hiringPreferences', 'location', 'locationData', 'profilePhotoApproval',
]);

const toJsonCompatible = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonCompatible);
  if (value && typeof value === 'object') {
    if (value.constructor && value.constructor !== Object && typeof value.toString === 'function') {
      return value.toString();
    }
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .map(([key, nested]) => [key, toJsonCompatible(nested)]),
    );
  }
  return value;
};

const normalizeDateFields = (data) => {
  for (const field of DATE_FIELDS) {
    if (typeof data[field] === 'number') data[field] = new Date(data[field]);
  }
};

function pickFields(source, allowedFields) {
  const data = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (allowedFields.has(key) && value !== undefined) data[key] = value;
  }
  normalizeDateFields(data);
  return data;
}

function prepareRecruiterProfileData(source) {
  const data = pickFields(source, RECRUITER_PROFILE_FIELDS);
  if (data.user != null) data.user = String(data.user);
  if (data.approvedBy != null) data.approvedBy = String(data.approvedBy);
  if (typeof data.city === 'string') data.city = data.city.trim();
  if (typeof data.state === 'string') data.state = data.state.trim();
  if (typeof data.nearestLocation === 'string') data.nearestLocation = data.nearestLocation.trim();
  if (typeof data.countryCode === 'string') data.countryCode = data.countryCode.trim().toUpperCase();

  const latitude = Number(data.location?.latitude ?? data.locationData?.latitude ?? data.latitude);
  const longitude = Number(data.location?.longitude ?? data.locationData?.longitude ?? data.longitude);
  if (Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180) {
    data.geoPoint = { type: 'Point', coordinates: [longitude, latitude] };
  }
  for (const field of JSON_FIELDS) {
    if (data[field] != null) data[field] = toJsonCompatible(data[field]);
  }
  return data;
}

function prepareCompanySourceData(source) {
  const data = pickFields(source, COMPANY_SOURCE_FIELDS);
  if (typeof data.companyDomain === 'string') data.companyDomain = data.companyDomain.toLowerCase().trim();
  if (typeof data.countryCode === 'string') data.countryCode = data.countryCode.toUpperCase().trim();
  if (typeof data.companyName === 'string') data.companyName = data.companyName.trim();
  if (typeof data.atsType === 'string') data.atsType = data.atsType.toLowerCase().trim();
  return data;
}

async function findRecruiterProfileByUserId(userId) {
  return withLegacyId(await prisma.recruiterProfile.findUnique({
    where: { user: String(userId) },
  }));
}

async function createRecruiterProfile(data) {
  return withLegacyId(await prisma.recruiterProfile.create({
    data: prepareRecruiterProfileData(data),
  }));
}

async function ensureRecruiterProfile(userId, defaults = {}) {
  const existing = await prisma.recruiterProfile.findUnique({
    where: { user: String(userId) },
  });
  if (existing) {
    return withLegacyId(existing);
  }
  const data = prepareRecruiterProfileData({ ...defaults, user: String(userId) });
  return withLegacyId(await prisma.recruiterProfile.create({
    data,
  }));
}

async function updateRecruiterProfile(userId, data) {
  return withLegacyId(await prisma.recruiterProfile.update({
    where: { user: String(userId) },
    data: prepareRecruiterProfileData(data),
  }));
}

async function saveRecruiterProfile(profile) {
  return withLegacyId(await prisma.recruiterProfile.update({
    where: { id: String(profile.id || profile._id) },
    data: prepareRecruiterProfileData(profile),
  }));
}

async function deleteRecruiterProfile(userId) {
  return withLegacyId(await prisma.recruiterProfile.delete({
    where: { user: String(userId) },
  }));
}

module.exports = {
  createRecruiterProfile,
  deleteRecruiterProfile,
  ensureRecruiterProfile,
  findRecruiterProfileByUserId,
  prepareCompanySourceData,
  prepareRecruiterProfileData,
  saveRecruiterProfile,
  updateRecruiterProfile,
  withCompanyId: withLegacyId,
  withCompanyIds: withLegacyIds,
};
