const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');

const EVENT_TYPES = {
  USER_REGISTERED: 'user_registered',
  PROFILE_COMPLETED: 'profile_completed',
  JOB_POSTED: 'job_posted',
  LEAD_CREATED: 'lead_created',
  LEAD_DISTRIBUTED: 'lead_distributed',
  CONTACT_UNLOCKED: 'contact_unlocked',
  LEAD_ACCEPTED: 'lead_accepted',
  PAYMENT_SUCCESS: 'payment_success',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
  FOLLOWUP_TRIGGERED: 'followup_triggered',
  DEAL_CONFIRMED: 'deal_confirmed',
  REVIEW_SUBMITTED: 'review_submitted',
};

async function logBusinessEvent({
  taskType,
  relatedEntityType = '',
  relatedEntityId = '',
  status = 'success',
  payload = {},
  result = {},
  error = '',
  idempotencyKey = '',
}) {
  return withLegacyId(await prisma.automationTaskLog.create({
    data: {
      taskType,
      relatedEntityType,
      relatedEntityId: relatedEntityId ? String(relatedEntityId) : '',
      status,
      attemptCount: 1,
      payload,
      result,
      error,
      executedAt: new Date(),
      idempotencyKey,
    },
  }));
}

async function logLeadEvent({
  leadId,
  eventType,
  payload = {},
  actorType = 'system',
  actorId = null,
}) {
  if (!leadId) return null;
  return withLegacyId(await prisma.leadEvent.create({
    data: {
      leadId: String(leadId),
      eventType,
      payload,
      actorType,
      actorId: actorId ? String(actorId) : null,
      timestamp: new Date(),
    },
  }));
}

module.exports = {
  EVENT_TYPES,
  logBusinessEvent,
  logLeadEvent,
};
