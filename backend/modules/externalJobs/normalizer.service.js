const crypto = require('crypto');

/**
 * Generates MD5 hash for duplicate detection
 */
const generateDuplicateHash = (companyName, title, locationText, applyUrl) => {
  const normCompany = String(companyName || '').toLowerCase().trim();
  const normTitle = String(title || '').toLowerCase().trim();
  const normLocation = String(locationText || '').toLowerCase().trim();
  const normApply = String(applyUrl || '').trim();

  return crypto
    .createHash('md5')
    .update(`${normCompany}|${normTitle}|${normLocation}|${normApply}`)
    .digest('hex');
};

/**
 * Generates a unique SEO-friendly slug for each job
 */
const generateSeoSlug = (title, companyName, city, countryCode) => {
  const slugParts = [
    String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50),
    String(companyName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30),
    city ? String(city).toLowerCase().replace(/[^a-z0-9]+/g, '-') : '',
    String(countryCode || '').toLowerCase()
  ].filter(Boolean);
  const baseSlug = slugParts.join('-').replace(/(^-|-$)/g, '');
  return `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Normalizes job inputs from various ATS & Job Aggregators to unified schema format
 */
const normalizeJob = (rawJob, sourceName, sourceType) => {
  const companyName = rawJob.companyName || rawJob.company || 'Unknown Company';
  const companyDomain = rawJob.companyDomain || '';
  const title = rawJob.title || 'Untitled Job';
  const description = rawJob.description || rawJob.body || 'No description provided.';
  const category = rawJob.category || '';
  const locationText = rawJob.locationText || rawJob.location || '';
  const city = rawJob.city || '';
  const state = rawJob.state || '';
  const countryCode = String(rawJob.countryCode || rawJob.country || 'US').toUpperCase().trim();

  const salaryMin = typeof rawJob.salaryMin === 'number' ? rawJob.salaryMin : null;
  const salaryMax = typeof rawJob.salaryMax === 'number' ? rawJob.salaryMax : null;
  const currency = String(rawJob.currency || 'USD').toUpperCase().trim();
  const salaryPeriod = rawJob.salaryPeriod || 'yearly';

  const jobType = rawJob.jobType || 'full_time';
  const skillsTags = Array.isArray(rawJob.skillsTags) ? rawJob.skillsTags : [];

  const applyUrl = rawJob.applyUrl || rawJob.url || '';
  const sourceJobUrl = rawJob.sourceJobUrl || rawJob.link || '';

  const externalJobId = String(rawJob.externalJobId || rawJob.id || '');

  if (!externalJobId || !applyUrl) {
    throw new Error('Normalization failed: externalJobId and applyUrl are required');
  }

  const duplicateHash = generateDuplicateHash(companyName, title, locationText, applyUrl);
  // Always generate a fresh unique seoSlug so findOneAndUpdate upserts
  // never produce null/conflicting slugs (pre-save hook doesn't run on upsert)
  const seoSlug = generateSeoSlug(title, companyName, city, countryCode);

  return {
    externalJobId,
    source: sourceName,
    sourceType,
    jobOrigin: sourceType,
    applyMode: 'external_redirect',
    companyName,
    companyDomain,
    title,
    description,
    category,
    locationText,
    city,
    state,
    countryCode,
    salaryMin,
    salaryMax,
    currency,
    salaryPeriod,
    jobType,
    skillsTags,
    applyUrl,
    sourceJobUrl,
    isActive: true,
    duplicateHash,
    seoSlug
  };
};

module.exports = {
  generateDuplicateHash,
  generateSeoSlug,
  normalizeJob
};
