const BaseConnector = require('../BaseConnector');
const axios = require('axios');
const JobPost = require('../../../models/JobPost');
const CompanyMaster = require('../../../models/CompanyMaster');

class GreenhouseConnector extends BaseConnector {
  constructor() {
    super('greenhouse', 2); // Type 2: ATS Platform API
  }

  /**
   * Fetch jobs from the Greenhouse ATS Board API.
   * Expected options: { company: <CompanySource Object>, countryCode: 'US' }
   */
  async fetch(options) {
    if (!options.company || !options.company.atsIdentifier) {
      throw new Error("GreenhouseConnector requires a company object with 'atsIdentifier' (slug).");
    }
    
    const slug = options.company.atsIdentifier;
    const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
    
    console.log(`[Connector:${this.name}] Fetching Greenhouse jobs for slug: ${slug} from ${url}`);
    
    const response = await axios.get(url, { timeout: 10000 });
    return response.data.jobs || [];
  }

  async parse(rawData, options) {
    const { company, countryCode } = options;
    const companyName = company.companyName;

    return rawData.map(job => {
      // Basic location parsing for Greenhouse (often a string like "San Francisco, CA")
      let city = '';
      let state = '';
      if (job.location && job.location.name) {
        const parts = job.location.name.split(',');
        if (parts.length >= 2) {
          city = parts[0].trim();
          state = parts[1].trim();
        } else {
          city = parts[0].trim();
        }
      }

      return {
        externalJobId: String(job.id),
        source: this.name,
        sourceType: 'ats',
        jobOrigin: 'ats',
        applyMode: 'external_redirect',
        companyName: companyName,
        title: job.title || 'Unknown Title',
        description: job.content || 'No description provided.',
        locationText: job.location?.name || '',
        city,
        state,
        countryCode: countryCode || 'US',
        applyUrl: job.absolute_url || '',
        isActive: true // Greenhouse board API only returns active jobs by default
      };
    });
  }

  async filter(parsedData, options) {
    // Only return jobs that have an absolute URL and a title
    return parsedData.filter(job => job.applyUrl && job.title);
  }

  async upsert(filteredData, options) {
    // Type 2 connectors write to both jobs_listings (JobPost) and companies_master (CompanyMaster)
    
    if (filteredData.length === 0) return;

    const companyName = filteredData[0].companyName;
    const countryCode = filteredData[0].countryCode;
    
    // 1. Upsert CompanyMaster (ensure company exists)
    const atsIdentifier = options.company?.atsIdentifier || companyName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    await CompanyMaster.findOneAndUpdate(
      { companyName: companyName, countryCode: countryCode },
      { 
        $set: {
          companyName: companyName,
          countryCode: countryCode,
          externalId: atsIdentifier,
          source: this.name,
          isActive: true
        }
      },
      { upsert: true }
    );

    // 2. Upsert Jobs
    const bulkOps = filteredData.map(job => ({
      updateOne: {
        filter: { source: this.name, externalJobId: job.externalJobId },
        update: { 
          $set: { 
            ...job,
            isExternal: true, 
            lastSeenAt: Date.now() 
          },
          $setOnInsert: { firstSeenAt: Date.now() }
        },
        upsert: true
      }
    }));

    if (bulkOps.length > 0) {
      const result = await JobPost.bulkWrite(bulkOps);
      this.stats.inserted += (result.upsertedCount || 0);
      this.stats.updated += (result.modifiedCount || 0);
      this.stats.skipped += ((result.matchedCount || 0) - (result.modifiedCount || 0));
    }
  }
}

module.exports = GreenhouseConnector;
