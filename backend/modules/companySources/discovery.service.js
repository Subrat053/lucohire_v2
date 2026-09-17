const axios = require('axios');
const prisma = require('../../config/prisma');
const { enabled } = require('../../middleware/operationalFeatureGate');
const { prepareCompanySourceData } = require('../../services/recruiterCompanyPersistenceService');

const ATS_CONFIGS = {
  greenhouse: {
    domainFilter: 'site:boards.greenhouse.io OR site:careers.greenhouse.io',
    urlRegex: /greenhouse\.io\/([^\/\?#]+)/i
  },
  lever: {
    domainFilter: 'site:jobs.lever.co',
    urlRegex: /jobs\.lever\.co\/([^\/\?#]+)/i
  },
  ashby: {
    domainFilter: 'site:jobs.ashbyhq.com',
    urlRegex: /jobs\.ashbyhq\.com\/([^\/\?#]+)/i
  },
  workable: {
    domainFilter: 'site:apply.workable.com',
    urlRegex: /apply\.workable\.com\/([^\/\?#]+)/i
  },
  smartrecruiters: {
    domainFilter: 'site:jobs.smartrecruiters.com OR site:careers.smartrecruiters.com',
    urlRegex: /smartrecruiters\.com\/([^\/\?#]+)/i
  }
};

/**
 * Autonomously crawls the web to find companies using a specific ATS.
 */
const runAtsDiscovery = async (atsType, countryCode, keywords = '') => {
  if (!enabled('ENABLE_CRAWLERS') || !enabled('ENABLE_CONNECTORS')) {
    throw new Error('ATS discovery is disabled');
  }

  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) throw new Error("APIFY_API_TOKEN is missing in .env");

  const atsInfo = ATS_CONFIGS[atsType];
  if (!atsInfo) throw new Error(`Unsupported ATS type for discovery: ${atsType}`);

  const countryConfig = await prisma.countryConfig.findUnique({
    where: { countryCode: countryCode.toUpperCase() },
  });
  const countryName = countryConfig ? countryConfig.countryName : countryCode;

  // Build the Google Query
  // e.g. site:boards.greenhouse.io "software engineer" "India"
  const keywordQuery = keywords ? `"${keywords}"` : '';
  const countryQuery = `"${countryName}"`;
  
  const query = `${atsInfo.domainFilter} ${keywordQuery} ${countryQuery}`.trim();
  
  console.log(`[Discovery Engine] Running query: ${query}`);

  const payload = {
    queries: query,
    maxPagesPerQuery: 1,
    resultsPerPage: 50,
  };

  let rawResults = [];
  try {
    const response = await axios.post(
      `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
      payload
    );
    rawResults = response.data || [];
  } catch (err) {
    console.error("[Discovery Engine] Apify Error:", err.message);
    throw new Error("Failed to run Apify Google Search scraper. Ensure APIFY_API_TOKEN is correct and has quota.");
  }

  const results = [];

  // Apify returns array of objects inside organicResults
  for (const item of rawResults) {
    if (item.organicResults && Array.isArray(item.organicResults)) {
      for (const orgResult of item.organicResults) {
        const url = orgResult.url;
        const title = orgResult.title;
        
        const match = url.match(atsInfo.urlRegex);
        if (match && match[1]) {
          let identifier = match[1].toLowerCase().trim();
          
          if (identifier === 'company' || identifier === 'jobs') continue;

          let companyName = identifier.charAt(0).toUpperCase() + identifier.slice(1);
          if (title) {
            // Usually "Careers at CompanyName" or "Job openings at CompanyName"
            const titleMatch = title.match(/at\s+([^|-]+)/i);
            if (titleMatch && titleMatch[1]) {
              companyName = titleMatch[1].trim();
            } else {
               const dashMatch = title.split('-');
               if (dashMatch.length > 1) {
                  companyName = dashMatch[dashMatch.length - 1].trim();
               }
            }
          }

          results.push({
            companyName: companyName,
            companyDomain: `${identifier}.com`,
            careerUrl: url,
            atsType: atsType,
            atsIdentifier: identifier,
            countryCode: countryCode.toUpperCase(),
            source: 'apify_google',
            status: 'active'
          });
        }
      }
    }
  }

  // Deduplicate in memory
  const uniqueMap = new Map();
  for (const r of results) {
    uniqueMap.set(r.atsIdentifier, r);
  }
  const uniqueResults = Array.from(uniqueMap.values());

  let addedCount = 0;
  let duplicateCount = 0;

  for (const entry of uniqueResults) {
    try {
      const existing = await prisma.companySource.findFirst({
        where: {
          atsIdentifier: entry.atsIdentifier,
          countryCode: entry.countryCode,
        },
        select: { id: true },
      });

      if (!existing) {
        await prisma.companySource.create({ data: prepareCompanySourceData(entry) });
        addedCount++;
      } else {
        duplicateCount++;
      }
    } catch (err) {
      console.error(`[Discovery Engine] Error saving company ${entry.atsIdentifier}:`, err.message);
    }
  }

  return {
    query,
    totalFound: uniqueResults.length,
    newlyAdded: addedCount,
    duplicatesSkipped: duplicateCount
  };
};

module.exports = {
  runAtsDiscovery
};
