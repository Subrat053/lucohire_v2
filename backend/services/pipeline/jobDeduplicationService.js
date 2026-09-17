const crypto = require('crypto');
const JobPost = require('../../models/JobPost');
const JobSourceVersion = require('../../models/pipeline/JobSourceVersion');
const DuplicateGroup = require('../../models/pipeline/DuplicateGroup');

/**
 * Service to detect and group duplicate jobs.
 */

const generateFingerprint = (title, companyDomain, locationText, description) => {
  const content = `${title || ''}|${companyDomain || ''}|${locationText || ''}|${(description || '').substring(0, 200)}`.toLowerCase().trim();
  return crypto.createHash('sha256').update(content).digest('hex');
};

const generateCompositeKey = (title, companyDomain, locationText) => {
  return `${title || ''}|${companyDomain || ''}|${locationText || ''}`.toLowerCase().trim();
};

const findDuplicateJob = async (jobData) => {
  const fingerprint = generateFingerprint(jobData.title, jobData.companyDomain, jobData.locationText, jobData.description);
  const compositeKey = generateCompositeKey(jobData.title, jobData.companyDomain, jobData.locationText);

  // 1. Check by Source Job ID
  if (jobData.sourceJobId) {
    const bySourceId = await JobPost.findOne({ sourceJobId: jobData.sourceJobId });
    if (bySourceId) return { canonicalJob: bySourceId, matchingRule: 'source_job_id', fingerprint, compositeKey };
  }

  // 2. Check by Apply URL (ignore query params ideally, but simple exact match here)
  if (jobData.applyUrl) {
    const byApplyUrl = await JobPost.findOne({ applyUrl: jobData.applyUrl });
    if (byApplyUrl) return { canonicalJob: byApplyUrl, matchingRule: 'apply_url', fingerprint, compositeKey };
  }

  // 3. Check by Requisition ID
  if (jobData.requisitionId && jobData.companyId) {
    const byReqId = await JobPost.findOne({ requisitionId: jobData.requisitionId, companyId: jobData.companyId });
    if (byReqId) return { canonicalJob: byReqId, matchingRule: 'requisition_id', fingerprint, compositeKey };
  }

  // 4. Content fingerprint
  const byFingerprint = await JobPost.findOne({ contentFingerprint: fingerprint });
  if (byFingerprint) return { canonicalJob: byFingerprint, matchingRule: 'content_fingerprint', fingerprint, compositeKey };

  // 5. Composite Key
  const byComposite = await JobPost.findOne({ compositeKey: compositeKey });
  if (byComposite) return { canonicalJob: byComposite, matchingRule: 'composite_id', fingerprint, compositeKey };

  // No duplicate found
  return { canonicalJob: null, matchingRule: null, fingerprint, compositeKey };
};

const handleDeduplication = async (jobData) => {
  const { canonicalJob, matchingRule, fingerprint, compositeKey } = await findDuplicateJob(jobData);
  
  return {
    isDuplicate: !!canonicalJob,
    canonicalJob,
    matchingRule,
    fingerprint,
    compositeKey
  };
};

module.exports = {
  findDuplicateJob,
  handleDeduplication,
  generateFingerprint,
  generateCompositeKey
};
