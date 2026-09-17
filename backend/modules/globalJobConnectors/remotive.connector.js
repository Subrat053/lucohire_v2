const axios = require('axios');

/**
 * Remotive connector to fetch remote postings from Remotive public API
 * @param {string} keyword - Search term
 * @returns {Promise<Array>} Normalized job objects
 */
const fetchRemotiveJobs = async (keyword = '') => {
  try {
    const url = `https://remotive.com/api/remote-jobs`;
    const response = await axios.get(url, { timeout: 10000 });
    const rawJobs = response.data.jobs || [];

    const filtered = rawJobs.filter(job => {
      return keyword ? String(job.title || '').toLowerCase().includes(keyword.toLowerCase()) : true;
    });

    return filtered.map((job) => {
      return {
        id: String(job.id),
        title: job.title,
        description: job.description || 'Remotive job posting.',
        companyName: job.company_name,
        companyDomain: `${String(job.company_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
        location: job.candidate_required_location || 'Remote',
        city: 'Remote',
        url: job.url,
        category: job.category || '',
        skillsTags: job.tags || [],
        jobType: 'remote'
      };
    });
  } catch (error) {
    console.error('Remotive fetch failed:', error.message);
    throw error;
  }
};

module.exports = {
  fetchRemotiveJobs
};
