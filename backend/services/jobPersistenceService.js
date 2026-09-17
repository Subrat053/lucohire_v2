const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');

const JOB_FIELDS = new Set([
  'aiGenerated', 'applicants', 'applyMode', 'applyUrl', 'boostExpiresAt',
  'boostedAt', 'budget', 'budgetMax', 'budgetMin', 'budgetType', 'candidates',
  'category', 'city', 'cityName', 'companyDomain', 'companyInfo', 'companyName',
  'countryCode', 'currency', 'description', 'duplicateHash', 'embedding',
  'embeddingText', 'experienceRequired', 'expiresAt', 'externalJobId',
  'externalUrl', 'firstSeenAt', 'geoPoint', 'isActive', 'isBoosted',
  'isExternal', 'jobLocationData', 'jobOrigin', 'jobType', 'lastSeenAt',
  'lastSyncedAt', 'latitude', 'locality', 'location', 'locationData',
  'locationText', 'longitude', 'matchRadiusUsed', 'matchedProviders',
  'maxBudget', 'minBudget', 'nativeLanguage', 'pricingType', 'recruiter',
  'relocationSupport', 'requiredSkillLevel', 'requirements', 'salaryPeriod',
  'scheduleType', 'seoSlug', 'skill', 'skillsTags', 'source', 'sourceJobUrl',
  'sourceType', 'speciality', 'status', 'timeOfDay', 'title', 'urgency',
  'workMode',
]);

const JOB_DATE_FIELDS = new Set([
  'boostExpiresAt', 'boostedAt', 'expiresAt', 'firstSeenAt', 'lastSeenAt',
  'lastSyncedAt',
]);

const JOB_JSON_FIELDS = new Set([
  'aiGenerated', 'budget', 'candidates', 'embedding', 'geoPoint',
  'jobLocationData', 'location', 'locationData',
]);

const SKILL_CATEGORY_FIELDS = new Set([
  'deactivatedAt', 'deactivatedBy', 'deactivationReason', 'icon', 'isActive',
  'name', 'reactivatedAt', 'reactivatedBy', 'skills', 'slug', 'sortOrder',
  'tier', 'type',
]);

function jsonValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .map(([key, nested]) => [key, jsonValue(nested)]));
  }
  return value;
}

function pick(source, allowed) {
  return Object.fromEntries(Object.entries(source || {})
    .filter(([key, value]) => allowed.has(key) && value !== undefined));
}

function referenceId(value) {
  if (value && typeof value === 'object') return String(value.id ?? value._id ?? value);
  return String(value);
}

function prepareJobData(source) {
  const data = pick(source, JOB_FIELDS);
  if (data.recruiter != null) data.recruiter = referenceId(data.recruiter);
  for (const field of JOB_DATE_FIELDS) {
    if (data[field] != null && !(data[field] instanceof Date)) data[field] = new Date(data[field]);
  }
  for (const field of JOB_JSON_FIELDS) {
    if (data[field] === null) data[field] = Prisma.JsonNull;
    else if (data[field] != null) data[field] = jsonValue(data[field]);
  }
  for (const field of ['budgetMin', 'budgetMax', 'minBudget', 'maxBudget', 'latitude', 'longitude', 'matchRadiusUsed']) {
    if (data[field] !== undefined && data[field] !== null) data[field] = Number(data[field]);
  }
  for (const field of ['applicants', 'matchedProviders']) {
    if (Array.isArray(data[field])) data[field] = data[field].map(referenceId);
  }
  if (Array.isArray(data.requirements)) data.requirements = data.requirements.map(String);
  if (Array.isArray(data.skillsTags)) data.skillsTags = data.skillsTags.map(String);
  return data;
}

function mapJob(record) {
  if (!record) return record;
  const result = withLegacyId(record);
  if (Object.prototype.hasOwnProperty.call(result, 'recruiterRecord')) {
    const recruiterRecord = result.recruiterRecord;
    const recruiterProfile = recruiterRecord?.recruiterProfile_userLinks?.[0];
    result.recruiter = recruiterRecord ? withLegacyId({
      ...recruiterRecord,
      ...(recruiterProfile ? {
        companyName: recruiterProfile.companyName,
        profilePicture: recruiterProfile.profilePhoto || recruiterRecord.avatar,
      } : {}),
    }) : null;
    if (result.recruiter) delete result.recruiter.recruiterProfile_userLinks;
    delete result.recruiterRecord;
  }
  return result;
}

function mapJobs(records) {
  return Array.isArray(records) ? records.map(mapJob) : mapJob(records);
}

async function createJob(data) {
  return mapJob(await prisma.jobPost.create({ data: prepareJobData(data) }));
}

async function findJobById(id, options = {}) {
  return mapJob(await prisma.jobPost.findUnique({
    where: { id: String(id) },
    ...(options.includeRecruiter ? {
      include: { recruiterRecord: { select: options.recruiterSelect || { id: true, name: true, email: true } } },
    } : {}),
  }));
}

async function findOwnedJob(id, recruiterId) {
  return mapJob(await prisma.jobPost.findFirst({
    where: { id: String(id), recruiter: String(recruiterId) },
  }));
}

async function updateJob(id, data) {
  return mapJob(await prisma.jobPost.update({
    where: { id: String(id) },
    data: prepareJobData(data),
  }));
}

async function updateOwnedJob(id, recruiterId, data) {
  const where = { id: String(id), recruiter: String(recruiterId) };
  const result = await prisma.jobPost.updateMany({ where, data: prepareJobData(data) });
  if (!result.count) return null;
  return mapJob(await prisma.jobPost.findUnique({ where: { id: String(id) } }));
}

function prepareSkillCategoryData(source) {
  const data = pick(source, SKILL_CATEGORY_FIELDS);
  for (const field of ['deactivatedAt', 'reactivatedAt']) {
    if (data[field] != null && !(data[field] instanceof Date)) data[field] = new Date(data[field]);
  }
  for (const field of ['deactivatedBy', 'reactivatedBy']) {
    if (data[field] != null) data[field] = String(data[field]);
  }
  if (data.skills != null) data.skills = jsonValue(data.skills);
  if (data.sortOrder != null) data.sortOrder = Number(data.sortOrder);
  return data;
}

module.exports = {
  createJob,
  findJobById,
  findOwnedJob,
  mapJob,
  mapJobs,
  prepareJobData,
  prepareSkillCategoryData,
  updateJob,
  updateOwnedJob,
  withMetadataId: withLegacyId,
  withMetadataIds: withLegacyIds,
};
