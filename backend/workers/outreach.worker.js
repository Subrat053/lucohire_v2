const { Worker } = require('bullmq');
const { getRedisClient } = require("../modules/queue/redis.client");
const { pushToInstantlyCampaign, pushToMetaCloudGateway } = require('../services/outreachGateway.service');
const { enabled } = require('../middleware/operationalFeatureGate');

let outreachWorker = null;

const outreachEnabled = enabled('ENABLE_WORKERS')
  && enabled('ENABLE_OUTREACH')
  && enabled('ENABLE_COMMUNICATION_PROVIDERS');
const redisConnection = outreachEnabled ? getRedisClient() : null;
if (outreachEnabled && redisConnection) {
  // Worker to process outreach tasks
  outreachWorker = new Worker(
    'outreachQueue',
    async (job) => {
      try {
        if (job.name === 'send-b2b-outreach') {
          const { leadId, userId, name, companyName, contactDetails, isEmail, template, claimToken } = job.data;
          console.log(`[Outreach Worker] Processing B2B Job ${job.id} | Target: ${contactDetails} | isEmail: ${isEmail}`);
          
          const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
          const profileLink = `${frontendUrl}/claim?token=${claimToken}`;
          const deleteLink = `${frontendUrl}/api/webhooks/delete-profile?token=${claimToken}`;
          
          const personalizedMessage = template
            .replace(/\{\{name\}\}/g, name)
            .replace(/\{\{company\}\}/g, companyName)
            .replace(/\{\{profile_link\}\}/g, profileLink)
            .replace(/\{\{delete_link\}\}/g, deleteLink);
            
          if (isEmail) {
            await pushToInstantlyCampaign(
              { name, email: contactDetails, company: companyName },
              profileLink,
              personalizedMessage // assuming the service might take it
            );
          } else {
            await pushToMetaCloudGateway(
              { name, phone: contactDetails, company: companyName },
              profileLink,
              personalizedMessage // assuming the service might take it
            );
          }
          console.log(`[Outreach Worker] Successfully processed B2B Job ${job.id}`);
          return { status: 'Success', channel: isEmail ? 'Email' : 'WhatsApp' };
        }
        
        // Legacy handling
        const { user, template: oldTemplate, channel, subject } = job.data;
        console.log(`[Outreach Worker] Processing Job ${job.id} | Target: ${user.email || user.phone} | Channel: ${channel}`);

        // Basic template parser: Replaces {{firstName}} with actual name
        const personalizedMessage = oldTemplate ? oldTemplate.replace(/\{\{firstName\}\}/g, user.firstName || user.name?.split(' ')[0] || 'Professional') : '';

        if (channel === 'Email') {
          if (!user.email) throw new Error('Target does not have an email address');
          // If we want to use the Resend gateway
          const claimLink = `https://www.lucohire.com/claim-profile/${user._id || 'demo'}`;
          await pushToInstantlyCampaign(
            { name: user.name || user.firstName, email: user.email, jobTitle: user.jobTitle }, 
            claimLink
          );
        } else if (channel === 'WhatsApp') {
          if (!user.phone) throw new Error('Target does not have a phone number');
          // If we want to use the Meta Gateway
          const claimLink = `https://www.lucohire.com/claim-profile/${user._id || 'demo'}`;
          await pushToMetaCloudGateway(
            { name: user.name || user.firstName, phone: user.phone, jobTitle: user.jobTitle },
            claimLink
          );
        } else {
          throw new Error(`Unsupported channel: ${channel}`);
        }

        console.log(`[Outreach Worker] Successfully processed Job ${job.id}`);
        return { status: 'Success', channel };

      } catch (error) {
        console.error(`[Outreach Worker] Error processing Job ${job.id}:`, error.message);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // Strict concurrency 1 to ensure sequential execution combined with delays
      limiter: {
        max: 10,
        duration: 1000,
      },
      settings: {
        stalledInterval: 300000,
        drainDelay: 60000
      },
      metrics: null
    }
  );

  outreachWorker.on('completed', (job) => {
    console.log(`[Outreach Worker] Job ${job.id} has completed!`);
  });

  outreachWorker.on('failed', (job, err) => {
    console.log(`[Outreach Worker] Job ${job.id} has failed with ${err.message}`);
  });
}

module.exports = outreachWorker;
