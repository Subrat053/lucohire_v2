const axios = require('axios');
const { withRetry } = require('./retryHelper');

/**
 * Service to interact with the JSearch API via RapidAPI.
 */
const fetchJobsFromJSearch = async (query, page = 1, numPages = 1, country = 'us') => {
  const baseUrl = process.env.JSEARCH_API_BASE_URL || 'https://jsearch.p.rapidapi.com';
  const host = process.env.JSEARCH_API_HOST || 'jsearch.p.rapidapi.com';
  const key = process.env.JSEARCH_API_KEY;
  const timeoutMs = parseInt(process.env.JSEARCH_TIMEOUT_MS) || 15000;
  const maxRetries = parseInt(process.env.JSEARCH_MAX_RETRIES) || 3;

  if (!key) {
    throw new Error('JSEARCH_API_KEY environment variable is not set');
  }

  const options = {
    method: 'GET',
    url: `${baseUrl}/search-v2`,
    params: {
      query: query,
      page: page.toString(),
      num_pages: numPages.toString(),
      country: country,
      date_posted: 'month' // fetch recent jobs
    },
    headers: {
      'x-rapidapi-key': key,
      'x-rapidapi-host': host
    },
    timeout: timeoutMs
  };

  const executeRequest = async () => {
    const response = await axios.request(options);
    return response.data;
  };

  try {
    return await withRetry(executeRequest, maxRetries);
  } catch (error) {
    console.error(`[JSearchClient] Error fetching jobs for query "${query}":`, error.message);
    throw error;
  }
};

module.exports = {
  fetchJobsFromJSearch
};
