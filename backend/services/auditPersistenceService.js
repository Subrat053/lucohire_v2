const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');

function referenceId(value) {
  if (value && typeof value === 'object') return String(value.id ?? value._id ?? value);
  return String(value);
}

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

function pageOptions(page, limit, defaultLimit = 20) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || defaultLimit));
  return { page: pageNum, limit: limitNum, skip: (pageNum - 1) * limitNum };
}

function dateWhere(start, end) {
  if (!start && !end) return undefined;
  return {
    ...(start ? { gte: start instanceof Date ? start : new Date(start) } : {}),
    ...(end ? { lte: end instanceof Date ? end : new Date(end) } : {}),
  };
}

function prepareApprovalLogData(source) {
  return {
    targetType: String(source.targetType),
    targetProfileId: referenceId(source.targetProfileId),
    targetUserId: referenceId(source.targetUserId),
    targetName: String(source.targetName || ''),
    action: String(source.action),
    note: String(source.note || ''),
    actorId: referenceId(source.actorId),
    actorName: String(source.actorName || ''),
    actorRole: String(source.actorRole || 'admin'),
  };
}

async function createApprovalLog(data) {
  return withLegacyId(await prisma.approvalLog.create({ data: prepareApprovalLogData(data) }));
}

async function listApprovalLogs(filters = {}) {
  const pagination = pageOptions(filters.page, filters.limit, 50);
  const where = {
    ...(filters.actorId ? { actorId: String(filters.actorId) } : {}),
    ...(filters.targetType ? { targetType: String(filters.targetType) } : {}),
    ...(filters.action ? { action: String(filters.action) } : {}),
    ...(filters.search ? { OR: [
      { actorName: { contains: String(filters.search), mode: 'insensitive' } },
      { targetName: { contains: String(filters.search), mode: 'insensitive' } },
      { note: { contains: String(filters.search), mode: 'insensitive' } },
    ] } : {}),
    ...(dateWhere(filters.startDate, filters.endDate)
      ? { createdAt: dateWhere(filters.startDate, filters.endDate) } : {}),
  };
  const [logs, total] = await Promise.all([
    prisma.approvalLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pagination.skip, take: pagination.limit }),
    prisma.approvalLog.count({ where }),
  ]);
  return { logs: withLegacyIds(logs), total, ...pagination };
}

async function createVisitHistory(data) {
  return withLegacyId(await prisma.visitHistory.create({
    data: {
      user: referenceId(data.user),
      type: String(data.type),
      ...(data.visitedUser != null ? { visitedUser: referenceId(data.visitedUser) } : {}),
      ...(data.visitedProfile != null ? { visitedProfile: referenceId(data.visitedProfile) } : {}),
      ...(data.searchCity != null ? { searchCity: String(data.searchCity) } : {}),
      ...(data.searchQuery != null ? { searchQuery: String(data.searchQuery) } : {}),
      ...(data.searchSkill != null ? { searchSkill: String(data.searchSkill) } : {}),
      ...(data.metadata != null ? { metadata: jsonValue(data.metadata) } : {}),
    },
  }));
}

async function listVisitHistory(where, limit = 30, populate = null) {
  const normalizedWhere = {
    ...(where.user != null ? { user: referenceId(where.user) } : {}),
    ...(where.visitedUser != null ? { visitedUser: referenceId(where.visitedUser) } : {}),
    ...(where.type != null ? { type: String(where.type) } : {}),
  };
  const include = populate === 'visited'
    ? {
        visitedUserRecord: { select: { id: true, name: true, avatar: true } },
        visitedProfileRecord: { select: { id: true, skills: true, city: true, rating: true, profilePhoto: true } },
      }
    : populate === 'visitor'
      ? { userRecord: { select: { id: true, name: true, email: true, avatar: true } } }
      : undefined;
  const rows = await prisma.visitHistory.findMany({
    where: normalizedWhere,
    ...(include ? { include } : {}),
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Number(limit) || 30),
  });
  return rows.map((row) => {
    const result = withLegacyId(row);
    if (result.visitedUserRecord !== undefined) {
      result.visitedUser = withLegacyId(result.visitedUserRecord);
      delete result.visitedUserRecord;
    }
    if (result.visitedProfileRecord !== undefined) {
      result.visitedProfile = withLegacyId(result.visitedProfileRecord);
      delete result.visitedProfileRecord;
    }
    if (result.userRecord !== undefined) {
      result.user = withLegacyId(result.userRecord);
      delete result.userRecord;
    }
    return result;
  });
}

async function createResumeAccessLog(data) {
  return withLegacyId(await prisma.resumeAccessLog.create({
    data: {
      recruiterId: referenceId(data.recruiterId),
      candidateId: referenceId(data.candidateId),
      resumeObjectKey: String(data.resumeObjectKey),
      expiresAt: data.expiresAt instanceof Date ? data.expiresAt : new Date(data.expiresAt),
      ipAddress: String(data.ipAddress || ''),
      userAgent: String(data.userAgent || ''),
    },
  }));
}

function mapResumeAccessLog(record) {
  const result = withLegacyId(record);
  if (result?.recruiterIdRecord !== undefined) {
    result.recruiterId = withLegacyId(result.recruiterIdRecord);
    delete result.recruiterIdRecord;
  }
  if (result?.candidateIdRecord !== undefined) {
    result.candidateId = withLegacyId(result.candidateIdRecord);
    delete result.candidateIdRecord;
  }
  return result;
}

async function listResumeAccessLogs(filters = {}) {
  const pagination = pageOptions(filters.page, filters.limit);
  const now = new Date();
  const where = {
    ...(dateWhere(filters.startDate, filters.endDate)
      ? { createdAt: dateWhere(filters.startDate, filters.endDate) } : {}),
    ...(filters.status === 'active' ? { expiresAt: { gt: now } } : {}),
    ...(filters.status === 'expired' ? { expiresAt: { lte: now } } : {}),
    ...(filters.search ? { OR: [
      { resumeObjectKey: { contains: filters.search, mode: 'insensitive' } },
      { ipAddress: { contains: filters.search, mode: 'insensitive' } },
      { recruiterIdRecord: { is: { OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ] } } },
      { candidateIdRecord: { is: { OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ] } } },
    ] } : {}),
  };
  const include = {
    recruiterIdRecord: { select: { id: true, name: true, email: true } },
    candidateIdRecord: { select: { id: true, name: true, email: true } },
  };
  const [rows, total] = await Promise.all([
    prisma.resumeAccessLog.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: pagination.skip, take: pagination.limit }),
    prisma.resumeAccessLog.count({ where }),
  ]);
  return { logs: rows.map(mapResumeAccessLog), total, ...pagination };
}

async function listOtpLogs(filters = {}) {
  const pagination = pageOptions(filters.page, filters.limit);
  const now = new Date();
  const where = {
    ...(filters.channel ? { channel: String(filters.channel) } : {}),
    ...(filters.status === 'verified' ? { verifiedAt: { not: null } } : {}),
    ...(filters.status === 'blocked' ? { blockedUntil: { gt: now } } : {}),
    ...(filters.status === 'expired' ? { verifiedAt: null, expiresAt: { lt: now } } : {}),
    ...(filters.status === 'pending' ? {
      verifiedAt: null,
      expiresAt: { gte: now },
      OR: [{ blockedUntil: null }, { blockedUntil: { lt: now } }],
    } : {}),
    ...(dateWhere(filters.startDate, filters.endDate)
      ? { createdAt: dateWhere(filters.startDate, filters.endDate) } : {}),
    ...(filters.search ? {
      AND: [{ OR: [
        { target: { contains: String(filters.search), mode: 'insensitive' } },
        { purpose: { contains: String(filters.search), mode: 'insensitive' } },
        { userIdRecord: { is: { OR: [
          { name: { contains: String(filters.search), mode: 'insensitive' } },
          { email: { contains: String(filters.search), mode: 'insensitive' } },
        ] } } },
      ] }],
    } : {}),
  };
  const query = {
    where,
    select: {
      id: true, attempts: true, blockedUntil: true, channel: true, countryCode: true,
      createdAt: true, expiresAt: true, ipAddress: true, providerUsed: true,
      purpose: true, resendCount: true, resendWindowStart: true, target: true,
      updatedAt: true, userAgent: true, userId: true, verifiedAt: true,
      userIdRecord: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: pagination.skip,
    take: pagination.limit,
  };
  const [rows, total] = await Promise.all([prisma.otp.findMany(query), prisma.otp.count({ where })]);
  const logs = rows.map((row) => {
    const result = withLegacyId(row);
    result.userId = withLegacyId(result.userIdRecord);
    delete result.userIdRecord;
    return result;
  });
  return { logs, total, ...pagination };
}

async function createOtpLog(data) {
  return withLegacyId(await prisma.otp.create({
    data: {
      ...(data.userId != null ? { userId: referenceId(data.userId) } : {}),
      target: String(data.target),
      channel: String(data.channel),
      purpose: String(data.purpose),
      otpHash: String(data.otpHash),
      expiresAt: data.expiresAt instanceof Date ? data.expiresAt : new Date(data.expiresAt),
      ...(data.providerUsed != null ? { providerUsed: String(data.providerUsed) } : {}),
      ...(data.ipAddress != null ? { ipAddress: String(data.ipAddress) } : {}),
      ...(data.userAgent != null ? { userAgent: String(data.userAgent) } : {}),
    },
  }));
}

async function markLatestOtpVerified({ userId, purpose }) {
  const record = await prisma.otp.findFirst({
    where: { userId: referenceId(userId), purpose: String(purpose) },
    orderBy: { createdAt: 'desc' },
    select: { id: true, verifiedAt: true },
  });
  if (!record || record.verifiedAt) return record ? withLegacyId(record) : null;
  return withLegacyId(await prisma.otp.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  }));
}

async function createContactClickLog(data) {
  return withLegacyId(await prisma.contactClickLog.create({
    data: {
      user: referenceId(data.user),
      provider: referenceId(data.provider),
      actionType: String(data.actionType),
    },
  }));
}

async function listContactClickLogs(filters = {}) {
  const pagination = pageOptions(filters.page, filters.limit);
  const include = {
    userRecord: { select: { id: true, name: true, email: true, phone: true } },
    providerRecord: {
      select: {
        id: true, profileName: true, designation: true,
        userRecord: { select: { id: true, name: true, email: true, phone: true } },
      },
    },
  };
  const [rows, total] = await Promise.all([
    prisma.contactClickLog.findMany({ include, orderBy: { createdAt: 'desc' }, skip: pagination.skip, take: pagination.limit }),
    prisma.contactClickLog.count(),
  ]);
  const logs = rows.map((row) => {
    const result = withLegacyId(row);
    result.user = withLegacyId(result.userRecord);
    result.provider = withLegacyId(result.providerRecord);
    if (result.provider) {
      result.provider.user = withLegacyId(result.provider.userRecord);
      delete result.provider.userRecord;
    }
    delete result.userRecord;
    delete result.providerRecord;
    return result;
  });
  return { logs, total, ...pagination };
}

async function createWhatsappLog(data) {
  return withLegacyId(await prisma.whatsappLog.create({
    data: {
      ...(data.user != null ? { user: referenceId(data.user) } : {}),
      phone: String(data.phone),
      templateName: String(data.templateName),
      message: String(data.message || ''),
      status: String(data.status || 'sent'),
      triggerEvent: String(data.triggerEvent || ''),
      ...(data.metadata != null ? { metadata: jsonValue(data.metadata) } : {}),
    },
  }));
}

async function listWhatsappLogs(filters = {}) {
  const pagination = pageOptions(filters.page, filters.limit, 30);
  const [rows, total] = await Promise.all([
    prisma.whatsappLog.findMany({
      include: { userRecord: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' }, skip: pagination.skip, take: pagination.limit,
    }),
    prisma.whatsappLog.count(),
  ]);
  const logs = rows.map((row) => {
    const result = withLegacyId(row);
    result.user = withLegacyId(result.userRecord);
    delete result.userRecord;
    return result;
  });
  return { logs, total, ...pagination };
}

async function createRecruiterSearchLog(data) {
  return withLegacyId(await prisma.recruiterSearchLog.create({
    data: {
      recruiterId: referenceId(data.recruiterId),
      query: String(data.query),
      resultCount: Number(data.resultCount || 0),
      ...(data.parsedIntent != null ? { parsedIntent: jsonValue(data.parsedIntent) } : {}),
      ...(data.wasSuccessful != null ? { wasSuccessful: Boolean(data.wasSuccessful) } : {}),
      ...(data.hiredProviderId != null ? { hiredProviderId: referenceId(data.hiredProviderId) } : {}),
      ...(data.semanticEmbeddingModel ? { semanticEmbeddingModel: String(data.semanticEmbeddingModel) } : {}),
    },
  }));
}

async function createCandidateActivityLog(data) {
  return withLegacyId(await prisma.candidateActivityLog.create({
    data: {
      candidateId: referenceId(data.candidateId),
      eventType: String(data.eventType),
      source: String(data.source || 'System'),
      ...(data.metadataJson != null ? { metadataJson: jsonValue(data.metadataJson) } : {}),
    },
  }));
}

module.exports = {
  createApprovalLog,
  createCandidateActivityLog,
  createContactClickLog,
  createOtpLog,
  createRecruiterSearchLog,
  createResumeAccessLog,
  createVisitHistory,
  createWhatsappLog,
  dateWhere,
  listApprovalLogs,
  listContactClickLogs,
  listOtpLogs,
  listResumeAccessLogs,
  listVisitHistory,
  listWhatsappLogs,
  markLatestOtpVerified,
  pageOptions,
  prepareApprovalLogData,
};
