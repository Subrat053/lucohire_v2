const { Worker } = require('bullmq');
const StagingCandidate = require('../models/StagingCandidate');
const CandidateActivityLog = require('../models/CandidateActivityLog');
const { pushToInstantlyCampaign, pushToMetaCloudGateway } = require('../services/outreachGateway.service');
const { getRedisClient } = require('../modules/queue/redis.client');
const { queueSupported } = require('../modules/queue/queue.factory');
const { enabled } = require('../middleware/operationalFeatureGate');

let candidateOutreachWorker = null;

const outreachEnabled = enabled('ENABLE_WORKERS')
  && enabled('ENABLE_OUTREACH')
  && enabled('ENABLE_COMMUNICATION_PROVIDERS');
const redisConnection = outreachEnabled && queueSupported() ? getRedisClient() : null;

if (redisConnection) {
  try {
    candidateOutreachWorker = new Worker(
      'candidate-outreach-queue',
      async (job) => {
        const { candidateId, channel } = job.data;

        const candidate = await StagingCandidate.findById(candidateId);
        if (!candidate || candidate.status !== 'staged') {
          console.log(`Skipping job for candidate ${candidateId} - not staged or not found.`);
          return;
        }

        const claimUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/claim-profile/${candidate.claimToken}`;

        if (channel === 'email' && candidate.emailToggle && candidate.email) {
          try {
            await pushToInstantlyCampaign(candidate, claimUrl);
            candidate.emailSentAt = new Date();

            await CandidateActivityLog.create({
              candidateId: candidate._id,
              eventType: 'claim_link_sent',
              source: 'Email Queue'
            });
          } catch (err) {
            throw err;
          }
        }

        if (channel === 'whatsapp' && candidate.whatsappToggle && candidate.phone) {
          try {
            await pushToMetaCloudGateway(candidate, claimUrl);
            candidate.whatsappSentAt = new Date();

            await CandidateActivityLog.create({
              candidateId: candidate._id,
              eventType: 'claim_link_sent',
              source: 'WhatsApp Queue'
            });
          } catch (err) {
            throw err;
          }
        }

        candidate.status = 'outreach_sent';
        await candidate.save();
      },
      {
        connection: redisConnection,
        limiter: { max: 1, duration: 15000 },
        settings: {
          stalledInterval: 300000,
          drainDelay: 15000,
        },
        metrics: null
      } // Strict Rate limit: 1 per 15s to mimic human sending
    );

    candidateOutreachWorker.on('completed', (job) => {
      console.log(`[Candidate Outreach Worker] Job ${job.id} has completed!`);
    });

    candidateOutreachWorker.on('failed', (job, err) => {
      console.log(`[Candidate Outreach Worker] Job ${job.id} has failed with ${err.message}`);
    });

    candidateOutreachWorker.on('error', (err) => {
      console.warn('[Candidate Outreach Worker] Worker connection warning:', err.message);
    });
  } catch (err) {
    console.warn('[Candidate Outreach Worker] Failed to initialize worker:', err.message);
  }
}

module.exports = candidateOutreachWorker;
