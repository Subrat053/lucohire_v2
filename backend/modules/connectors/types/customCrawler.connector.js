const BaseConnector = require('../BaseConnector');
const { findCareerPageUrl, scrapeManualCareerPage } = require('../../syncEngine/customScraper');
const JobPost = require('../../../models/JobPost');
const RecruiterLead = require('../../../models/RecruiterLead');
const { normalizeJob } = require('../../externalJobs/normalizer.service');

class CustomCrawlerConnector extends BaseConnector {
  constructor() {
    super('custom', 3.5); // Type 3.5: No-API Scraper
  }

  async fetch(options) {
    const { companyName, companyDomain, atsIdentifier } = options.company;
    
    let careerUrl = atsIdentifier; // fallback to user-provided url
    if (!careerUrl || careerUrl.toLowerCase() === 'auto') {
      careerUrl = await findCareerPageUrl(companyName);
    }

    if (!careerUrl) {
      throw new Error(`Could not find career page URL for ${companyName}`);
    }

    const scrapedData = await scrapeManualCareerPage(careerUrl);
    
    // Store emails temporarily on options to update lead in upsert
    options.scrapedEmails = scrapedData.emails || [];

    return scrapedData.jobs || [];
  }

  async parse(rawData, options) {
    const { companyName, companyDomain, countryCode } = options.company;

    return rawData.map(rawJob => {
      rawJob.companyName = companyName;
      rawJob.companyDomain = companyDomain;
      rawJob.countryCode = countryCode;

      return normalizeJob(rawJob, this.name, 'ats');
    });
  }

  async filter(parsedData, options) {
    return parsedData.filter(job => job.externalJobId && job.applyUrl);
  }

  async upsert(filteredData, options) {
    const { company, scrapedEmails, syncStartTime } = options;
    const code = company.countryCode;

    // 1. Upsert Jobs
    for (const job of filteredData) {
      try {
        const existing = await JobPost.findOne({ duplicateHash: job.duplicateHash });
        if (existing) {
          existing.lastSeenAt = syncStartTime;
          existing.lastSyncedAt = syncStartTime;
          existing.isActive = true;
          await existing.save();
          this.stats.updated++;
        } else {
          await JobPost.findOneAndUpdate(
            { source: this.name, externalJobId: job.externalJobId },
            {
              $set: { ...job, lastSeenAt: options.syncStartTime, isExternal: true },
              $setOnInsert: { firstSeenAt: options.syncStartTime }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          this.stats.inserted++;
        }
      } catch (err) {
        this.stats.skipped++;
      }
    }

    // 2. Update RecruiterLead with any scraped emails
    try {
      let targetEmail = scrapedEmails && scrapedEmails.length > 0 ? scrapedEmails[0] : null;

      const lead = await RecruiterLead.findOneAndUpdate(
        { companyDomain: company.companyDomain, countryCode: code },
        {
          companyName: company.companyName,
          companyDomain: company.companyDomain,
          countryCode: code,
          atsUsed: company.atsType || 'custom',
          activeJobCount: filteredData.length,
          hiringLevel: filteredData.length >= 50 ? 'priority' : filteredData.length >= 10 ? 'high' : 'normal',
          source: 'ats_sync',
          ...(targetEmail && { careersEmail: targetEmail })
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Trigger automated mail if email is present and lead is new
      if (lead.status === 'new' && (lead.careersEmail || lead.publicHrEmail || targetEmail)) {
         const finalEmail = lead.careersEmail || lead.publicHrEmail || targetEmail;
         const { processAutoScrapeOutreach } = require('../../recruiterIntelligence/recruiterLeads.controller');
         // Non-blocking trigger
         processAutoScrapeOutreach(lead, finalEmail).catch(err => console.error(err));
      }
    } catch (leadError) {
      console.error(`[Connector:${this.name}] Failed to update recruiter lead for ${company.companyName}:`, leadError.message);
    }
  }
}

module.exports = CustomCrawlerConnector;
