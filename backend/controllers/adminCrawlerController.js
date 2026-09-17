const { sendMail } = require('../services/mailService');
const ExternalJob = require('../models/ExternalJob');
const AdminSetting = require('../models/AdminSetting');
const { findCareerPageUrl, scrapeManualCareerPage } = require('../modules/syncEngine/customScraper');
const { generateDuplicateHash, generateSeoSlug } = require('../modules/externalJobs/normalizer.service');
const prisma = require('../config/prisma');
const { withCompanyId, withCompanyIds } = require('../services/recruiterCompanyPersistenceService');

const getSettings = async (req, res) => {
  try {
    const settings = await AdminSetting.find({ category: 'crawler' });
    const formattedSettings = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    
    // Default to 300 if not found
    if (!formattedSettings.daily_scrape_limit) {
      formattedSettings.daily_scrape_limit = '300';
    }
    
    res.json(formattedSettings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { daily_scrape_limit } = req.body;
    
    if (daily_scrape_limit) {
      await AdminSetting.findOneAndUpdate(
        { key: 'daily_scrape_limit' },
        { value: String(daily_scrape_limit), category: 'crawler', description: 'Nightly crawler daily limit' },
        { upsert: true, new: true }
      );
    }
    
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

const CrawlerBatch = require('../models/CrawlerBatch');
const { crawlerBulkQueue } = require('../workers/crawlerWorker');

const startBulkBatch = async (req, res) => {
  try {
    const { companies } = req.body;
    if (!Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty companies list' });
    }

    const batchName = `Batch - ${new Date().toLocaleString()}`;
    const mappedCompanies = companies.map(c => ({ company: c, status: 'pending' }));
    
    const batch = new CrawlerBatch({
      name: batchName,
      status: 'pending',
      companies: mappedCompanies,
      totalCount: mappedCompanies.length,
      processedCount: 0
    });
    
    await batch.save();

    await crawlerBulkQueue.add('processBatch', { batchId: batch._id });
    
    res.status(200).json({ message: 'Batch started', batch });
  } catch (err) {
    console.error('Failed to start batch:', err);
    res.status(500).json({ error: 'Internal server error starting batch' });
  }
};

const getBulkBatches = async (req, res) => {
  try {
    const batches = await CrawlerBatch.find().sort({ createdAt: -1 }).limit(10);
    res.status(200).json({ batches });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
};

const updateBatchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'pause', 'resume', 'stop'
    
    const batch = await CrawlerBatch.findById(id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    
    if (action === 'pause' && (batch.status === 'running' || batch.status === 'pending')) {
      batch.status = 'paused';
      await batch.save();
      return res.status(200).json({ message: 'Batch paused', batch });
    }
    
    if (action === 'stop') {
      batch.status = 'stopped';
      await batch.save();
      return res.status(200).json({ message: 'Batch stopped', batch });
    }
    
    if (action === 'resume' && batch.status === 'paused') {
      const activeBatch = await CrawlerBatch.findOne({ status: { $in: ['running', 'pending'] } });
      if (activeBatch) {
        return res.status(400).json({ error: 'Cannot resume: another batch is currently running or pending.' });
      }

      batch.status = 'pending';
      await batch.save();
      await crawlerBulkQueue.add('processBatch', { batchId: batch._id });
      return res.status(200).json({ message: 'Batch resumed', batch });
    }
    
    if (action === 'restart' && ['stopped', 'completed', 'failed'].includes(batch.status)) {
      const activeBatch = await CrawlerBatch.findOne({ status: { $in: ['running', 'pending'] } });
      if (activeBatch) {
        return res.status(400).json({ error: 'Cannot restart: another batch is currently running or pending.' });
      }

      // Reset failed/error companies back to pending
      batch.companies.forEach(c => {
        if (c.status !== 'success') {
          c.status = 'pending';
          c.error = null;
        }
      });
      batch.status = 'pending';
      batch.error = null;
      await batch.save();
      await crawlerBulkQueue.add('processBatch', { batchId: batch._id });
      return res.status(200).json({ message: 'Batch restarted', batch });
    }
    
    res.status(400).json({ error: `Invalid action '${action}' for status '${batch.status}'` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update batch status' });
  }
};

const getMappedCompanies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { range, startDate, endDate, date, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { source: 'bulk_crawler' };

    if (status && status !== 'all') {
      query.status = status;
    }

    // Apply Date Range / Single Date Filter
    let dateFilter = null;
    const now = new Date();

    if (date) {
      const selectedDay = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (selectedDay > today) {
        // Future date selected: Return empty logs
        return res.json({
          companies: [],
          jobsOnDate: [],
          summary: {
            totalCompanies: 0,
            activeCompanies: 0,
            totalJobsExtracted: 0,
            appliedRange: `date:${date}`,
            isFuture: true
          },
          pagination: { page: 1, limit, total: 0, pages: 0 }
        });
      }

      // Exact 24-hour day window for selected date (00:00:00.000 to 23:59:59.999)
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      dateFilter = { gte: dayStart, lte: dayEnd };
      
      query.OR = [
        { lastSyncedAt: dateFilter },
        { createdAt: dateFilter }
      ];
    } else if (startDate && endDate) {
      dateFilter = { gte: new Date(startDate), lte: new Date(endDate) };
      query.OR = [{ lastSyncedAt: dateFilter }, { createdAt: dateFilter }];
    } else if (range && range !== 'all') {
      const msMap = { '24h': 24*3600*1000, '7d': 7*24*3600*1000, '30d': 30*24*3600*1000, '90d': 90*24*3600*1000 };
      if (msMap[range]) {
        dateFilter = { gte: new Date(now.getTime() - msMap[range]) };
        query.OR = [{ lastSyncedAt: dateFilter }, { createdAt: dateFilter }];
      }
    }

    const [companyRecords, total] = await Promise.all([
      prisma.companySource.findMany({
        where: query,
        orderBy: [{ lastSyncedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.companySource.count({ where: query }),
    ]);
    const companies = withCompanyIds(companyRecords);

    // If exact single date requested, fetch ExternalJobs created strictly on that date
    let jobsOnDate = [];
    if (date && dateFilter) {
      jobsOnDate = await ExternalJob.find({
        createdAt: {
          ...(dateFilter.gte ? { $gte: dateFilter.gte } : {}),
          ...(dateFilter.lte ? { $lte: dateFilter.lte } : {}),
        }
      }).sort({ createdAt: -1 }).limit(50).lean();
    }

    // Compute Summary Stats for the Filter
    const totalJobsExtracted = jobsOnDate.length || companies.reduce((acc, c) => acc + (c.successCount || 0), 0);
    const activeCompaniesCount = await prisma.companySource.count({ where: { ...query, status: 'active' } });

    res.json({
      companies,
      jobsOnDate,
      summary: {
        totalCompanies: total,
        activeCompanies: activeCompaniesCount,
        totalJobsExtracted,
        appliedRange: date ? `date:${date}` : (range || 'all')
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
};

const downloadCareerPagesCSV = async (req, res) => {
  try {
    const companies = withCompanyIds(await prisma.companySource.findMany({
      where: { source: 'bulk_crawler' },
    }));
    
    const csvHeader = 'Company Name,Domain,Career URL,Country,Status,Last Synced\n';
    const csvRows = companies.map(c => 
      `"${c.companyName}","${c.companyDomain}","${c.careerUrl}","${c.countryCode}","${c.status}","${c.lastSyncedAt || ''}"`
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="career_pages.csv"');
    res.send(csvHeader + csvRows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
};

const toggleCompanyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'paused' | 'inactive'
    
    const existing = await prisma.companySource.findUnique({ where: { id: String(id) }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: 'Company not found' });
    const company = withCompanyId(await prisma.companySource.update({
      where: { id: String(id) },
      data: { status: status || 'paused' },
    }));
    
    res.json({ message: `Company status updated to ${company.status}`, company });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update company status' });
  }
};

const rescrapeCompany = async (req, res) => {
  try {
    const { id } = req.params;
    let company = withCompanyId(await prisma.companySource.findUnique({ where: { id: String(id) } }));
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const scrapeResult = await scrapeManualCareerPage(company.careerUrl);
    let jobsFound = 0;

    if (scrapeResult && scrapeResult.jobs) {
      jobsFound = scrapeResult.jobs.length;
      for (const job of scrapeResult.jobs) {
        const duplicateHash = generateDuplicateHash(company.companyName, job.title, job.locationText || 'Remote', company.careerUrl);
        const seoSlug = generateSeoSlug(job.title, company.companyName, job.city || '', job.countryCode || 'GL');
        await ExternalJob.findOneAndUpdate(
          { externalJobId: job.externalJobId },
          { 
            ...job, 
            source: 'crawler', 
            sourceType: 'ats',
            jobOrigin: 'ats',
            countryCode: job.countryCode || 'GL',
            isActive: true, 
            companyName: company.companyName,
            duplicateHash,
            seoSlug
          },
          { upsert: true, new: true }
        );
      }
    }

    company = withCompanyId(await prisma.companySource.update({
      where: { id: String(id) },
      data: {
        lastSyncedAt: new Date(),
        successCount: { increment: 1 },
        status: 'active',
      },
    }));

    res.json({ message: `Re-scrape completed. Found ${jobsFound} jobs.`, jobsFound, company });
  } catch (err) {
    res.status(500).json({ error: 'Failed to re-scrape company: ' + err.message });
  }
};

const triggerNightlyCrawlNow = async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date ? new Date(date) : new Date();

    let limit = 300;
    const setting = await AdminSetting.findOne({ key: 'daily_scrape_limit' });
    if (setting && setting.value) {
      const parsed = parseInt(setting.value, 10);
      if (!isNaN(parsed) && parsed > 0) limit = parsed;
    }

    const companiesToScrape = withCompanyIds(await prisma.companySource.findMany({
      where: {
        status: { not: 'inactive' },
        careerUrl: { not: '' },
      },
      take: limit,
    }));

    let jobsTotal = 0;
    let companiesProcessed = 0;

    for (const company of companiesToScrape) {
      try {
        const scrapeResult = await scrapeManualCareerPage(company.careerUrl);
        if (scrapeResult && scrapeResult.jobs) {
          jobsTotal += scrapeResult.jobs.length;
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
                createdAt: targetDate,
                $setOnInsert: { seoSlug }
              },
              { upsert: true, new: false }
            );
          }
        }
        await prisma.companySource.update({
          where: { id: company.id },
          data: {
            lastSyncedAt: targetDate,
            successCount: { increment: 1 },
          },
        });
        companiesProcessed++;
      } catch (err) {
        console.error(`[Manual Night Scrape] Error for ${company.companyName}:`, err.message);
      }
    }

    // Create SyncLog record for this date
    await SyncLog.create({
      syncType: 'company_discovery',
      source: 'Nightly Scraper Engine',
      status: 'success',
      startedAt: targetDate,
      completedAt: new Date(),
      jobsFetched: jobsTotal,
      jobsInserted: jobsTotal,
      companiesChecked: companiesProcessed
    });

    res.json({
      message: `Nightly crawl completed for ${targetDate.toISOString().split('T')[0]}. Processed ${companiesProcessed} companies and ingested ${jobsTotal} jobs.`,
      companiesProcessed,
      jobsTotal
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run nightly crawl: ' + err.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getMappedCompanies,
  downloadCareerPagesCSV,
  toggleCompanyStatus,
  rescrapeCompany,
  triggerNightlyCrawlNow,
  startBulkBatch,
  getBulkBatches,
  updateBatchStatus
};
