/**
 * Validation service for verifying country configurations.
 */

const validateCountrySetup = (country) => {
  const errors = [];

  // 1. Basic validation
  if (!country.countryName || country.countryName.trim() === '') {
    errors.push('Country name is required');
  }
  if (!country.countryCode || country.countryCode.trim().length !== 2) {
    errors.push('ISO country code must be a 2-letter uppercase code');
  }
  if (!country.currency || country.currency.trim().length !== 3) {
    errors.push('Currency code must be a 3-letter uppercase code');
  }
  if (!country.currencySymbol || country.currencySymbol.trim() === '') {
    errors.push('Currency symbol is required');
  }
  if (!country.timezone || country.timezone.trim() === '') {
    errors.push('Timezone is required');
  }

  // 2. Source availability validation
  const jobSources = country.supportedJobSources || [];
  const atsSources = country.supportedAtsSources || [];
  if (jobSources.length === 0 && atsSources.length === 0) {
    errors.push('At least one job source or ATS source must be enabled');
  }

  // 3. Category & skill validation
  if (!country.categories || country.categories.length === 0) {
    errors.push('At least one job category must be enabled');
  }

  // 4. SEO rule validation
  if (!country.seoRules || typeof country.seoRules.minimumJobsForSeoPage !== 'number' || country.seoRules.minimumJobsForSeoPage < 0) {
    errors.push('SEO rules must configure a minimum jobs limit');
  }

  // 5. Pricing validation
  if (!country.pricingRules || !country.pricingRules.defaultCurrency) {
    errors.push('Pricing rules default currency is required');
  }
  if (country.pricingRules && (typeof country.pricingRules.taxPercentage !== 'number' || country.pricingRules.taxPercentage < 0)) {
    errors.push('Tax percentage cannot be negative');
  }

  // 6. Notification validation
  if (!country.notificationRules) {
    errors.push('Notification rules must be configured');
  }

  // 7. Sync rules validation
  if (!country.syncRules || typeof country.syncRules.syncFrequencyHours !== 'number' || country.syncRules.syncFrequencyHours <= 0) {
    errors.push('Sync rules frequency must be greater than 0 hours');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateCountrySetup
};
