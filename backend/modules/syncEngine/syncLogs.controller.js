const prisma = require('../../config/prisma');
const { enabled } = require('../../middleware/operationalFeatureGate');
const { withLegacyId, withLegacyIds } = require('../../utils/prismaResponse');

const syncEnabled = () => enabled('ENABLE_SYNC_ENGINE') && enabled('ENABLE_CONNECTORS');
const disabledResponse = (res) => res.status(503).json({
  success: false,
  code: 'OPERATION_DISABLED',
  message: 'Sync-engine execution is disabled.',
});
const pagination = (page, limit) => {
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

const getSyncReports = async (req, res) => {
  try {
    const { status, source, country, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (country) where.countryCode = country;
    const { pageNum, limitNum, skip } = pagination(page, limit);
    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({ where, orderBy: { startedAt: 'desc' }, skip, take: limitNum }),
      prisma.syncLog.count({ where }),
    ]);
    res.json({
      logs: withLegacyIds(logs),
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getSyncLogSampleJobs = async (req, res) => {
  try {
    const syncLog = withLegacyId(await prisma.syncLog.findUnique({ where: { id: String(req.params.id) } }));
    if (!syncLog) return res.status(404).json({ success: false, message: 'Sync log not found' });
    const isCompanyDiscovery = syncLog.syncType === 'company_discovery';
    const isContactEnricher = syncLog.source.toLowerCase() === 'contact_enricher';
    const fetchCount = isCompanyDiscovery ? (syncLog.companiesChecked || syncLog.jobsFetched) : syncLog.jobsFetched;
    if (fetchCount === 0) return res.json({ success: true, data: [], type: syncLog.syncType });
    const take = Math.max(1, Math.floor(Math.min(fetchCount ?? 50, 1000)));
    const countryWhere = syncLog.countryCode && syncLog.countryCode !== 'GLOBAL'
      ? { countryCode: syncLog.countryCode }
      : {};
    let data;
    if (isCompanyDiscovery) {
      data = await prisma.companyMaster.findMany({
        where: { source: { equals: syncLog.source, mode: 'insensitive' }, ...countryWhere },
        select: {
          id: true, companyName: true, companyDomain: true, industry: true,
          countryCode: true, status: true, source: true, externalId: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take,
      });
    } else if (isContactEnricher) {
      data = await prisma.companyContact.findMany({
        select: { id: true, email: true, companyDomain: true, confidenceScore: true, sourcePage: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take,
      });
    } else {
      data = await prisma.jobPost.findMany({
        where: { source: { equals: syncLog.source, mode: 'insensitive' }, ...countryWhere },
        select: {
          id: true, title: true, companyName: true, cityName: true, countryCode: true,
          createdAt: true, externalUrl: true, applyUrl: true,
        },
        orderBy: { createdAt: 'desc' },
        take,
      });
    }
    res.json({
      success: true,
      data: withLegacyIds(data),
      type: isContactEnricher ? 'contact_enrichment' : syncLog.syncType,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getSyncStatsByCountry = async (_req, res) => {
  try {
    const grouped = await prisma.syncLog.groupBy({
      by: ['countryCode'],
      _sum: { jobsFetched: true, jobsInserted: true },
      orderBy: { _sum: { jobsFetched: 'desc' } },
    });
    const stats = grouped.map((entry) => ({
      countryCode: String(entry.countryCode || 'GLOBAL').toUpperCase(),
      totalFetched: entry._sum.jobsFetched || 0,
      totalInserted: entry._sum.jobsInserted || 0,
    }));
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getSyncErrors = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { limitNum, skip } = pagination(page, limit);
    const [failedLogs, failedCompanies, failedSources] = await Promise.all([
      prisma.syncLog.findMany({ where: { status: 'failed' }, orderBy: { startedAt: 'desc' }, skip, take: limitNum }),
      prisma.companySource.findMany({ where: { failureCount: { gt: 0 } }, orderBy: { updatedAt: 'desc' } }),
      prisma.jobSourceConfig.findMany({ where: { status: 'failed' } }),
    ]);
    res.json({
      failedLogs: withLegacyIds(failedLogs),
      failedCompanies: withLegacyIds(failedCompanies),
      failedSources: withLegacyIds(failedSources),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const triggerDailySync = async (_req, res) => {
  if (!syncEnabled()) return disabledResponse(res);
  try {
    const { runDailySync } = require('./syncEngine.service');
    runDailySync().catch((error) => console.error('[SyncTrigger] Daily sync error:', error.message));
    res.json({ message: 'Daily job ingestion and sync loop started in background' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const triggerCountrySync = async (req, res) => {
  if (!syncEnabled()) return disabledResponse(res);
  try {
    const { countryCode } = req.params;
    const activeSources = await prisma.jobSourceConfig.findMany({ where: { isActive: true } });
    const { runSyncForSource } = require('./syncEngine.service');
    const executeSync = async () => {
      for (const source of activeSources) await runSyncForSource(source.sourceName, countryCode);
    };
    executeSync().catch((error) => console.error(`[SyncTrigger] Country ${countryCode} sync error:`, error.message));
    res.json({ message: `Ingestion sync loop started for country ${countryCode.toUpperCase()}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const triggerSourceSync = async (req, res) => {
  if (!syncEnabled()) return disabledResponse(res);
  try {
    const { sourceName } = req.params;
    const source = await prisma.jobSourceConfig.findFirst({ where: { sourceName, isActive: true } });
    if (!source) return res.status(404).json({ message: 'Active source config not found' });
    const { runSyncForSource } = require('./syncEngine.service');
    runSyncForSource(sourceName).catch((error) => console.error(`[SyncTrigger] Source ${sourceName} sync error:`, error.message));
    res.json({ message: `Ingestion sync started for source ${sourceName}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const retrySyncLog = async (req, res) => {
  if (!syncEnabled()) return disabledResponse(res);
  try {
    const log = await prisma.syncLog.findUnique({ where: { id: String(req.params.id) } });
    if (!log) return res.status(404).json({ message: 'Sync log not found' });
    const { runSyncForSource } = require('./syncEngine.service');
    runSyncForSource(log.source, log.countryCode)
      .catch((error) => console.error(`[SyncRetry] Retry error:`, error.message));
    res.json({ message: `Retry sync initiated for source: ${log.source}, country: ${log.countryCode}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getSyncReports,
  getSyncLogSampleJobs,
  getSyncStatsByCountry,
  getSyncErrors,
  triggerDailySync,
  triggerCountrySync,
  triggerSourceSync,
  retrySyncLog,
};
