const { runAtsDiscovery } = require('./discovery.service');
const prisma = require('../../config/prisma');
const { enabled } = require('../../middleware/operationalFeatureGate');
const { prepareJobData } = require('../../services/jobPersistenceService');
const {
  prepareCompanySourceData,
  withCompanyId,
  withCompanyIds,
} = require('../../services/recruiterCompanyPersistenceService');

/**
 * Get all company sources (Admin)
 */
const getCompanySources = async (req, res) => {
  try {
    const { country, atsType, status, search, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (country) filter.countryCode = String(country).toUpperCase();
    if (atsType) filter.atsType = atsType;
    if (status) filter.status = status;
    
    if (search) {
      filter.OR = [
        { companyName: { contains: search.trim(), mode: 'insensitive' } },
        { companyDomain: { contains: search.trim(), mode: 'insensitive' } },
        { atsIdentifier: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const skipVal = (parseInt(page) - 1) * parseInt(limit);
    const limitVal = parseInt(limit);

    const [companies, total] = await Promise.all([
      prisma.companySource.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
        skip: skipVal,
        take: limitVal,
      }),
      prisma.companySource.count({ where: filter }),
    ]);

    res.json({
      companies: withCompanyIds(companies),
      pagination: {
        page: parseInt(page),
        limit: limitVal,
        total,
        pages: Math.ceil(total / limitVal)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Create a single company source (Admin)
 */
const createCompanySource = async (req, res) => {
  try {
    const payload = prepareCompanySourceData(req.body || {});
    
    const existing = await prisma.companySource.findUnique({
      where: {
        companyDomain_countryCode: {
          companyDomain: payload.companyDomain,
          countryCode: payload.countryCode,
        },
      },
    });
    if (existing) {
      return res.status(400).json({ message: 'Company domain already exists for this country' });
    }

    const company = await prisma.companySource.create({ data: payload });
    res.status(201).json(withCompanyId(company));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update company source (Admin)
 */
const updateCompanySource = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = prepareCompanySourceData(req.body || {});

    const existing = await prisma.companySource.findUnique({ where: { id: String(id) }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: 'Company not found' });
    const company = await prisma.companySource.update({ where: { id: String(id) }, data: payload });
    res.json(withCompanyId(company));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Delete company source (Admin)
 */
const deleteCompanySource = async (req, res) => {
  try {
    const company = await prisma.companySource.findUnique({
      where: { id: String(req.params.id) },
      select: { id: true },
    });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    await prisma.companySource.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Company source deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Bulk import company sources (Admin)
 * Accepts JSON array of companies or CSV text string
 */
const importCompanySources = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const csvData = req.file.buffer.toString('utf-8');
    const lines = csvData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV file is empty or missing data rows' });
    }

    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
    };

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Minimal required headers
    const idxName = headers.findIndex(h => h.includes('name'));
    const idxDomain = headers.findIndex(h => h.includes('domain'));
    const idxAtsType = headers.findIndex(h => h.includes('atstype'));
    const idxAtsId = headers.findIndex(h => h.includes('atsidentifier') || h.includes('atsslug'));
    const idxCountry = headers.findIndex(h => h.includes('country'));
    const idxCareerUrl = headers.findIndex(h => h.includes('careerurl'));

    if (idxName === -1 || idxDomain === -1) {
      return res.status(400).json({ message: "CSV must contain at least 'companyName' and 'companyDomain' headers." });
    }

    let successCount = 0;
    let duplicateCount = 0;
    const errors = [];
    const importedAtsTypes = new Set();
    const importedCountries = new Set();

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      const name = values[idxName];
      const domain = values[idxDomain];
      const country = idxCountry !== -1 ? (values[idxCountry] || 'US') : 'US';
      const atsType = idxAtsType !== -1 ? (values[idxAtsType] || 'unknown') : 'unknown';
      const atsIdentifier = idxAtsId !== -1 ? (values[idxAtsId] || '') : '';
      const careerUrl = idxCareerUrl !== -1 ? (values[idxCareerUrl] || '') : '';

      if (!name || !domain) {
        errors.push({ raw: lines[i], error: 'Company Name and Domain are required' });
        continue;
      }

      try {
        const cleanDomain = domain.toLowerCase().trim();
        const cleanCountry = country.toUpperCase().trim();

        // Check duplicate
        const existing = await prisma.companySource.findUnique({
          where: {
            companyDomain_countryCode: {
              companyDomain: cleanDomain,
              countryCode: cleanCountry,
            },
          },
          select: { id: true },
        });
        if (existing) {
          duplicateCount++;
          continue;
        }

        await prisma.companySource.create({
          data: prepareCompanySourceData({
            companyName: name.trim(),
            companyDomain: cleanDomain,
            careerUrl: careerUrl.trim(),
            atsType: atsType.toLowerCase().trim(),
            atsIdentifier: atsIdentifier.trim(),
            countryCode: cleanCountry,
            source: 'import',
          }),
        });
        
        successCount++;
        importedAtsTypes.add(atsType.toLowerCase().trim());
        importedCountries.add(cleanCountry);
      } catch (err) {
        errors.push({ name, domain, error: err.message });
      }
    }

    // Trigger sync in background for the ATS types we just imported
    const autoSyncEnabled = enabled('ENABLE_SYNC_ENGINE') && enabled('ENABLE_CONNECTORS');
    if (successCount > 0 && autoSyncEnabled) {
      const { runSyncForSource } = require('../syncEngine/syncEngine.service');
      // Fire and forget
      setTimeout(() => {
        for (const ats of importedAtsTypes) {
          if (['greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters'].includes(ats)) {
            console.log(`[AutoSync] Triggering sync for recently imported ATS: ${ats}`);
            runSyncForSource(ats).catch(e => console.error(`[AutoSync] Error running sync for ${ats}:`, e.message));
          }
        }
      }, 1000);
    }

    res.json({
      message: `Import processed. Success: ${successCount}, Duplicates skipped: ${duplicateCount}, Errors: ${errors.length}. ${autoSyncEnabled ? 'Auto-sync has been triggered in the background.' : 'Auto-sync is disabled.'}`,
      successCount,
      duplicateCount,
      errors
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Trigger Auto-Discovery for new companies via Google / Apify
 */
const triggerDiscovery = async (req, res) => {
  if (!enabled('ENABLE_CRAWLERS') || !enabled('ENABLE_CONNECTORS')) {
    return res.status(503).json({ success: false, code: 'OPERATION_DISABLED', message: 'ATS discovery is disabled.' });
  }

  try {
    const { atsType, countryCode, keywords } = req.body;
    
    if (!atsType || !countryCode) {
      return res.status(400).json({ success: false, message: 'atsType and countryCode are required' });
    }

    const result = await runAtsDiscovery(atsType, countryCode, keywords);
    
    res.json({
      success: true,
      message: `Discovery complete. Found ${result.totalFound} unique companies, added ${result.newlyAdded} new, skipped ${result.duplicatesSkipped} duplicates.`,
      result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Discovery error', error: error.message });
  }
};

const liveTestCrawler = async (req, res) => {
  if (!enabled('ENABLE_CRAWLERS') || !enabled('ENABLE_CONNECTORS')) {
    return res.status(503).json({ success: false, code: 'OPERATION_DISABLED', message: 'Live crawler testing is disabled.' });
  }

  try {
    const { companyName, url } = req.body;
    if (!companyName && !url) {
      return res.status(400).json({ success: false, message: 'companyName or url is required' });
    }

    const { findCareerPageUrl } = require('../syncEngine/customScraper');
    const { scrapeCareerPage } = require('../smartScraper/index');

    let careerUrl = url;

    if (!careerUrl) {
      console.log(`[Live Scraper V2] Searching for ${companyName}...`);
      careerUrl = await findCareerPageUrl(companyName);
    }
    
    if (!careerUrl) {
      return res.json({ success: true, message: `Could not find a career page for ${companyName}`, careerUrl: null, jobs: [], emails: [] });
    }

    console.log(`[Live Scraper V2] Found URL: ${careerUrl}, Orchestrating Pipeline...`);
    const result = await scrapeCareerPage(careerUrl);
    
    // As requested by the user, show the final jobs array in the terminal:
    console.log("======= FINAL JOBS ARRAY EXTRACTED =======");
    console.dir(result.data ? result.data.jobs : [], { depth: null, colors: true });
    console.log("==========================================");

    // Save extracted jobs to JobPost model if they don't already exist
    const jobsArr = result.data ? result.data.jobs : [];
    let newJobsCount = 0;
    
    if (jobsArr.length > 0) {
      for (const job of jobsArr) {
        if (!job.title) continue;
        
        // Duplication Check
        const existingJob = await prisma.jobPost.findFirst({
          where: {
            OR: [
              ...(job.applyUrl ? [{ externalUrl: job.applyUrl }] : []),
              { title: job.title, companyName: job.company || companyName },
            ],
          },
          select: { id: true },
        });

        if (!existingJob) {
          // Fallbacks for required fields
          const fallbackSkill = Array.isArray(job.skills) && job.skills.length > 0 
                                ? job.skills[0] 
                                : (job.title || 'General');
          const fallbackCity = job.location || 'Remote/Unknown';
          const fallbackDesc = job.description || 'No description available for this role.';

          await prisma.jobPost.create({ data: prepareJobData({
            isExternal: true,
            source: 'smart-scraper',
            externalUrl: job.applyUrl || null,
            title: job.title,
            skill: fallbackSkill,
            city: fallbackCity,
            description: fallbackDesc,
            companyName: job.company || companyName,
            requirements: Array.isArray(job.qualifications) ? job.qualifications : [],
            // Map work mode if it's in the location
            workMode: (job.location && job.location.toLowerCase().includes('remote')) ? 'remote' : 'onsite',
            // Default required fields
            requiredSkillLevel: 'skilled',
            urgency: 'normal',
            scheduleType: 'full_time',
            status: 'active'
          }) });
          newJobsCount++;
        }
      }
      console.log(`[Live Scraper V2] Saved ${newJobsCount} NEW jobs out of ${jobsArr.length} extracted.`);
    }

    res.json({
      success: true,
      message: `Method: ${result.extractionMethod} | Confidence: ${Math.round(result.confidence)}% | Time: ${result.processingTime}`,
      careerUrl,
      jobs: result.data ? result.data.jobs : [],
      emails: result.emails || [], // Email extraction added back via regex in smartScraper
      scraperStats: {
        extractionMethod: result.extractionMethod,
        confidence: result.confidence,
        htmlSize: result.htmlSize,
        markdownSize: result.markdownSize,
        cacheHit: result.cacheHit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Live scrape error', error: error.message });
  }
};

module.exports = {
  getCompanySources,
  createCompanySource,
  updateCompanySource,
  deleteCompanySource,
  importCompanySources,
  triggerDiscovery,
  liveTestCrawler
};
