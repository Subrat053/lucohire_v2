const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');

const ref = (value) => String(value?.id ?? value?._id ?? value);

const required = (value, field) => {
  const normalized = value?.id ?? value?._id ?? value;
  if (normalized === undefined || normalized === null || String(normalized).trim() === '') {
    throw new TypeError(`${field} is required`);
  }
  return String(normalized);
};

const json = (value) => {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(json);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .map(([key, nested]) => [key, json(nested)]));
  }
  return value;
};

function notificationData(source) {
  return {
    userId: required(source.userId, 'userId'),
    type: required(source.type, 'type'),
    title: required(source.title, 'title'),
    message: required(source.message, 'message'),
    data: json(source.data ?? {}),
    ...(source.isRead !== undefined ? { isRead: Boolean(source.isRead) } : {}),
    ...(source.automationSource !== undefined ? { automationSource: String(source.automationSource || '') } : {}),
    ...(source.sourceTag !== undefined ? { sourceTag: String(source.sourceTag || '') } : {}),
    ...(source.user !== undefined ? { user: json(source.user) } : {}),
  };
}

function candidateDigestLogData(source) {
  return {
    candidate: required(source.candidate, 'candidate'),
    date: required(source.date, 'date'),
    ...(source.jobsMatched !== undefined ? { jobsMatched: source.jobsMatched.map(ref) } : {}),
    ...(source.channels !== undefined ? { channels: source.channels.map(String) } : {}),
    ...(source.emailStatus !== undefined ? { emailStatus: String(source.emailStatus) } : {}),
    ...(source.whatsappStatus !== undefined ? { whatsappStatus: String(source.whatsappStatus) } : {}),
    ...(source.error !== undefined ? { error: String(source.error || '') } : {}),
    ...(source.sentAt !== undefined ? { sentAt: new Date(source.sentAt) } : {}),
  };
}

function mapNotification(record) {
  if (!record) return record;
  const result = withLegacyId(record);
  if (result.userIdRecord !== undefined) {
    result.userId = withLegacyId(result.userIdRecord);
    delete result.userIdRecord;
  }
  return result;
}

async function createNotificationRecord(data) {
  return mapNotification(await prisma.notification.create({ data: notificationData(data) }));
}

async function createCandidateDigestLog(data) {
  return withLegacyId(await prisma.candidateDigestLog.create({ data: candidateDigestLogData(data) }));
}

async function findCandidateDigestLog(where) {
  const normalized = {
    ...where,
    ...(where.candidate !== undefined ? { candidate: ref(where.candidate) } : {}),
  };
  return withLegacyId(await prisma.candidateDigestLog.findFirst({ where: normalized }));
}

async function deleteCandidateDigestLogs(candidate) {
  return prisma.candidateDigestLog.deleteMany({ where: { candidate: ref(candidate) } });
}

async function createNotificationRecords(records) {
  if (!records.length) return [];
  return withLegacyIds(await prisma.notification.createManyAndReturn({
    data: records.map(notificationData),
  }));
}

async function countNotifications(where) {
  return prisma.notification.count({ where });
}

async function findNotification(where) {
  return mapNotification(await prisma.notification.findFirst({ where }));
}

async function listNotifications({ userId, page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const where = userId == null ? {} : { userId: ref(userId) };
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (pageNum - 1) * limitNum, take: limitNum,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ]);
  return { notifications: withLegacyIds(notifications), total, unreadCount, page: pageNum, limit: limitNum };
}

async function markNotificationRead(id, userId) {
  const where = { id: ref(id), userId: ref(userId), isRead: false };
  await prisma.notification.updateMany({ where, data: { isRead: true } });
  return mapNotification(await prisma.notification.findFirst({
    where: { id: ref(id), userId: ref(userId) },
  }));
}

async function markAllNotificationsRead(userId) {
  return prisma.notification.updateMany({
    where: { userId: ref(userId), isRead: false }, data: { isRead: true },
  });
}

async function deleteNotificationRecord(id, userId) {
  const where = { id: ref(id), userId: ref(userId) };
  const existing = await prisma.notification.findFirst({ where, select: { id: true } });
  if (!existing) return null;
  await prisma.notification.delete({ where: { id: existing.id } });
  return withLegacyId(existing);
}

async function deleteNotificationsForUser(userId) {
  return prisma.notification.deleteMany({ where: { userId: ref(userId) } });
}

module.exports = {
  candidateDigestLogData,
  countNotifications,
  createCandidateDigestLog,
  createNotificationRecord,
  createNotificationRecords,
  deleteNotificationRecord,
  deleteCandidateDigestLogs,
  deleteNotificationsForUser,
  findNotification,
  findCandidateDigestLog,
  json,
  listNotifications,
  mapNotification,
  markAllNotificationsRead,
  markNotificationRead,
  notificationData,
  ref,
};
