const axios = require('axios');

/**
 * Arbeitnow connector to fetch jobs from Arbeitnow public board
 * @param {string} countryCode - Target country code (normally DE)
 * @param {string} keyword - Search term
 * @returns {Promise<Array>} Normalized job objects
 */
const fetchArbeitnowJobs = async (countryCode = 'DE', keyword = '') => {
  try {
    const url = `https://www.arbeitnow.com/api/job-board-api`;
    const response = await axios.get(url, { timeout: 10000 });
    const rawJobs = response.data.data || [];

    // Filter jobs for country and keywords if specified
    const filtered = rawJobs.filter(job => {
      const matchesCountry = String(job.location || '').toLowerCase().includes(String(countryCode).toLowerCase()) || countryCode === 'DE';
      const matchesKeyword = keyword ? String(job.title || '').toLowerCase().includes(keyword.toLowerCase()) : true;
      return matchesCountry && matchesKeyword;
    });

    return filtered.map((job) => {
      return {
        id: job.slug,
        title: job.title,
        description: job.description || 'Arbeitnow job posting.',
        companyName: job.company_name,
        companyDomain: `${job.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
        location: job.location,
        city: job.location,
        url: job.url,
        category: '',
        skillsTags: job.tags || [],
        jobType: job.job_types && job.job_types[0] ? job.job_types[0] : 'full_time'
      };
    });
  } catch (error) {
    console.error('Arbeitnow fetch failed:', error.message);
    throw error;
  }
};

module.exports = {
  fetchArbeitnowJobs
};
