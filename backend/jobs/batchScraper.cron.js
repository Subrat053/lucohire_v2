const cron = require('node-cron');
const JobPost = require('../models/JobPost');
const AdminSetting = require('../models/AdminSetting');
const StagingCandidate = require('../models/StagingCandidate');
const { executeDeepScrape } = require('../services/apifyScraper.service');
const { v4: uuidv4 } = require('uuid');

const startBatchScraperCron = () => {
  // Run daily at 11:30 PM IST (18:00 UTC)
  cron.schedule('30 18 * * *', async () => {
    console.log('[BatchScraper] Waking up at 11:30 PM IST for nightly scraping loop...');
    
    try {
      const isEnabled = await AdminSetting.isFeatureEnabled('scraper_cron_enabled', true);
      if (!isEnabled) {
        console.log('[BatchScraper] Scraper is disabled via admin settings. Skipping.');
        return;
      }

      const limit = await AdminSetting.getValue('daily_scraper_limit', 500);

      // Find all active job posts
      const activeJobs = await JobPost.find({ status: 'open' }).limit(20);
      if (activeJobs.length === 0) {
        console.log('[BatchScraper] No active job posts found. Sleeping.');
        return;
      }

      console.log(`[BatchScraper] Found ${activeJobs.length} active jobs. Initiating Apify extraction...`);

      for (const job of activeJobs) {
        // Construct target query
        const query = `${job.title} ${job.skills.join(' ')}`;
        console.log(`[BatchScraper] Scraping for: ${query}`);

        const result = await executeDeepScrape(query, parseInt(limit));
        
        if (result.success && result.data && result.data.length > 0) {
          console.log(`[BatchScraper] Fetched ${result.data.length} candidates. Moving to Staging DB...`);
          
          for (const cand of result.data) {
            // Setup conversion tokens
            const claimToken = uuidv4();
            const claimExpiresAt = new Date();
            claimExpiresAt.setDate(claimExpiresAt.getDate() + 30); // 30 day expiry
            
            await StagingCandidate.create({
              name: cand.name,
              email: cand.email,
              phone: cand.phone,
              jobTitle: cand.jobTitle,
              skills: cand.skills,
              location: cand.location,
              apifyRunId: result.runId,
              sourceQuery: query,
              claimToken,
              claimExpiresAt
            });
          }
        }
      }

      console.log('[BatchScraper] Nightly extraction complete. Auto-sleep mode activated.');

    } catch (error) {
      console.error('[BatchScraper] Error in nightly scraping loop:', error);
    }
  });

  console.log('[CronSetup] Batch Scraper Cron Job Registered for 11:30 PM IST.');
};

module.exports = { startBatchScraperCron };
