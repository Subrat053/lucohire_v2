const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { mapJob } = require('./jobPersistenceService');

const APPLICATION_FIELDS = new Set([
  'appliedAt', 'coverLetter', 'jobPost', 'provider', 'status',
]);

function referenceId(value) {
  if (value && typeof value === 'object') return String(value.id ?? value._id ?? value);
  return String(value);
}

function prepareApplicationData(source) {
  const data = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (APPLICATION_FIELDS.has(key) && value !== undefined) data[key] = value;
  }
  if (data.jobPost != null) data.jobPost = referenceId(data.jobPost);
  if (data.provider != null) data.provider = referenceId(data.provider);
  if (data.appliedAt != null && !(data.appliedAt instanceof Date)) data.appliedAt = new Date(data.appliedAt);
  return data;
}

function mapApplication(record) {
  if (!record) return record;
  const result = withLegacyId(record);
  if (Object.prototype.hasOwnProperty.call(result, 'jobPostRecord')) {
    result.jobPost = mapJob(result.jobPostRecord);
    delete result.jobPostRecord;
  }
  if (Object.prototype.hasOwnProperty.call(result, 'providerRecord')) {
    result.provider = withLegacyId(result.providerRecord);
    delete result.providerRecord;
  }
  return result;
}

function mapApplications(records) {
  return Array.isArray(records) ? records.map(mapApplication) : mapApplication(records);
}

function mapLead(record) {
  if (!record) return record;
  const result = withLegacyId(record);
  if (Object.prototype.hasOwnProperty.call(result, 'providerRecord')) {
    result.provider = withLegacyId(result.providerRecord);
    delete result.providerRecord;
  }
  if (Object.prototype.hasOwnProperty.call(result, 'jobPostRecord')) {
    result.jobPost = mapJob(result.jobPostRecord);
    delete result.jobPostRecord;
  }
  return result;
}

async function findApplicationByJobAndProvider(jobId, providerId) {
  return mapApplication(await prisma.application.findUnique({
    where: {
      jobPost_provider: { jobPost: String(jobId), provider: String(providerId) },
    },
  }));
}

async function createApplication({ job, providerId, coverLetter = '', status = 'pending' }) {
  const provider = String(providerId);
  const jobId = String(job.id || job._id);
  const applicants = Array.isArray(job.applicants) ? job.applicants.map(String) : [];

  return prisma.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: prepareApplicationData({ jobPost: jobId, provider, coverLetter, status }),
    });
    if (!applicants.includes(provider)) {
      await tx.jobPost.update({
        where: { id: jobId },
        data: { applicants: [...applicants, provider] },
      });
    }
    return mapApplication(application);
  });
}

async function listProviderApplications(providerId) {
  return mapApplications(await prisma.application.findMany({
    where: { provider: String(providerId) },
    include: {
      jobPostRecord: {
        include: {
          recruiterRecord: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  }));
}

async function listJobApplications(jobId) {
  return mapApplications(await prisma.application.findMany({
    where: { jobPost: String(jobId) },
    include: { providerRecord: { select: { id: true, name: true, email: true, phone: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  }));
}

async function findApplicationDetails(applicationId) {
  return mapApplication(await prisma.application.findUnique({
    where: { id: String(applicationId) },
    include: {
      jobPostRecord: true,
      providerRecord: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
    },
  }));
}

async function updateApplicationForRecruiter(applicationId, recruiterId, data) {
  const current = await findApplicationDetails(applicationId);
  if (!current) return { application: null, authorized: false };
  if (String(current.jobPost?.recruiter) !== String(recruiterId)) {
    return { application: current, authorized: false };
  }
  const updated = await prisma.application.update({
    where: { id: String(applicationId) },
    data: prepareApplicationData(data),
    include: { jobPostRecord: true },
  });
  return { application: mapApplication(updated), authorized: true };
}

async function deleteApplicationForRecruiter(applicationId, recruiterId) {
  const current = await findApplicationDetails(applicationId);
  if (!current) return { application: null, authorized: false };
  if (String(current.jobPost?.recruiter) !== String(recruiterId)) {
    return { application: current, authorized: false };
  }
  await prisma.application.delete({ where: { id: String(applicationId) } });
  await removeApplicantIfNoApplication(current.jobPost.id, current.provider.id);
  return { application: current, authorized: true };
}

async function removeApplicantIfNoApplication(jobId, providerId) {
  const remaining = await prisma.application.count({
    where: { jobPost: String(jobId), provider: String(providerId) },
  });
  if (remaining) return;
  const job = await prisma.jobPost.findUnique({
    where: { id: String(jobId) },
    select: { applicants: true },
  });
  if (job) {
    await prisma.jobPost.update({
      where: { id: String(jobId) },
      data: { applicants: job.applicants.filter((id) => String(id) !== String(providerId)) },
    });
  }
}

async function withdrawApplication(jobId, providerId) {
  const current = await findApplicationByJobAndProvider(jobId, providerId);
  if (!current) return null;
  await prisma.application.delete({ where: { id: current.id } });
  await removeApplicantIfNoApplication(jobId, providerId);
  return current;
}

function savedJobWhere(providerId, jobId, isExternal) {
  return {
    provider: String(providerId),
    isExternal: Boolean(isExternal),
    ...(isExternal
      ? { externalJob: String(jobId), jobPost: null }
      : { jobPost: String(jobId), externalJob: null }),
  };
}

async function findSavedJob(providerId, jobId, isExternal) {
  return withLegacyId(await prisma.savedJob.findFirst({
    where: savedJobWhere(providerId, jobId, isExternal),
  }));
}

async function toggleSavedJob(providerId, jobId, isExternal) {
  const target = isExternal
    ? await prisma.externalJob.findUnique({ where: { id: String(jobId) }, select: { id: true } })
    : await prisma.jobPost.findUnique({ where: { id: String(jobId) }, select: { id: true } });
  if (!target) return { savedJob: null, isSaved: false, notFound: true };
  const existing = await findSavedJob(providerId, jobId, isExternal);
  if (existing) {
    await prisma.savedJob.delete({ where: { id: existing.id } });
    return { savedJob: existing, isSaved: false };
  }
  const savedJob = await prisma.savedJob.create({
    data: savedJobWhere(providerId, jobId, isExternal),
  });
  return { savedJob: withLegacyId(savedJob), isSaved: true };
}

async function listSavedJobs(providerId) {
  const rows = await prisma.savedJob.findMany({
    where: { provider: String(providerId) },
    include: {
      jobPostRecord: {
        include: { recruiterRecord: { select: { id: true, name: true, email: true, avatar: true } } },
      },
      externalJobRecord: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((row) => {
    const result = withLegacyId(row);
    result.jobPost = mapJob(result.jobPostRecord);
    result.externalJob = withLegacyId(result.externalJobRecord);
    delete result.jobPostRecord;
    delete result.externalJobRecord;
    return result;
  });
}

async function listShortlistedCandidates(recruiterId) {
  const rows = await prisma.lead.findMany({
    where: { recruiter: String(recruiterId), type: 'shortlisted_candidate' },
    include: { providerRecord: { select: { id: true, name: true, email: true, phone: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapLead);
}

async function findCandidateLead(recruiterId, providerId, types) {
  return mapLead(await prisma.lead.findFirst({
    where: {
      recruiter: String(recruiterId),
      provider: String(providerId),
      ...(types?.length ? { type: { in: types } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  }));
}

async function ensureCandidateLead(recruiterId, providerId, defaults = {}) {
  const types = defaults.types || ['shortlisted_candidate'];
  const existing = await findCandidateLead(recruiterId, providerId, types);
  const data = {
    status: defaults.status || existing?.status || 'new',
    type: defaults.type || existing?.type || 'shortlisted_candidate',
    ...(defaults.notes !== undefined ? { notes: defaults.notes } : {}),
    ...(defaults.tags !== undefined ? { tags: defaults.tags } : {}),
  };
  if (existing) {
    return mapLead(await prisma.lead.update({ where: { id: existing.id }, data }));
  }
  return mapLead(await prisma.lead.create({
    data: {
      recruiter: String(recruiterId),
      provider: String(providerId),
      type: data.type,
      status: data.status,
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
    },
  }));
}

async function removeShortlistedCandidate(recruiterId, providerId) {
  return prisma.lead.deleteMany({
    where: {
      recruiter: String(recruiterId),
      provider: String(providerId),
      type: 'shortlisted_candidate',
    },
  });
}

async function listCandidateLeads(recruiterId, providerId) {
  return prisma.lead.findMany({
    where: { recruiter: String(recruiterId), provider: String(providerId) },
    orderBy: { createdAt: 'desc' },
  }).then((rows) => rows.map(mapLead));
}

async function deleteApplicationDataForUser(userId) {
  const normalizedUserId = String(userId);
  const providerApplications = await prisma.application.findMany({
    where: { provider: normalizedUserId },
    select: { jobPost: true },
  });
  const jobs = await prisma.jobPost.findMany({
    where: { recruiter: normalizedUserId },
    select: { id: true },
  });
  const jobIds = jobs.map((job) => job.id);
  const relatedWhere = {
    OR: [
      { provider: normalizedUserId },
      ...(jobIds.length ? [{ jobPost: { in: jobIds } }] : []),
    ],
  };
  await prisma.savedJob.deleteMany({ where: relatedWhere });
  await prisma.application.deleteMany({ where: relatedWhere });
  for (const jobId of new Set(providerApplications.map((application) => application.jobPost))) {
    await removeApplicantIfNoApplication(jobId, normalizedUserId);
  }
  await prisma.lead.deleteMany({
    where: { OR: [{ provider: normalizedUserId }, { recruiter: normalizedUserId }] },
  });
  return { jobIds };
}

module.exports = {
  createApplication,
  deleteApplicationDataForUser,
  deleteApplicationForRecruiter,
  findApplicationByJobAndProvider,
  findApplicationDetails,
  findCandidateLead,
  findSavedJob,
  listJobApplications,
  listCandidateLeads,
  listProviderApplications,
  listSavedJobs,
  listShortlistedCandidates,
  mapLead,
  mapApplication,
  mapApplications,
  prepareApplicationData,
  savedJobWhere,
  ensureCandidateLead,
  removeShortlistedCandidate,
  toggleSavedJob,
  updateApplicationForRecruiter,
  withdrawApplication,
};
