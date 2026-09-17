const axios = require('axios');

/**
 * RemoteOK connector to fetch remote postings from RemoteOK JSON feed
 * @param {string} keyword - Search term
 * @returns {Promise<Array>} Normalized job objects
 */
const fetchRemoteOkJobs = async (keyword = '') => {
  try {
    const url = `https://remoteok.com/api`;
    // RemoteOK requires a realistic User-Agent header, otherwise it blocks with 403.
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    const data = response.data || [];
    if (!Array.isArray(data)) return [];

    // Filter out the legal/meta header
    const rawJobs = data.filter(item => item && item.id);

    const filtered = rawJobs.filter(job => {
      return keyword ? String(job.position || '').toLowerCase().includes(keyword.toLowerCase()) : true;
    });

    return filtered.map((job) => {
      return {
        id: String(job.id),
        title: job.position,
        description: job.description || 'RemoteOK job posting.',
        companyName: job.company,
        companyDomain: `${String(job.company || '').toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
        location: 'Remote',
        city: 'Remote',
        url: job.url,
        category: '',
        skillsTags: job.tags || [],
        salaryMin: job.salary_min || null,
        salaryMax: job.salary_max || null,
        jobType: 'remote'
      };
    });
  } catch (error) {
    console.error('RemoteOK fetch failed:', error.message);
    throw error;
  }
};

module.exports = {
  fetchRemoteOkJobs
};
