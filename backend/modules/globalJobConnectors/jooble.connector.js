const axios = require('axios');
const https = require('https');

// Jooble's certificate chain can fail on some Node.js configs; bypass TLS verify
const joobleAgent = new https.Agent({ rejectUnauthorized: false });

// Jooble API uses a POST body where "location" is an optional city/region name string,
// NOT a country code. Sending a 2-letter country code returns 404.
// We pass location as empty to get global results, then tag jobs with the calling countryCode.
const fetchJoobleJobs = async (countryCode = 'US', keyword = 'developer') => {
  try {
    const apiKey = process.env.JOOBLE_API_KEY;
    if (!apiKey) {
      console.warn('Jooble API Key missing. Skipping Jooble fetch.');
      return [];
    }

    const joobleDomains = {
      'US': 'jooble.org',
      'IN': 'in.jooble.org',
      'GB': 'uk.jooble.org',
      'CA': 'ca.jooble.org',
      'AU': 'au.jooble.org',
      'AE': 'ae.jooble.org'
    };
    const domain = joobleDomains[countryCode.toUpperCase()] || 'jooble.org';
    const url = `https://${domain}/api/${apiKey}`;
    const response = await axios.post(url, {
      keywords: keyword,
      resultsOnPage: 20
      // NOTE: "location" intentionally omitted — Jooble treats it as a city name,
      // passing a 2-letter country code causes a 404.
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 12000,
      httpsAgent: joobleAgent
    });

    const rawJobs = response.data.jobs || response.data.results || [];

    return rawJobs.map((job) => {
      const cleanDesc = (job.snippet || job.description || 'Jooble job posting')
        .replace(/<\/?[^>]+(>|$)/g, ''); // strip HTML tags

      return {
        id: String(job.id),
        title: job.title,
        description: cleanDesc,
        location: job.location || 'Remote',
        city: job.location || '',
        url: job.link || job.url,
        companyName: job.company || 'Jooble Company',
        salaryMin: typeof job.salary === 'number' ? job.salary : null,
        salaryMax: null,
        category: job.type || '',
        skillsTags: []
      };
    });
  } catch (error) {
    if (error.response?.status === 403) {
      console.warn(`Jooble fetch skipped for "${keyword}" in "${countryCode}" (403 Forbidden - Check API key or Rate Limits)`);
    } else {
      console.error(`Jooble fetch failed for country "${countryCode}", keyword "${keyword}":`, error.message);
    }
    return [];
  }
};

module.exports = {
  fetchJoobleJobs
};
