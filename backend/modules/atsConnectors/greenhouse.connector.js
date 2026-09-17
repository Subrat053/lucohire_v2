const axios = require('axios');

/**
 * Greenhouse connector to fetch jobs from public Greenhouse boards
 * @param {string} boardToken - The company slug/board token on Greenhouse (e.g. 'stripe')
 * @returns {Promise<Array>} Normalized job objects
 */
const fetchGreenhouseJobs = async (boardToken) => {
  try {
    if (!boardToken) throw new Error('Greenhouse Board Token is required');
    const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
    const response = await axios.get(url, { timeout: 10000 });
    const rawJobs = response.data.jobs || [];

    return rawJobs.map((job) => {
      // Greenhouse location can be string or object
      const locationName = typeof job.location === 'object' ? job.location.name : (job.location || 'Remote');
      
      // Parse description from html
      const description = job.content || 'Greenhouse job posting';

      return {
        id: String(job.id),
        title: job.title,
        description,
        location: locationName,
        city: locationName,
        url: job.absolute_url,
        // Categories / Departments
        category: job.departments && job.departments[0] ? job.departments[0].name : '',
        skillsTags: job.offices ? job.offices.map(o => o.name) : []
      };
    });
  } catch (error) {
    console.error(`Greenhouse fetch failed for token "${boardToken}":`, error.message);
    throw error;
  }
};

module.exports = {
  fetchGreenhouseJobs
};
