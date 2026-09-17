const { Queue, Worker } = require('bullmq');
const CrawlerBatch = require('../models/CrawlerBatch');
const CompanySource = require('../models/CompanySource');
const ExternalJob = require('../models/ExternalJob');
const { findCareerPageUrl, scrapeManualCareerPage } = require('../modules/syncEngine/customScraper');
const { generateDuplicateHash, generateSeoSlug } = require('../modules/externalJobs/normalizer.service');
const { sendMail } = require('../services/mailService');
const { getRedisClient } = require('../modules/queue/redis.client');
const { queueSupported } = require('../modules/queue/queue.factory');

const QUEUE_NAME = 'bulkCrawlerQueue';

const processBatchJob = async (batchId, progressCallback) => {
  const batch = await CrawlerBatch.findById(batchId);
  
  if (!batch) throw new Error('Batch not found');
  if (batch.status === 'stopped') return;
  
  // Ensure status is running if it was pending or paused
  if (['pending', 'paused'].includes(batch.status)) {
    batch.status = 'running';
    await batch.save();
  }

  for (let i = 0; i < batch.companies.length; i++) {
    const currentBatch = await CrawlerBatch.findById(batchId);
    if (currentBatch.status === 'paused') {
      throw new Error('Paused by admin');
    }
    if (currentBatch.status === 'stopped') {
      return; // exit gracefully
    }

    const companyItem = currentBatch.companies[i];
    if (companyItem.status === 'success') continue; // already successfully processed

    const companyName = companyItem.company;
    
    await CrawlerBatch.updateOne(
      { _id: batchId, "companies.company": companyName },
      { $set: { "companies.$.status": "crawling" } }
    );

    if (typeof progressCallback === 'function') {
      progressCallback({ processed: i, total: currentBatch.totalCount, currentCompany: companyName });
    }

    let finalStatus = 'error';
    let jobsFound = 0;
    let careerUrl = '';
    let errorMessage = '';

    try {
      careerUrl = await findCareerPageUrl(companyName);
      if (careerUrl) {
        const companyDomain = new URL(careerUrl).origin;
        const companyData = await CompanySource.findOneAndUpdate(
          { companyDomain, countryCode: 'GLOBAL' },
          { companyName, careerUrl, source: 'bulk_crawler', status: 'active' },
          { upsert: true, new: true }
        );

        const scrapeResult = await scrapeManualCareerPage(careerUrl);
        
        if (scrapeResult && scrapeResult.jobs) {
          jobsFound = scrapeResult.jobs.length;
          for (const cjob of scrapeResult.jobs) {
            const duplicateHash = generateDuplicateHash(companyName, cjob.title, cjob.locationText || 'Remote', careerUrl);
            const seoSlug = generateSeoSlug(cjob.title, companyName, cjob.city || '', cjob.countryCode || 'GL');
            await ExternalJob.findOneAndUpdate(
              { externalJobId: cjob.externalJobId },
              { 
                ...cjob, 
                source: 'crawler', 
                sourceType: 'ats',
                jobOrigin: 'ats',
                countryCode: cjob.countryCode || 'GL',
                isActive: true, 
                companyName,
                duplicateHash,
                seoSlug
              },
              { upsert: true }
            );
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
            } catch (e) {}
          }
        }
        
        await CompanySource.findByIdAndUpdate(companyData._id, {
          lastSyncedAt: new Date(),
          $inc: { successCount: 1 }
        });

        finalStatus = 'success';
      } else {
        finalStatus = 'failed';
        errorMessage = 'No career page found';
      }
    } catch (err) {
      finalStatus = 'error';
      errorMessage = err.message || 'Error occurred';
    }

    await CrawlerBatch.updateOne(
      { _id: batchId, "companies.company": companyName },
      { 
        $set: { 
          "companies.$.status": finalStatus,
          "companies.$.jobsFound": jobsFound,
          "companies.$.careerUrl": careerUrl,
          "companies.$.error": errorMessage
        },
        $inc: { processedCount: 1 }
      }
    );
  }

  // Finished all
  const finalBatch = await CrawlerBatch.findById(batchId);
  if (finalBatch && finalBatch.status !== 'stopped') {
    finalBatch.status = 'completed';
    await finalBatch.save();
  }
};

let queueInstance = null;
const redisConnection = queueSupported() ? getRedisClient() : null;

if (redisConnection) {
  try {
    queueInstance = new Queue(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      }
    });
    queueInstance.on('error', (err) => {
      console.warn('[Crawler Queue] Queue connection warning:', err.message);
    });
  } catch (err) {
    console.warn('[Crawler Queue] Failed to initialize BullMQ queue:', err.message);
    queueInstance = null;
  }
}

const crawlerBulkQueue = {
  add: async (name, data, opts) => {
    if (queueInstance) {
      return await queueInstance.add(name, data, opts);
    }
    // Fallback: Run in background asynchronously
    setImmediate(async () => {
      try {
        console.log(`[Crawler Worker Fallback] Processing batch ${data?.batchId} inline...`);
        await processBatchJob(data?.batchId);
        console.log(`[Crawler Worker Fallback] Batch ${data?.batchId} completed.`);
      } catch (err) {
        if (err.message === 'Paused by admin') {
          console.log(`[Crawler Worker Fallback] Batch ${data?.batchId} paused.`);
        } else {
          console.error(`[Crawler Worker Fallback] Batch ${data?.batchId} failed:`, err.message);
          if (data?.batchId) {
            await CrawlerBatch.findByIdAndUpdate(data.batchId, { status: 'failed', error: err.message });
          }
        }
      }
    });
    return { id: `inline-${Date.now()}` };
  },
  close: async () => {
    if (queueInstance) await queueInstance.close();
  }
};

let worker = null;

const startCrawlerWorker = () => {
  if (!queueSupported()) {
    console.log('[Crawler Worker] BullMQ disabled or Redis unavailable. Running in inline fallback mode.');
    return;
  }

  const connection = getRedisClient();
  if (!connection) {
    console.warn('[Crawler Worker] Redis connection unavailable. Worker not started (inline fallback active).');
    return;
  }

  try {
    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const { batchId } = job.data;
        await processBatchJob(batchId, (progress) => job.updateProgress(progress));
      },
      {
        connection,
        concurrency: 1,
        settings: {
          stalledInterval: 300000,
          drainDelay: 60000,
        },
        metrics: null,
      }
    );

    worker.on('ready', () => {
      console.log('[Crawler Worker] Worker is ready and listening on bulkCrawlerQueue.');
    });

    worker.on('failed', async (job, err) => {
      if (err.message === 'Paused by admin') {
        // Just paused, will be resumed when admin hits resume
        console.log(`[Crawler Worker] Batch ${job?.data?.batchId} paused`);
      } else {
        console.error(`[Crawler Worker] Job failed: ${err.message}`);
        if (job && job.data && job.data.batchId) {
          await CrawlerBatch.findByIdAndUpdate(job.data.batchId, { status: 'failed', error: err.message });
        }
      }
    });

    worker.on('error', (err) => {
      console.warn('[Crawler Worker] Worker connection warning:', err.message);
    });
  } catch (err) {
    console.warn('[Crawler Worker] Failed to start BullMQ worker:', err.message);
  }
};

const stopCrawlerWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queueInstance) {
    await queueInstance.close();
  }
};

module.exports = {
  crawlerBulkQueue,
  startCrawlerWorker,
  stopCrawlerWorker,
  processBatchJob,
};
