const cron = require('node-cron');
const StagingCandidate = require('../models/StagingCandidate');
const { pushToInstantlyCampaign, pushToMetaCloudGateway } = require('../services/outreachGateway.service');
const { enabled } = require('../middleware/operationalFeatureGate');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const startOutreachCron = () => {
  if (!enabled('ENABLE_CRON') || !enabled('ENABLE_OUTREACH') || !enabled('ENABLE_COMMUNICATION_PROVIDERS')) {
    return null;
  }
  // Run daily at 09:30 AM IST (04:00 UTC)
  cron.schedule('30 04 * * *', async () => {
    console.log('[OutreachMatrix] Waking up at 09:30 AM IST for Outreach Matrix execution...');
    
    try {
      // Find all staged candidates that haven't expired and haven't had full outreach sent
      // (For this example, we grab those in 'staged' status)
      const pendingCandidates = await StagingCandidate.find({ status: 'staged' }).limit(100);
      
      if (pendingCandidates.length === 0) {
        console.log('[OutreachMatrix] No pending staged candidates to contact. Sleeping.');
        return;
      }

      console.log(`[OutreachMatrix] Processing outreach for ${pendingCandidates.length} candidates...`);

      for (const candidate of pendingCandidates) {
        // Construct the magical unique claim link
        const claimLink = `${FRONTEND_URL}/claim-profile/${candidate.claimToken}`;
        let contacted = false;

        // 1. Email Gateway
        if (candidate.emailToggle) {
          const emailRes = await pushToInstantlyCampaign(candidate, claimLink);
          if (emailRes.success) {
            candidate.emailSentAt = new Date();
            contacted = true;
          }
        }

        // 2. WhatsApp Gateway (Meta API)
        if (candidate.whatsappToggle) {
          const waRes = await pushToMetaCloudGateway(candidate, claimLink);
          if (waRes.success) {
            candidate.whatsappSentAt = new Date();
            contacted = true;
          }
        }

        // Mark as outreach sent if at least one channel succeeded
        if (contacted) {
          candidate.status = 'outreach_sent';
          await candidate.save();
        }
      }

      console.log('[OutreachMatrix] Morning outreach complete. Auto-sleep mode activated.');

    } catch (error) {
      console.error('[OutreachMatrix] Error in morning outreach loop:', error);
    }
  });

  console.log('[CronSetup] Outreach Matrix Cron Job Registered for 09:30 AM IST.');
};

module.exports = { startOutreachCron };
