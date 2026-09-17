const JSearchScanRun = require('../../models/pipeline/JSearchScanRun');
const RawJobImport = require('../../models/pipeline/RawJobImport');
const JobPost = require('../../models/JobPost');
const PipelineAuditLog = require('../../models/pipeline/PipelineAuditLog');
const JobSourceVersion = require('../../models/pipeline/JobSourceVersion');
const DuplicateGroup = require('../../models/pipeline/DuplicateGroup');
const CountryPipelineConfig = require('../../models/pipeline/CountryPipelineConfig');

const { generateQueriesForCountry } = require('./queryGenerationService');
const { fetchJobsFromJSearch } = require('./jsearchClient');
const { categorizeJob } = require('./categoryClassifierService');
const { normalizeSalary, normalizeCompany, normalizeLocation } = require('./jobNormalizationService');
const { validateJob } = require('./jobValidationService');
const { handleDeduplication } = require('./jobDeduplicationService');
const { expireOldJobs } = require('./jobExpiryService');
const { selectCanonicalVersion } = require('./canonicalJobSelectionService');

/**
 * Main orchestrator for JSearch pipeline scans.
 */

const runQueryScan = async ({ countryCode, query, location, scanType, adminUserId = null }) => {
  const scanRun = await JSearchScanRun.create({
    scanType,
    countryCode,
    query,
    location,
    status: 'running',
    triggeredBy: adminUserId
  });

  try {
    const apiResponse = await fetchJobsFromJSearch(query, 1, parseInt(process.env.JSEARCH_DEFAULT_PAGE_SIZE) || 1, countryCode);
    
    if (!apiResponse || !apiResponse.data) {
      throw new Error('Invalid response from JSearch API');
    }

    let rawJobs = [];
    if (Array.isArray(apiResponse.data)) {
      rawJobs = apiResponse.data;
    } else if (apiResponse.data && Array.isArray(apiResponse.data.jobs)) {
      rawJobs = apiResponse.data.jobs;
    } else if (Array.isArray(apiResponse.jobs)) {
      rawJobs = apiResponse.jobs;
    } else {
      throw new Error('JSearch API response data format is not recognized. Expected an array of jobs.');
    }
    
    scanRun.totalFetched = rawJobs.length;

    for (const raw of rawJobs) {
      // Save Raw
      const rawImport = await RawJobImport.create({
        scanRunId: scanRun._id,
        countryCode,
        query,
        location,
        jsearchJobId: raw.job_id,
        sourceJobId: raw.job_id,
        applyUrl: raw.job_apply_link,
        rawTitle: raw.job_title,
        rawCompanyName: raw.employer_name,
        rawLocation: `${raw.job_city || ''}, ${raw.job_state || ''}, ${raw.job_country || ''}`,
        rawDescription: raw.job_description,
        rawPostedDate: raw.job_posted_at_datetime_utc,
        rawJobType: raw.job_employment_type,
        rawPayload: raw,
        processingStatus: 'raw'
      });
      scanRun.totalSavedRaw++;

      // Categorize
      const { categoryId, categoryName } = await categorizeJob(raw.job_title, raw.job_description, null);

      // Normalize
      const normalizedSalary = normalizeSalary(raw.job_salary_raw || '');
      const normalizedCompany = await normalizeCompany(raw.employer_name, null);
      const normalizedLoc = await normalizeLocation(`${raw.job_city || ''}, ${raw.job_state || ''}, ${raw.job_country || ''}`);

      const jobData = {
        title: raw.job_title,
        description: raw.job_description,
        companyName: normalizedCompany.finalName,
        companyId: normalizedCompany.canonicalId,
        companyDomain: normalizedCompany.domain,
        locationText: normalizedLoc.finalLocationText,
        city: normalizedLoc.city,
        state: normalizedLoc.state,
        country: normalizedLoc.country,
        canonicalLocationId: normalizedLoc.canonicalId,
        jobType: raw.job_employment_type,
        employmentType: raw.job_employment_type,
        postedDate: raw.job_posted_at_datetime_utc,
        applyUrl: raw.job_apply_link,
        sourceJobId: raw.job_id,
        sourceName: 'JSearch',
        sourceType: 'aggregated',
        categoryId,
        categoryName,
        ...normalizedSalary
      };

      rawImport.processingStatus = 'normalized';
      await rawImport.save();

      // Validate
      const { isValid, validationErrors, validationStatus } = validateJob(jobData);
      scanRun.totalValidated++;

      if (!isValid) {
        rawImport.processingStatus = 'validation_failed';
        rawImport.validationErrors = validationErrors;
        await rawImport.save();

        await JobPost.create({
          ...jobData,
          isExternal: true,
          status: 'needs_review',
          validationStatus,
          validationErrors
        });
        scanRun.totalFailed++;
        continue; // Skip publishing
      }

      // Deduplicate
      const { isDuplicate, canonicalJob, matchingRule, fingerprint, compositeKey } = await handleDeduplication(jobData);
      
      jobData.contentFingerprint = fingerprint;
      jobData.compositeKey = compositeKey;

      if (!isDuplicate) {
        // Publish New
        const newJob = await JobPost.create({
          ...jobData,
          isExternal: true,
          status: 'active',
          validationStatus: 'passed'
        });
        
        await JobSourceVersion.create({
          jobId: newJob._id,
          sourceName: 'JSearch',
          sourceType: 'aggregated',
          applyUrl: jobData.applyUrl,
          rawPayload: raw,
          isCanonical: true
        });

        rawImport.processingStatus = 'published';
        await rawImport.save();
        scanRun.totalPublished++;

        // Audit Log
        await PipelineAuditLog.create({
          actionType: 'job_publish',
          entityType: 'job',
          entityId: newJob._id,
          triggerSource: scanType === 'manual' ? 'admin_manual' : 'system_automatic',
          adminUserId
        });

      } else {
        // Group as Duplicate
        rawImport.processingStatus = 'duplicate';
        await rawImport.save();

        let dupGroup = canonicalJob.duplicateGroupId;
        if (!dupGroup) {
          dupGroup = await DuplicateGroup.create({
            canonicalJobId: canonicalJob._id,
            duplicateJobIds: [],
            duplicateSourceVersionIds: [],
            matchingRule
          });
          canonicalJob.duplicateGroupId = dupGroup._id;
          await canonicalJob.save();
        } else {
           dupGroup = await DuplicateGroup.findById(dupGroup);
        }

        const sourceVersion = await JobSourceVersion.create({
          jobId: canonicalJob._id,
          duplicateGroupId: dupGroup._id,
          sourceName: 'JSearch',
          sourceType: 'aggregated',
          applyUrl: jobData.applyUrl,
          rawPayload: raw,
          isCanonical: false
        });

        dupGroup.duplicateSourceVersionIds.push(sourceVersion._id);
        await dupGroup.save();

        // Re-evaluate canonical
        await selectCanonicalVersion(dupGroup._id);
      }
    }

    scanRun.status = 'success';
    scanRun.finishedAt = new Date();
    await scanRun.save();

  } catch (error) {
    scanRun.status = 'failed';
    scanRun.errorMessage = error.message;
    scanRun.finishedAt = new Date();
    await scanRun.save();
    throw error;
  }
};

const runCountryScan = async (countryCode) => {
  const queries = await generateQueriesForCountry(countryCode);
  let partialFailure = false;

  for (const q of queries) {
    try {
      await runQueryScan({
        countryCode,
        query: q.normalizedQuery,
        location: q.location,
        scanType: 'scheduled'
      });
    } catch (err) {
      console.error(`[JSearchScanService] Query failed: ${q.normalizedQuery}`, err.message);
      partialFailure = true;
    }
  }

  return !partialFailure;
};

const runScheduledPipeline = async () => {
  console.log('[JSearchScanService] Starting scheduled pipeline...');
  
  // Enforce the 190 requests per month limit for the free plan
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const currentMonthScans = await JSearchScanRun.countDocuments({
    createdAt: { $gte: startOfMonth }
  });

  if (currentMonthScans >= 190) {
    console.warn(`[JSearchScanService] Monthly quota reached (${currentMonthScans}/190). Aborting scheduled run to prevent API exhaustion.`);
    return;
  }

  const activeCountries = await CountryPipelineConfig.find({ isEnabled: true });
  
  for (const country of activeCountries) {
    await runCountryScan(country.countryCode);
  }

  // Expiry checks
  await expireOldJobs();

  console.log('[JSearchScanService] Scheduled pipeline complete.');
};

module.exports = {
  runQueryScan,
  runCountryScan,
  runScheduledPipeline
};
