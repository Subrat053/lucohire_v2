const axios = require('axios');

/**
 * Lever connector to fetch jobs from public Lever boards
 * @param {string} companyId - The company slug/ID on Lever (e.g. 'lever')
 * @returns {Promise<Array>} Normalized job objects
 */
const fetchLeverJobs = async (companyId) => {
  try {
    if (!companyId) throw new Error('Lever Company ID is required');
    const url = `https://api.lever.co/v0/postings/${companyId}?mode=json`;
    const response = await axios.get(url, { timeout: 10000 });
    const rawJobs = response.data || [];

    return rawJobs.map((job) => {
      const city = job.categories?.location || 'Remote';
      const category = job.categories?.team || job.categories?.department || '';
      
      const description = job.descriptionHtml || job.description || 'Lever job posting';

      return {
        id: String(job.id),
        title: job.text,
        description,
        location: city,
        city: city,
        url: job.hostedUrl,
        category,
        skillsTags: [job.categories?.commitment, job.categories?.allLocations].flat().filter(Boolean)
      };
    });
  } catch (error) {
    console.error(`Lever fetch failed for company "${companyId}":`, error.message);
    throw error;
  }
};

module.exports = {
  fetchLeverJobs
};
