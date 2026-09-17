const BaseConnector = require('../BaseConnector');
const axios = require('axios');
const JobPost = require('../../../models/JobPost');
const { normalizeJob } = require('../../externalJobs/normalizer.service');

class AdzunaConnector extends BaseConnector {
  constructor() {
    super('adzuna', 1); // Type 1: Job API
  }

  async fetch(options) {
    const { countryCode = 'us', keyword = 'developer', limit = 20 } = options;
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {
      throw new Error('Adzuna API credentials missing.');
    }

    const country = String(countryCode).toLowerCase().trim();
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=${limit}&what=${encodeURIComponent(keyword)}`;
    
    const response = await axios.get(url, { timeout: 10000 });
    return response.data.results || [];
  }

  async parse(rawData, options) {
    return rawData.map((job) => {
      const locationName = job.location?.display_name || 'Remote';
      const rawJob = {
        id: String(job.id),
        title: job.title,
        description: job.description || 'Adzuna job posting',
        locationText: locationName,
        city: locationName,
        applyUrl: job.redirect_url,
        companyName: job.company?.display_name || 'Adzuna Company',
        salaryMin: job.salary_min || null,
        salaryMax: job.salary_max || null,
        category: job.category?.label || '',
        skillsTags: [job.contract_time, job.contract_type].filter(Boolean),
        countryCode: options.countryCode
      };

      // Normalize using our existing standard normalizer to get hashes and SEO slugs
      return normalizeJob(rawJob, this.name, 'global_source');
    });
  }

  async filter(parsedData, options) {
    // Keep jobs that have valid externalJobId and applyUrl
    return parsedData.filter(job => job.externalJobId && job.applyUrl);
  }

  async upsert(filteredData, options) {
    for (const job of filteredData) {
      try {
        const existing = await JobPost.findOne({ duplicateHash: job.duplicateHash });
        if (existing) {
          existing.lastSeenAt = options.syncStartTime;
          existing.lastSyncedAt = options.syncStartTime;
          existing.isActive = true;
          await existing.save();
          this.stats.updated++;
        } else {
          const { seoSlug, ...normalizedWithoutSlug } = job;
          await JobPost.findOneAndUpdate(
            { source: this.name, externalJobId: job.externalJobId },
            {
              $set: { 
                ...normalizedWithoutSlug, 
                lastSeenAt: options.syncStartTime, 
                lastSyncedAt: options.syncStartTime,
                isExternal: true 
              },
              $setOnInsert: { seoSlug }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          this.stats.inserted++;
        }
      } catch (err) {
        this.stats.skipped++;
      }
    }
  }
}

module.exports = AdzunaConnector;
