const axios = require('axios');

/**
 * Workable connector to fetch jobs from public Workable boards
 * @param {string} companyId - The company slug/ID on Workable (e.g. 'workable')
 * @returns {Promise<Array>} Normalized job objects
 */
const fetchWorkableJobs = async (companyId) => {
  try {
    if (!companyId) throw new Error('Workable Company ID is required');
    const url = `https://apply.workable.com/api/v1/companies/${companyId}/jobs`;
    
    // Workable uses a POST request for their public jobs search API
    const response = await axios.post(url, {
      query: "",
      location: [],
      department: [],
      worktype: [],
      precision: "exact"
    }, { timeout: 10000 });

    const rawJobs = response.data.results || response.data.jobs || [];

    return rawJobs.map((job) => {
      const city = job.location?.city || 'Remote';
      const category = job.department || '';
      const applyUrl = `https://apply.workable.com/j/${job.shortcode || job.id}`;

      return {
        id: String(job.shortcode || job.id),
        title: job.title,
        description: `${job.title} posting at Workable board.`,
        location: city,
        city: city,
        url: applyUrl,
        category,
        skillsTags: [job.location?.country, job.worktype].filter(Boolean)
      };
    });
  } catch (error) {
    console.error(`Workable fetch failed for company "${companyId}":`, error.message);
    // Throw specialized error so the caller can mark needs_review
    throw new Error(`WORKABLE_RESTRICTED: ${error.message}`);
  }
};

module.exports = {
  fetchWorkableJobs
};
