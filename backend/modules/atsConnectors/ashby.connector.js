const axios = require('axios');

/**
 * Ashby connector to fetch jobs from public Ashby iframe boards
 * @param {string} companyId - The company slug/ID on Ashby (e.g. 'vercel')
 * @returns {Promise<Array>} Normalized job objects
 */
const fetchAshbyJobs = async (companyId) => {
  try {
    if (!companyId) throw new Error('Ashby Company ID is required');
    const url = `https://api.ashbyhq.com/api/v1/iframe/${companyId}/jobs`;
    const response = await axios.get(url, { timeout: 10000 });
    const rawJobs = response.data.jobs || [];

    return rawJobs.map((job) => {
      const location = job.location || 'Remote';
      const category = job.department || '';
      
      const description = job.description || 'Ashby job posting';

      return {
        id: String(job.id),
        title: job.title,
        description,
        location,
        city: location,
        url: job.jobUrl,
        category,
        skillsTags: [job.employmentType, job.isRemote ? 'Remote' : 'Onsite'].filter(Boolean)
      };
    });
  } catch (error) {
    console.error(`Ashby fetch failed for company "${companyId}":`, error.message);
    throw error;
  }
};

module.exports = {
  fetchAshbyJobs
};
