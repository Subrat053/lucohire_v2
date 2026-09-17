const axios = require('axios');

/**
 * USAJobs connector to fetch US government jobs
 * @param {string} keyword - Search query keyword (e.g. 'developer')
 * @returns {Promise<Array>} Normalized job objects
 */
const fetchUsaJobs = async (keyword = 'developer') => {
  try {
    const apiKey = process.env.USAJOBS_API_KEY;
    const userAgent = process.env.USAJOBS_USER_AGENT || 'ServiceHub-App';

    if (!apiKey) {
      console.warn('USAJobs API Key missing. Skipping USAJobs fetch.');
      return [];
    }

    const url = `https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(keyword)}&LocationName=United States`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Authorization-Key': apiKey,
        'Host': 'data.usajobs.gov'
      },
      timeout: 10000
    });

    const searchResult = response.data.SearchResult?.SearchResultItems || [];

    return searchResult.map((item) => {
      const match = item.MatchedObjectDescriptor;
      const location = match.PositionLocation ? match.PositionLocation.map(l => l.LocationName).join(', ') : 'USA';
      
      const salaryRange = match.PositionRemuneration && match.PositionRemuneration[0];
      const salaryMin = salaryRange ? Number(salaryRange.MinimumRange) : null;
      const salaryMax = salaryRange ? Number(salaryRange.MaximumRange) : null;

      return {
        id: String(match.PositionID),
        title: match.PositionTitle,
        description: match.UserArea?.Details?.JobSummary || match.PositionDescription || 'USA government job posting',
        location,
        city: match.PositionLocation ? match.PositionLocation[0]?.LocationName : 'USA',
        url: match.PositionURI,
        companyName: match.OrganizationName || 'US Government',
        salaryMin,
        salaryMax,
        category: match.JobCategory ? match.JobCategory[0]?.Name : 'Government',
        skillsTags: ['usajobs', match.PositionSchedule ? match.PositionSchedule[0]?.Name : ''].filter(Boolean)
      };
    });
  } catch (error) {
    console.error(`USAJobs fetch failed for keyword "${keyword}":`, error.message);
    return [];
  }
};

module.exports = {
  fetchUsaJobs
};
