const { Worker } = require("bullmq");
const { getRedisClient } = require("../modules/queue/redis.client");
const { canUseBullMq } = require("../services/queueService");
const { NIGHTLY_SCRAPER_QUEUE } = require("../queues/nightlyScraper.queue");
const { scrapeManualCareerPage } = require("../modules/syncEngine/customScraper");
const { sendMail } = require("../services/mailService");
const CompanySource = require("../models/CompanySource");
const ExternalJob = require("../models/ExternalJob");
const { generateDuplicateHash, generateSeoSlug } = require("../modules/externalJobs/normalizer.service");

let worker;

if (canUseBullMq()) {
  worker = new Worker(
    NIGHTLY_SCRAPER_QUEUE,
    async (job) => {
      const { companyId, companyName, careerUrl } = job.data;
      console.log(`[Nightly Scraper Worker] Processing ${companyName} (${careerUrl})`);

      try {
        const scrapeResult = await scrapeManualCareerPage(careerUrl);
        
        let newJobsCount = 0;

        if (scrapeResult && scrapeResult.jobs) {
          for (const externalJob of scrapeResult.jobs) {
            // Manually compute hash/slug — findOneAndUpdate bypasses pre-save hooks
            const duplicateHash = generateDuplicateHash(externalJob);
            const seoSlug = generateSeoSlug({ ...externalJob, companyName });

            if (!duplicateHash) continue; // skip unfingerprintable records

            try {
              const result = await ExternalJob.findOneAndUpdate(
                { duplicateHash },
                {
                  ...externalJob,
                  companyName,
                  source: 'crawler',
                  jobOrigin: 'ats',
                  countryCode: externalJob.countryCode || 'GL',
                  isActive: true,
                  duplicateHash,
                  $setOnInsert: { seoSlug }
                },
                { upsert: true, new: false }
              );
              if (!result) newJobsCount++;
            } catch (err) {
              if (err.code === 'P2002') {
                // Silently ignore concurrent upsert duplicate key errors
                continue;
              }
              throw err;
            }
          }
        }

        if (scrapeResult && scrapeResult.emails && scrapeResult.emails.length > 0) {
          for (const email of scrapeResult.emails) {
            try {
              await sendMail({
                to: email,
                subject: `Lucohire Partnership - ${companyName}`,
                text: `Hi,\n\nWe noticed ${companyName} is hiring! Join Lucohire to streamline your hiring.\n\nBest,\nLucohire Team`
              });
            } catch (e) {
              console.error(`[Nightly Scraper Worker] Failed to send email to ${email}`);
            }
          }
        }

        await CompanySource.findByIdAndUpdate(companyId, {
          lastSyncedAt: new Date(),
          $inc: { successCount: 1 }
        });

        console.log(`[Nightly Scraper Worker] Done processing ${companyName}. Found ${scrapeResult?.jobs?.length || 0} jobs.`);

      } catch (err) {
        console.error(`[Nightly Scraper Worker] Error processing ${companyName}:`, err.message);
        await CompanySource.findByIdAndUpdate(companyId, {
          lastError: err.message,
          $inc: { failureCount: 1 }
        });
        throw err; // Re-throw so BullMQ records the failure
      }
    },
    {
      connection: getRedisClient(),
      concurrency: 5 // Process 5 companies concurrently
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Nightly Scraper Worker] Job ${job.id} completed.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Nightly Scraper Worker] Job ${job.id} failed with error:`, err.message);
  });
} else {
  console.warn("[Nightly Scraper Worker] BullMQ is disabled by environment variables. Worker not started.");
}

module.exports = worker;
