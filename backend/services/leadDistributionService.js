const crypto = require('crypto');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { createMagicLinkToken, prepareUserData } = require('./authPersistenceService');
const { createNotification } = require('./notificationService');
const { sendMail } = require('./mailService');
const { logBusinessEvent, logLeadEvent, EVENT_TYPES } = require('./eventLogService');

const enabled = (name) => String(process.env[name] || '').toLowerCase() === 'true';

function asProviderUserId(provider) {
  if (!provider) return null;
  if (provider.user && typeof provider.user === 'object') {
    const id = provider.user.id || provider.user._id;
    return id ? String(id) : null;
  }
  if (provider.user) return String(provider.user);
  return null;
}

function computeLoadPenalty(metrics) {
  const assigned = Number(metrics?.totalAssignedLeads || 0);
  const accepted = Number(metrics?.totalAcceptedLeads || 0);
  const ratio = assigned > 0 ? accepted / assigned : 0.5;
  return {
    assigned,
    acceptanceRatio: ratio,
    penalty: Math.min(12, Math.max(0, assigned * 0.3) + (ratio < 0.3 ? 6 : 0)),
  };
}

async function enrichWithLoadBalance(candidates) {
  const providerIds = candidates
    .map((item) => asProviderUserId(item))
    .filter(Boolean);

  const metrics = await prisma.providerMetrics.findMany({
    where: { providerId: { in: providerIds } },
  });
  const metricMap = new Map(metrics.map((item) => [String(item.providerId), item]));

  return candidates.map((candidate) => {
    const providerId = asProviderUserId(candidate);
    const metric = providerId ? metricMap.get(providerId) : null;
    const load = computeLoadPenalty(metric);
    const adjustedScore = Math.max(0, Number(candidate.matchScore || 0) - load.penalty);

    return {
      ...candidate,
      adjustedScore: Number(adjustedScore.toFixed(2)),
      loadMeta: load,
    };
  });
}

async function createLeadAndLog({ distributionBatchId, provider, recruiterId, jobId, intentId, position }) {
  const providerUserId = asProviderUserId(provider);
  if (!providerUserId) return null;

  const leadData = {
    provider: providerUserId,
    recruiter: String(recruiterId),
    jobPost: jobId ? String(jobId) : null,
    type: 'job_match',
    status: 'new',
    sourceType: 'ai_assisted',
    assignedByEngine: true,
    priorityScore: Number(provider.adjustedScore || provider.matchScore || 0),
    message: 'Naya kaam mila hai, accept karein?',
  };
  const lead = withLegacyId(jobId
    ? await prisma.lead.upsert({
        where: { provider_recruiter_jobPost: {
          provider: providerUserId,
          recruiter: String(recruiterId),
          jobPost: String(jobId),
        } },
        create: leadData,
        update: {
          status: leadData.status,
          sourceType: leadData.sourceType,
          assignedByEngine: true,
          priorityScore: leadData.priorityScore,
          message: leadData.message,
        },
      })
    : await prisma.lead.create({ data: leadData }));

  await prisma.leadDistributionLog.create({ data: {
    distributionBatchId,
    jobId: jobId ? String(jobId) : null,
    recruiterId: String(recruiterId),
    intentId: intentId ? String(intentId) : null,
    providerId: providerUserId,
    position: Number(position),
    matchScore: Number(provider.adjustedScore || provider.matchScore || 0),
    reason: Array.isArray(provider.reasons) ? provider.reasons.map(String) : [],
    status: 'sent',
  } });

  await prisma.providerMetrics.upsert({
    where: { providerId: providerUserId },
    create: { providerId: providerUserId, lastLeadAssignedAt: new Date(), totalAssignedLeads: 1 },
    update: { lastLeadAssignedAt: new Date(), totalAssignedLeads: { increment: 1 } },
  });

  await logLeadEvent({
    leadId: lead._id,
    eventType: EVENT_TYPES.LEAD_DISTRIBUTED,
    payload: { distributionBatchId, position },
    actorType: 'system',
  });

  await createNotification({
    userId: providerUserId,
    type: 'LEAD_DISTRIBUTED',
    title: 'Naya kaam mila hai',
    message: 'Aapko ek naya matched lead mila hai. Jaldi response dein.',
    data: { leadId: lead._id, jobId: jobId || null, distributionBatchId },
  });

  if (enabled('ENABLE_COMMUNICATION_PROVIDERS')) try {
    const providerUser = provider.user || null;
    if (providerUser && providerUser.email) {
      const subject = `Naya kaam mila hai! A new job matches your profile`;
      const frontendUrl = process.env.FRONTEND_URL || 'https://www.lucohire.com';
      const link = `${frontendUrl}/login`; // Or link to the specific job lead if applicable
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 10px;color:#1f2937;">Naya Kaam Mila Hai!</h2>
          <p style="margin:0 0 14px;">Great news! You've matched with a new job that fits your skills on Lucohire.</p>
          <p style="margin:0 0 14px;">Log in now to review the job details and respond to the recruiter before someone else does!</p>
          <a href="${link}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">View Your Lead</a>
        </div>
      `;
      await sendMail({ to: providerUser.email, subject, text: subject, html });
    }
  } catch (err) {
    console.error('Failed to send email to matched provider', err);
  }

  return lead;
}

async function distributeLeadToTopProviders({ intent, recruiterId, jobId = null, intentId = null, limit = 5, options = {} }) {
  if (!recruiterId) throw new Error('recruiterId is required for lead distribution');
  if (!enabled('ENABLE_LEAD_DISTRIBUTION')) {
    return {
      disabled: true,
      distributionBatchId: null,
      distributedCount: 0,
      selectedProviders: [],
      leads: [],
    };
  }
  const { rankProvidersForIntent } = require('./providerRankingService');

  const ranked = await rankProvidersForIntent({
    intent,
    options: {
      ...options,
      recruiterId,
      sortBy: 'match',
      page: 1,
      limit: Math.max(limit * 4, 20),
    },
  });

  const withLoadBalancing = await enrichWithLoadBalance(ranked.providers || []);
  const selected = withLoadBalancing
    .sort((a, b) => Number(b.adjustedScore || 0) - Number(a.adjustedScore || 0))
    .slice(0, limit);

  const distributionBatchId = crypto.randomUUID();
  const leads = [];

  for (let i = 0; i < selected.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const lead = await createLeadAndLog({
      distributionBatchId,
      provider: selected[i],
      recruiterId,
      jobId,
      intentId,
      position: i + 1,
    });
    if (lead) leads.push(lead);
  }

  if (jobId && leads.length > 0) {
    try {
      const providerIds = leads.map(l => String(l.provider)).filter(Boolean);
      const job = await prisma.jobPost.findUnique({
        where: { id: String(jobId) },
        select: { matchedProviders: true },
      });
      if (job) {
        await prisma.jobPost.update({
          where: { id: String(jobId) },
          data: { matchedProviders: [...new Set([...job.matchedProviders, ...providerIds])] },
        });
      }
    } catch (err) {
      console.error('Failed to update JobPost matchedProviders in distribution', err);
    }
  }

  await createNotification({
    userId: recruiterId,
    type: 'AUTO_MATCH_READY',
    title: 'Best providers matched',
    message: `Aapko ${leads.length} best providers mil gaye hain.`,
    data: { distributionBatchId, jobId, intentId, matchedCount: leads.length },
  });

  if (enabled('ENABLE_COMMUNICATION_PROVIDERS')) try {
    const recruiterUser = await prisma.user.findUnique({ where: { id: String(recruiterId) } });
    if (recruiterUser && recruiterUser.email && leads.length > 0) {
      const magicLink = createMagicLinkToken();
      await prisma.user.update({
        where: { id: recruiterUser.id },
        data: prepareUserData(magicLink),
      });
      
      const redirectPath = jobId ? `/recruiter/job-postings` : `/recruiter/dashboard`; // or the job detail route
      const magicUrl = `${process.env.FRONTEND_URL || 'https://www.lucohire.com'}/auth/magic?token=${magicLink.token}&redirect=${encodeURIComponent(redirectPath)}`;
      
      const subject = `Found ${leads.length} matching candidate(s) for your job!`;
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 10px;color:#1f2937;">Matching Candidates Found!</h2>
          <p style="margin:0 0 14px;">Good news! We have found <strong>${leads.length}</strong> pre-screened candidate(s) ready to work for you.</p>
          <p style="margin:0 0 14px;">Click the button below to instantly log in and view their profiles:</p>
          <a href="${magicUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">View Candidates</a>
          <p style="margin:14px 0 0;">This magic link will expire in 15 minutes.</p>
        </div>
      `;
      await sendMail({ to: recruiterUser.email, subject, text: subject, html });
    }
  } catch (err) {
    console.error('Failed to send magic link email for auto match', err);
  }

  await logBusinessEvent({
    taskType: 'lead_distribution',
    relatedEntityType: 'job',
    relatedEntityId: jobId || intentId || recruiterId,
    payload: { distributionBatchId, requestedLimit: limit },
    result: { distributedCount: leads.length },
    status: 'success',
  });

  return {
    distributionBatchId,
    distributedCount: leads.length,
    selectedProviders: selected,
    leads,
  };
}

module.exports = {
  distributeLeadToTopProviders,
};
