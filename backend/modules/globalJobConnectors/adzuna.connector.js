const axios = require('axios');

/**
 * Adzuna connector to fetch jobs from Adzuna API
 * @param {string} countryCode - 2-letter country code (e.g. 'in', 'us')
 * @param {string} keyword - Search query keyword (e.g. 'developer')
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} Normalized job objects
 */
const fetchAdzunaJobs = async (countryCode = 'us', keyword = 'developer', limit = 20) => {
  try {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {
      console.warn('Adzuna API credentials missing. Skipping Adzuna fetch.');
      return [];
    }

    const country = String(countryCode).toLowerCase().trim();
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=${limit}&what=${encodeURIComponent(keyword)}`;
    
    const response = await axios.get(url, { timeout: 10000 });
    const results = response.data.results || [];

    return results.map((job) => {
      const locationName = job.location?.display_name || 'Remote';
      return {
        id: String(job.id),
        title: job.title,
        description: job.description || 'Adzuna job posting',
        location: locationName,
        city: locationName,
        url: job.redirect_url,
        companyName: job.company?.display_name || 'Adzuna Company',
        salaryMin: job.salary_min || null,
        salaryMax: job.salary_max || null,
        category: job.category?.label || '',
        skillsTags: [job.contract_time, job.contract_type].filter(Boolean)
      };
    });
  } catch (error) {
    console.error(`Adzuna fetch failed for country "${countryCode}", keyword "${keyword}":`, error.message);
    return [];
  }
};

module.exports = {
  fetchAdzunaJobs
};
