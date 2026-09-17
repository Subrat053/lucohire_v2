const cron = require("node-cron");
const { queue } = require("../queues/nightlyScraper.queue");
const CompanySource = require("../models/CompanySource");
const AdminSetting = require("../models/AdminSetting");
const ExternalJob = require("../models/ExternalJob");
const { canUseBullMq } = require("../services/queueService");
const { scrapeManualCareerPage } = require("../modules/syncEngine/customScraper");
const { generateDuplicateHash, generateSeoSlug } = require("../modules/externalJobs/normalizer.service");

/**
 * Runs every day at Midnight (00:00).
 * Fetches a limited number of saved companies (oldest synced first) and scrapes them automatically.
 */
cron.schedule("0 0 * * *", async () => {
  console.log("[Cron - Nightly Scraper] Starting nightly career page scrape job generation...");

  try {
    // 1. Get daily scrape limit from settings (default 300)
    let limit = 300;
    const setting = await AdminSetting.findOne({ key: 'daily_scrape_limit' });
    if (setting && setting.value) {
      const parsed = parseInt(setting.value, 10);
      if (!isNaN(parsed) && parsed > 0) limit = parsed;
    }

    // 2. Fetch active companies with valid career URLs (oldest synced first)
    const companiesToScrape = await CompanySource.find({
      status: { $ne: 'inactive' },
      careerUrl: { $nin: [null, ''] }
    })
      .sort({ lastSyncedAt: 1 }) // Oldest synced first
      .limit(limit)
      .lean();

    console.log(`[Cron - Nightly Scraper] Found ${companiesToScrape.length} companies to scrape (Daily Limit: ${limit}).`);

    if (canUseBullMq() && queue) {
      // Redis BullMQ Mode
      for (const company of companiesToScrape) {
        await queue.add(
          "nightly-scrape",
          {
            companyId: company._id,
            companyName: company.companyName,
            careerUrl: company.careerUrl
          },
          {
            jobId: `nightly-scrape-${company._id}-${new Date().toISOString().split('T')[0]}`,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 5000,
            },
          }
        );
      }
      console.log(`[Cron - Nightly Scraper] Successfully queued ${companiesToScrape.length} scrape jobs in BullMQ.`);
    } else {
      // In-Memory Async Scraper Mode (when Redis is disabled locally)
      console.log(`[Cron - Nightly Scraper] Running in In-Memory fallback mode for ${companiesToScrape.length} companies...`);
      for (const company of companiesToScrape) {
        try {
          const scrapeResult = await scrapeManualCareerPage(company.careerUrl);
          if (scrapeResult && scrapeResult.jobs) {
            for (const externalJob of scrapeResult.jobs) {
              const duplicateHash = generateDuplicateHash(externalJob);
              const seoSlug = generateSeoSlug({ ...externalJob, companyName: company.companyName });
              if (!duplicateHash) continue;

              await ExternalJob.findOneAndUpdate(
                { duplicateHash },
                {
                  ...externalJob,
                  companyName: company.companyName,
                  source: 'crawler',
                  jobOrigin: 'ats',
                  countryCode: externalJob.countryCode || 'GL',
                  isActive: true,
                  duplicateHash,
                  $setOnInsert: { seoSlug }
                },
                { upsert: true, new: false }
              );
            }
          }
          await CompanySource.findByIdAndUpdate(company._id, {
            lastSyncedAt: new Date(),
            $inc: { successCount: 1 }
          });
        } catch (err) {
          console.error(`[In-Memory Nightly Scraper] Error scraping ${company.companyName}:`, err.message);
          await CompanySource.findByIdAndUpdate(company._id, {
            lastError: err.message,
            $inc: { failureCount: 1 }
          });
        }
      }
      console.log(`[Cron - Nightly Scraper] Completed In-Memory background execution.`);
    }
  } catch (error) {
    console.error("[Cron - Nightly Scraper] Error running nightly scrape job:", error);
  }
});
