/**
 * Pre-publish quality and data validation with 3-Tier Classification and Safe Auto-Heal (Ponytail Mode).
 */

const validateJob = (jobData) => {
  const errors = [];
  const autoFixes = []; // Track safe defaults applied
  const originalState = { ...jobData };

  // --- Tier 1: Trivial / Safe Defaults (Auto-Heal) ---
  if (!jobData.currency) {
    jobData.currency = 'INR';
    autoFixes.push('Missing currency defaulted to INR');
  }

  // --- Tier 2: Correctable but needs Admin Review ---
  if (jobData.description && jobData.description.length < 50) {
    errors.push({ tier: 2, msg: 'Description too short (possible spam or poor quality)' });
  }

  // --- Tier 3: Critical / Destructive Missing Data ---
  if (!jobData.title || jobData.title.trim() === '') {
    errors.push({ tier: 3, msg: 'Missing job title' });
  }

  if (!jobData.companyName || jobData.companyName.trim() === '') {
    errors.push({ tier: 3, msg: 'Missing company name' });
  }

  if (!jobData.locationText || jobData.locationText.trim() === '') {
    errors.push({ tier: 3, msg: 'Missing location' });
  }

  if (!jobData.applyUrl || jobData.applyUrl.trim() === '') {
    errors.push({ tier: 3, msg: 'Missing apply URL' });
  }

  const urlPattern = /^https?:\/\/.+/i;
  if (jobData.applyUrl && !urlPattern.test(jobData.applyUrl)) {
    errors.push({ tier: 3, msg: 'Invalid apply URL format' });
  }

  if (jobData.postedDate) {
    const posted = new Date(jobData.postedDate);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    if (posted < ninetyDaysAgo) {
      errors.push({ tier: 2, msg: 'Job posted date is older than 90 days' });
    }
  }

  const isValid = errors.length === 0;
  
  return {
    isValid,
    validationErrors: errors,
    autoFixes,
    originalState,
    validationStatus: isValid ? 'passed' : 'needs_review'
  };
};

module.exports = {
  validateJob
};
