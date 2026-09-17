const axios = require('axios');

/**
 * Verifies if an external job URL is still active.
 * @param {string} url - The URL to check
 * @param {string} source - The source name (e.g. 'adzuna')
 * @returns {Promise<boolean>} true if active, false if dead
 */
const verifyJobStatus = async (url, source) => {
  if (!url) return false;
  
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Resolve for 404 as well
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.status === 404 || response.status === 410) {
      return false; // Definitely dead
    }

    const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

    if (source === 'adzuna') {
      if (html.includes('Unfortunately, this job is no longer available') || html.includes('Page not found')) {
        return false;
      }
    }
    
    // Add logic for other sources here if needed in the future
    
    return true; 
  } catch (error) {
    console.error(`[JobHealthChecker] Error verifying URL ${url}:`, error.message);
    // On network failure/timeout, assume true to avoid false positives
    return true; 
  }
};

module.exports = {
  verifyJobStatus
};
