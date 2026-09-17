const prisma = require('../config/prisma');
const {
  countNotifications,
  createNotificationRecord,
  createNotificationRecords,
} = require('./communicationPersistenceService');
const { mapUserSubscription } = require('./billingPersistenceService');
const { sendMail } = require('./mailService');

// Socket.io instance (set from server.js)
let io = null;

function setIO(socketIO) {
  io = socketIO;
}

function getIO() {
  return io;
}

const emitNotificationToUser = async (userId, notification) => {
  if (!io) return;

  const userRoom = `user_${userId}`;
  const payload = {
    _id: notification._id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data || {},
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };

  io.to(userRoom).emit('new_notification', payload);
  // Backward compatibility for any existing listeners.
  io.to(userRoom).emit('notification', payload);

  const unreadCount = await countNotifications({ userId: String(userId), isRead: false });
  io.to(userRoom).emit('unread_count', { unreadCount });
};

/**
 * Create an in-app notification and emit via socket.io if connected.
 */
async function createNotification({ userId, type, title, message, data = {} }) {
  const notification = await createNotificationRecord({
    userId,
    type,
    title,
    message,
    data,
  });

  await emitNotificationToUser(userId, notification);

  return notification;
}

async function createBulkNotifications(userIds, payload) {
  const uniqueUserIds = [...new Set((userIds || []).map(String))];
  if (uniqueUserIds.length === 0) return [];

  const docs = uniqueUserIds.map((id) => ({
    userId: id,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    data: payload.data || {},
  }));

  const notifications = await createNotificationRecords(docs);

  if (io) {
    await Promise.all(notifications.map((notification) => emitNotificationToUser(notification.userId.toString(), notification)));
  }

  return notifications;
}

/**
 * Notify eligible providers when a new job is posted.
 * Filters by skill + city and only provider users with active subscriptions.
 */
async function notifyProvidersOfNewJob(job, matchedProviderUserIds = []) {
  if (Array.isArray(matchedProviderUserIds) && matchedProviderUserIds.length > 0) {
    const userIds = [...new Set(matchedProviderUserIds.map(String))];
    await createBulkNotifications(userIds, {
      type: 'JOB_POSTED',
      title: 'New Job Posted',
      message: 'A new job matching your skills is available',
      data: { jobId: job._id, skill: job.skill, city: job.city },
    });
    return userIds;
  }

  const now = new Date();
  const activeSubs = (await prisma.userSubscription.findMany({
    where: { status: 'active', endDate: { gt: now } },
    include: { planIdRecord: true, userIdRecord: { select: { id: true, role: true } } },
  })).map(mapUserSubscription);

  const eligibleProviderUserIds = activeSubs
    .filter((sub) => sub.planId && sub.userId && sub.userId.role === 'provider'
      && (sub.planId.jobNotification || sub.planId.metadata?.jobNotification))
    .map((sub) => sub.userId._id.toString());

  if (eligibleProviderUserIds.length === 0) return [];

  const candidates = await prisma.providerProfile.findMany({
    where: { user: { in: eligibleProviderUserIds }, isApproved: true },
    select: { user: true, skills: true, city: true },
  });
  const skill = String(job.skill || '').toLowerCase();
  const city = String(job.city || '').toLowerCase();
  const matchedProviders = candidates.filter((profile) =>
    profile.skills.some((item) => String(item).toLowerCase().includes(skill))
      && String(profile.city || '').toLowerCase().startsWith(city));

  const recipientUserIds = matchedProviders.map((p) => p.user.toString());
  if (recipientUserIds.length === 0) return [];

  await createBulkNotifications(recipientUserIds, {
    type: 'JOB_POSTED',
    title: 'New Job Posted',
    message: 'A new job matching your skills is available',
    data: { jobId: job._id, skill: job.skill, city: job.city },
  });

  return recipientUserIds;
}

async function sendExternalRecruiterMatchEmail(job, email, matchedCount = 1) {
  try {
    const magicUrl = `${process.env.FRONTEND_URL || 'https://www.lucohire.com'}/external-match?jobId=${job._id}&category=${encodeURIComponent(job.skill)}`;
    const subject = `Found ${matchedCount} matching candidate(s) for your job: ${job.title}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:520px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 10px;color:#1f2937;">Matching Candidates Found!</h2>
        <p style="margin:0 0 14px;">We noticed your job posting for "<strong>${job.title}</strong>" and we have <strong>${matchedCount}</strong> pre-screened candidate(s) ready to start in your area.</p>
        <p style="margin:0 0 14px;">Click the button below to instantly view their profiles and contact them for free:</p>
        <a href="${magicUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">View Candidates</a>
        <p style="margin:14px 0 0;font-size:12px;color:#6b7280;">Lucohire automatically connects recruiters with verified local workers.</p>
      </div>
    `;
    await sendMail({ to: email, subject, text: `Matches found for ${job.title}`, html });
    console.log(`External recruiter email sent to ${email} for job ${job._id}`);
  } catch (err) {
    console.error('Failed to send external recruiter email', err);
  }
}

module.exports = {
  setIO,
  getIO,
  createNotification,
  createBulkNotifications,
  notifyProvidersOfNewJob,
  sendExternalRecruiterMatchEmail,
};
