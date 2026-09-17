const prisma = require('../config/prisma');
const { enabled } = require('../middleware/operationalFeatureGate');
const { withLegacyIds } = require('../utils/prismaResponse');
const {
  prepareCompanySourceData,
  withCompanyId,
  withCompanyIds,
} = require('../services/recruiterCompanyPersistenceService');

const getRegistryCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', country = '', status = '' } = req.query;
    
    const query = {};
    if (search) {
      query.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (country) query.countryCode = country;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    
    const companies = withCompanyIds(await prisma.companyMaster.findMany({
      where: query,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit, 10),
    }));
      
    // Fetch jobs for these companies
    const companyNames = companies.map(c => c.companyName);
    const jobs = withLegacyIds(await prisma.externalJob.findMany({
      where: { companyName: { in: companyNames } },
      select: { id: true, companyName: true, title: true, applyUrl: true },
    }));
    
    // Attach jobs to companies
    const companiesWithJobs = companies.map(company => {
      company.jobs = jobs.filter(j => j.companyName === company.companyName);
      return company;
    });

    const total = await prisma.companyMaster.count({ where: query });

    // CompanyMaster has no location column in the current Prisma schema.
    const locationStats = total ? [{ location: 'Unknown', count: total }] : [];

    res.status(200).json({
      companies: companiesWithJobs,
      locationStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching registry companies:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const syncRegistryCompanyJobs = async (req, res) => {
  if (!enabled('ENABLE_CRAWLERS') || !enabled('ENABLE_CONNECTORS')) {
    return res.status(503).json({
      success: false,
      code: 'OPERATION_DISABLED',
      message: 'Registry synchronization is disabled.',
    });
  }

  try {
    const { id } = req.params;
    const companyMaster = withCompanyId(await prisma.companyMaster.findUnique({
      where: { id: String(id) },
    }));
    if (!companyMaster) {
      return res.status(404).json({ success: false, message: 'Company not found in registry' });
    }

    // Pass the company to our CustomCrawler (Type 3.5) discovery engine!
    // The crawler expects an object mapped to CompanySource format
    const companyMapped = {
      companyName: companyMaster.companyName,
      companyDomain: companyMaster.companyDomain || companyMaster.companyName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '.com',
      countryCode: companyMaster.countryCode,
      atsType: 'custom',
      atsIdentifier: 'auto' // this tells the crawler to run duckduckgo discovery
    };

    const ConnectorRegistry = require('../modules/connectors');
    const CustomCrawlerClass = ConnectorRegistry['custom'];
    if (!CustomCrawlerClass) {
      return res.status(500).json({ success: false, message: 'Crawler not found in registry' });
    }

    const crawler = new CustomCrawlerClass();
    
    // In background, we try to insert it into CompanySource if it doesn't exist so we track it natively
    const companySourceData = prepareCompanySourceData({
      ...companyMapped,
      status: 'active',
      hiringLevel: 'normal',
    });
    await prisma.companySource.upsert({
      where: {
        companyDomain_countryCode: {
          companyDomain: companySourceData.companyDomain,
          countryCode: companySourceData.countryCode,
        },
      },
      create: companySourceData,
      update: companySourceData,
    });

    const stats = await crawler.run({ company: companyMapped, countryCode: companyMapped.countryCode });
    
    await prisma.companyMaster.update({
      where: { id: companyMaster.id },
      data: { lastSyncedAt: new Date() },
    });

    res.status(200).json({ 
      success: true, 
      message: `Sync successful! Fetched ${stats.totalFetched} jobs and scraped recruiter emails.`,
      stats 
    });

  } catch (error) {
    console.error('Error syncing registry company:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

module.exports = {
  getRegistryCompanies,
  syncRegistryCompanyJobs
};
