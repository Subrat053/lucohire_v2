const axios = require('axios');

/**
 * SmartRecruiters connector to fetch jobs from public SmartRecruiters boards
 * @param {string} companyId - The company slug/ID on SmartRecruiters (e.g. 'stripe')
 * @returns {Promise<Array>} Normalized job objects
 */
const fetchSmartRecruitersJobs = async (companyId) => {
  try {
    if (!companyId) throw new Error('SmartRecruiters Company ID is required');
    const url = `https://api.smartrecruiters.com/v1/companies/${companyId}/postings`;
    const response = await axios.get(url, { timeout: 10000 });
    const rawJobs = response.data.content || [];

    return rawJobs.map((job) => {
      const city = job.location?.city || 'Remote';
      const category = job.department?.name || '';
      const applyUrl = `https://jobs.smartrecruiters.com/${companyId}/${job.id}`;

      return {
        id: String(job.id),
        title: job.title,
        description: `${job.title} at ${job.company?.name || companyId}. Ref: ${job.refNumber || ''}`,
        location: city,
        city: city,
        url: applyUrl,
        category,
        skillsTags: [job.location?.region, job.location?.country].filter(Boolean)
      };
    });
  } catch (error) {
    console.error(`SmartRecruiters fetch failed for company "${companyId}":`, error.message);
    throw error;
  }
};

module.exports = {
  fetchSmartRecruitersJobs
};
