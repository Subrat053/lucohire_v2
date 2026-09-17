const axios = require('axios');

/**
 * The Muse connector to fetch public jobs
 * @param {string} keyword - Job query keyword (e.g. 'Software Engineering')
 * @returns {Promise<Array>} Normalized job objects
 */
const fetchTheMuseJobs = async (keyword = '') => {
  try {
    const url = `https://www.themuse.com/api/public/jobs?page=1&descending=true`;
    const response = await axios.get(url, { timeout: 10000 });
    const results = response.data.results || [];

    const filtered = keyword
      ? results.filter(job =>
          String(job.name || '').toLowerCase().includes(keyword.toLowerCase()) ||
          (job.categories || []).some(c => String(c.name || '').toLowerCase().includes(keyword.toLowerCase()))
        )
      : results;

    // If keyword filter returned nothing, return all results from this page
    const finalResults = filtered.length > 0 ? filtered : results;

    return finalResults.map((job) => {
      const location = job.locations && job.locations[0] ? job.locations[0].name : 'Remote';
      return {
        id: String(job.id),
        title: job.name,
        description: job.contents || 'The Muse job posting',
        location,
        city: location,
        url: job.refs?.landing_page,
        companyName: job.company?.name || 'The Muse Company',
        salaryMin: null,
        salaryMax: null,
        category: job.categories && job.categories[0] ? job.categories[0].name : '',
        skillsTags: [job.levels ? job.levels.map(l => l.name) : []].flat().filter(Boolean)
      };
    });
  } catch (error) {
    console.error(`The Muse fetch failed for keyword "${keyword}":`, error.message);
    return [];
  }
};

module.exports = {
  fetchTheMuseJobs
};
