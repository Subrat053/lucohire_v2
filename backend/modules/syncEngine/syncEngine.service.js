const CountryConfig = require('../../models/CountryConfig');
const JobSourceConfig = require('../../models/JobSourceConfig');
const CompanySource = require('../../models/CompanySource');
const JobPost = require('../../models/JobPost');
const SyncLog = require('../../models/SyncLog');

// Import Connectors
const { fetchGreenhouseJobs } = require('../atsConnectors/greenhouse.connector');
const { fetchLeverJobs } = require('../atsConnectors/lever.connector');
const { fetchAshbyJobs } = require('../atsConnectors/ashby.connector');
const { fetchSmartRecruitersJobs } = require('../atsConnectors/smartrecruiters.connector');
const { fetchWorkableJobs } = require('../atsConnectors/workable.connector');
const { fetchAdzunaJobs } = require('../globalJobConnectors/adzuna.connector');
const { fetchJoobleJobs } = require('../globalJobConnectors/jooble.connector');
const { fetchUsaJobs } = require('../globalJobConnectors/usajobs.connector');
const { fetchTheMuseJobs } = require('../globalJobConnectors/themuse.connector');
const { fetchArbeitnowJobs } = require('../globalJobConnectors/arbeitnow.connector');
const { fetchRemoteOkJobs } = require('../globalJobConnectors/remoteok.connector');
const { fetchRemotiveJobs } = require('../globalJobConnectors/remotive.connector');

// Import Normalizer
const { normalizeJob } = require('../externalJobs/normalizer.service');

// Import new Connector Framework Registry
const ConnectorRegistry = require('../connectors');

/**
 * Runs job sync for a single job source
 * @param {string} sourceName - Source name (e.g. 'adzuna', 'greenhouse')
 * @param {string} [countryCode] - Optional specific country to restrict
 */
const runSyncForSource = async (sourceName, countryCode = null) => {
  if (String(process.env.ENABLE_SYNC_ENGINE || '').toLowerCase() !== 'true'
    || String(process.env.ENABLE_CONNECTORS || '').toLowerCase() !== 'true') {
    return { skipped: true, reason: 'Sync engine or connectors disabled' };
  }
  const syncStartTime = new Date();
  console.log(`[SyncEngine] Starting sync for source: ${sourceName} ${countryCode ? `restricted to ${countryCode}` : ''}`);

  const sourceConfig = await JobSourceConfig.findOne({ sourceName, isActive: true });
  if (!sourceConfig) {
    console.log(`[SyncEngine] Source ${sourceName} is not active. Skipping.`);
    return;
  }

  // Load target countries
  const countryQuery = { isActive: true, isJobSyncEnabled: true };
  if (countryCode) {
    countryQuery.countryCode = countryCode.toUpperCase();
  }
  const countries = await CountryConfig.find(countryQuery);

  for (const country of countries) {
    // Check compatibility
    const code = country.countryCode;
    const isJobSourceSupported = country.supportedJobSources.includes(sourceName);
    const isAtsSourceSupported = country.supportedAtsSources.includes(sourceName);

    if (!isJobSourceSupported && !isAtsSourceSupported) {
      console.log(`[SyncEngine] Country ${code} does not support source ${sourceName}. Skipping.`);
      continue;
    }

    const logEntry = await SyncLog.create({
      syncType: sourceConfig.sourceType === 'ats' ? 'ats' : 'global_source',
      source: sourceName,
      countryCode: code,
      status: 'partial',
      startedAt: syncStartTime
    });

    let jobsFetched = 0;
    let jobsInserted = 0;
    let jobsUpdated = 0;
    let duplicatesSkipped = 0;
    let companiesChecked = 0;

    // --- NEW CONNECTOR ARCHITECTURE SUPPORT ---
    if (ConnectorRegistry[sourceName]) {
      const ConnectorClass = ConnectorRegistry[sourceName];
      const connector = new ConnectorClass();

      if (sourceConfig.sourceType === 'ats' || sourceName === 'custom') {
        const companies = await CompanySource.find({ countryCode: code, atsType: sourceName, status: 'active' });
        companiesChecked = companies.length;
        
        for (const company of companies) {
           await connector.run({ company, countryCode: code });
        }
      } else {
        const keywords = country.skills.length > 0 ? country.skills.slice(0, 5) : ['developer'];
        for (const word of keywords) {
           await connector.run({ countryCode: code, keyword: word, limit: sourceConfig.syncRules.maxJobs || 100 });
        }
      }

      continue;
    }
    // ------------------------------------------

    try {
      if (sourceConfig.sourceType === 'ats') {
        // Fetch companies configured for this ATS in this country
        const companies = await CompanySource.find({
          countryCode: code,
          atsType: sourceName,
          status: 'active'
        });

        companiesChecked = companies.length;

        for (const company of companies) {
          try {
            let rawJobs = [];
            if (sourceName === 'greenhouse') {
              rawJobs = await fetchGreenhouseJobs(company.atsIdentifier);
            } else if (sourceName === 'lever') {
              rawJobs = await fetchLeverJobs(company.atsIdentifier);
            } else if (sourceName === 'ashby') {
              rawJobs = await fetchAshbyJobs(company.atsIdentifier);
            } else if (sourceName === 'smartrecruiters') {
              rawJobs = await fetchSmartRecruitersJobs(company.atsIdentifier);
            } else if (sourceName === 'workable') {
              try {
                rawJobs = await fetchWorkableJobs(company.atsIdentifier);
              } catch (workableErr) {
                if (workableErr.message && workableErr.message.includes('WORKABLE_RESTRICTED')) {
                  company.status = 'needs_review';
                  company.lastError = workableErr.message;
                  await company.save();
                }
                throw workableErr;
              }
            }

            jobsFetched += rawJobs.length;

            for (const raw of rawJobs) {
              try {
                // Attach company domain and country context
                raw.companyName = company.companyName;
                raw.companyDomain = company.companyDomain;
                raw.countryCode = code;

                const normalized = normalizeJob(raw, sourceName, 'ats');
                
                // Check duplicate hash
                const existing = await JobPost.findOne({ duplicateHash: normalized.duplicateHash });
                if (existing) {
                  // Update sync timestamps
                  existing.lastSeenAt = syncStartTime;
                  existing.lastSyncedAt = syncStartTime;
                  existing.isActive = true;
                  await existing.save();
                  jobsUpdated++;
                } else {
                  // Upsert by externalJobId (slug only on new docs)
                  const { seoSlug: newSlug, ...normalizedWithoutSlug } = normalized;
                  await JobPost.findOneAndUpdate(
                    { source: sourceName, externalJobId: normalized.externalJobId },
                    {
                      $set: { ...normalizedWithoutSlug, lastSeenAt: syncStartTime, lastSyncedAt: syncStartTime, isExternal: true },
                      $setOnInsert: { seoSlug: newSlug }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                  );
                  jobsInserted++;
                }
              } catch (err) {
                duplicatesSkipped++;
              }
            }

            // Update success counts
            company.successCount += 1;
            company.lastSyncedAt = new Date();
            company.activeJobCount = rawJobs.length;
            company.hiringLevel = rawJobs.length >= 50 ? 'priority' : rawJobs.length >= 25 ? 'very_high' : rawJobs.length >= 10 ? 'high' : 'normal';
            await company.save();

            // Auto-populate RecruiterLead
            try {
              const RecruiterLead = require('../../models/RecruiterLead');
              await RecruiterLead.findOneAndUpdate(
                { companyDomain: company.companyDomain, countryCode: code },
                {
                  companyName: company.companyName,
                  companyDomain: company.companyDomain,
                  countryCode: code,
                  atsUsed: company.atsType,
                  activeJobCount: rawJobs.length,
                  hiringLevel: company.hiringLevel,
                  source: 'ats_sync'
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );
            } catch (leadError) {
              console.error(`[SyncEngine] Failed to update recruiter lead for ${company.companyName}:`, leadError.message);
            }

          } catch (companyError) {
            company.failureCount += 1;
            company.lastError = companyError.message;
            await company.save();
            console.error(`[SyncEngine] Company ${company.companyName} ATS sync failed:`, companyError.message);
          }
        }
      } else {
        // Global Aggregators / Government / Remote sources
        // Query for each category/skill configured in the country settings
        const keywords = country.skills.length > 0 ? country.skills.slice(0, 5) : ['developer'];
        
        for (const word of keywords) {
          try {
            let rawJobs = [];
            const maxJobs = sourceConfig.syncRules.maxJobs || 100;

            if (sourceName === 'adzuna') {
              rawJobs = await fetchAdzunaJobs(code, word, maxJobs);
            } else if (sourceName === 'jooble') {
              rawJobs = await fetchJoobleJobs(code, word);
            } else if (sourceName === 'usajobs') {
              rawJobs = await fetchUsaJobs(word);
            } else if (sourceName === 'themuse') {
              rawJobs = await fetchTheMuseJobs(word);
            } else if (sourceName === 'arbeitnow') {
              rawJobs = await fetchArbeitnowJobs(code, word);
            } else if (sourceName === 'remoteok') {
              rawJobs = await fetchRemoteOkJobs(word);
            } else if (sourceName === 'remotive') {
              rawJobs = await fetchRemotiveJobs(word);
            }

            jobsFetched += rawJobs.length;

            for (const raw of rawJobs) {
              try {
                raw.countryCode = code;
                const normalized = normalizeJob(raw, sourceName, sourceConfig.sourceType);

                const existing = await ExternalJob.findOne({ duplicateHash: normalized.duplicateHash });
                if (existing) {
                  existing.lastSeenAt = syncStartTime;
                  existing.lastSyncedAt = syncStartTime;
                  existing.isActive = true;
                  await existing.save();
                  jobsUpdated++;
                } else {
                  // Upsert by externalJobId (slug only on new docs)
                  const { seoSlug: newSlug2, ...normalizedWithoutSlug2 } = normalized;
                  await ExternalJob.findOneAndUpdate(
                    { source: sourceName, externalJobId: normalized.externalJobId },
                    {
                      $set: { ...normalizedWithoutSlug2, lastSeenAt: syncStartTime, lastSyncedAt: syncStartTime },
                      $setOnInsert: { seoSlug: newSlug2 }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                  );
                  jobsInserted++;
                }
              } catch (err) {
                duplicatesSkipped++;
              }
            }
          } catch (wordError) {
            console.error(`[SyncEngine] Aggregator ${sourceName} sync failed for keyword ${word}:`, wordError.message);
          }
        }
      }

      // Cleanup closed jobs (not seen in this iteration)
      const staleThreshold = new Date(syncStartTime.getTime() - (24 * 60 * 60 * 1000));
      const deactivatedCount = await JobPost.countDocuments({
        source: sourceName,
        countryCode: code,
        lastSeenAt: { $lt: staleThreshold },
        isActive: true,
        isExternal: true
      });

      if (deactivatedCount > 0) {
        await JobPost.updateMany(
          { source: sourceName, countryCode: code, isActive: true, lastSeenAt: { $lt: staleThreshold }, isExternal: true },
          { $set: { isActive: false } }
        );
      }

      // Complete Log
      logEntry.status = 'success';
      logEntry.completedAt = new Date();
      logEntry.jobsFetched = jobsFetched;
      logEntry.jobsInserted = jobsInserted;
      logEntry.jobsUpdated = jobsUpdated;
      logEntry.jobsDeactivated = deactivatedCount;
      logEntry.duplicatesSkipped = duplicatesSkipped;
      logEntry.companiesChecked = companiesChecked;
      await logEntry.save();

      // Update Source Config stats
      sourceConfig.lastSyncAt = new Date();
      sourceConfig.failureCount = 0;
      sourceConfig.lastError = '';
      sourceConfig.status = 'active';
      await sourceConfig.save();

    } catch (err) {
      logEntry.status = 'failed';
      logEntry.completedAt = new Date();
      logEntry.errorMessage = err.message;
      await logEntry.save();

      sourceConfig.failureCount += 1;
      sourceConfig.lastError = err.message;
      sourceConfig.status = 'failed';
      await sourceConfig.save();

      console.error(`[SyncEngine] Sync run error:`, err.message);
    }
  }
};

/**
 * Runs Daily Sync Loop across all active countries and sources
 */
const runDailySync = async () => {
  if (String(process.env.ENABLE_SYNC_ENGINE || '').toLowerCase() !== 'true'
    || String(process.env.ENABLE_CONNECTORS || '').toLowerCase() !== 'true') {
    return { skipped: true, reason: 'Sync engine or connectors disabled' };
  }
  console.log('[SyncEngine] Triggering daily sync loop...');
  const activeSources = await JobSourceConfig.find({ isActive: true });
  for (const src of activeSources) {
    try {
      await runSyncForSource(src.sourceName);
    } catch (err) {
      console.error(`[SyncEngine] Daily sync loop failed for source ${src.sourceName}:`, err.message);
    }
  }

  console.log(`[SyncEngine] Core global job sync cycle finished. Starting Registry (Type 3) automatic fetches...`);
  
  // --- AUTOMATED REGISTRY FETCH (TYPE 3) ---
  for (const [sName, ConnectorClass] of Object.entries(ConnectorRegistry)) {
    const connector = new ConnectorClass();
    if (connector.type === 3) {
      console.log(`[SyncEngine] Triggering automated registry fetch for: ${sName}`);
      await connector.run();
    }
  }

  // --- AUTOMATED CONTACT ENRICHMENT (TYPE 4) ---
  console.log(`[SyncEngine] Starting Contact Enrichment (Type 4) cycle...`);
  const companiesToEnrich = await CompanySource.find({ status: 'active' }).lean(); // or CompanyMaster depending on definition
  for (const [sName, ConnectorClass] of Object.entries(ConnectorRegistry)) {
    const connector = new ConnectorClass();
    if (connector.type === 4) {
      console.log(`[SyncEngine] Triggering automated contact enricher for: ${sName}`);
      for (const comp of companiesToEnrich) {
         if (comp.companyDomain) {
           await connector.run({ companyId: comp._id, companyDomain: comp.companyDomain });
         }
      }
    }
  }

  console.log('[SyncEngine] Daily sync loop completed entirely.');

  // Final Cleanup: archive/delete jobs inactive for too long
  const countries = await CountryConfig.find({ isActive: true });
  for (const country of countries) {
    const retentionDays = country.syncRules?.inactiveJobRetentionDays || 30;
    const deleteBeforeDate = new Date();
    deleteBeforeDate.setDate(deleteBeforeDate.getDate() - retentionDays);

    const deleted = await JobPost.deleteMany({
      countryCode: country.countryCode,
      isActive: false,
      isExternal: true,
      lastSeenAt: { $lt: deleteBeforeDate }
    });
    
    if (deleted.deletedCount > 0) {
      console.log(`[SyncEngine] Cleaned up ${deleted.deletedCount} expired inactive jobs for ${country.countryCode}`);
    }
  }

  // Trigger side effects
  try {
    // 1. Run SEO Automation Queue
    const { generateCountrySeoPages } = require('../seoAutomation/seo.service');
    await generateCountrySeoPages();
  } catch (seoErr) {
    console.error('[SyncEngine] Post-sync SEO automation failed:', seoErr.message);
  }

  try {
    // 2. Run AI Matching Queue
    const { runSyncMatching } = require('../jobMatching/matching.service');
    await runSyncMatching();
  } catch (matchErr) {
    console.error('[SyncEngine] Post-sync AI matching failed:', matchErr.message);
  }
};

module.exports = {
  runSyncForSource,
  runDailySync
};
