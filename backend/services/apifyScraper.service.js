const axios = require('axios');
const AdminSetting = require('../models/AdminSetting');

const DataSourceConfig = require('../models/DataSourceConfig');

const APIFY_BASE_URL = 'https://api.apify.com/v2';

const getApifyActorId = async () => {
  if (process.env.APIFY_NAUKRI_ACTOR_ID) return process.env.APIFY_NAUKRI_ACTOR_ID;
  const config = await DataSourceConfig.findOne({ type: 'apify_actor', status: 'active' });
  return config?.endpointOrActorId || 'apify/naukri-profile-scraper';
};

/**
 * Pre-Fetch Scout Estimate
 * Does a lightweight query to estimate total results before doing a deep scrape.
 */
exports.getScoutEstimate = async (query) => {
  try {
    const cookie = await AdminSetting.getValue('apify_naukri_cookie', '');
    if (!cookie) {
      throw new Error("Naukri session cookie is missing. Please set it in the Admin Dashboard.");
    }
    
    // In a real implementation, this might call a specific "Scout" actor or endpoint.
    // For now, we simulate the scout logic returning a mocked count to satisfy the UI preview.
    console.log(`[ApifyScout] Running scout for query: ${query} using cookie: ${cookie.substring(0, 10)}...`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return a random estimate between 1000 and 5000 for preview UI
    return {
      success: true,
      estimatedMatches: Math.floor(Math.random() * 4000) + 1000,
      message: "Scout successful"
    };
  } catch (error) {
    console.error('[ApifyScout] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Deep Scrape Execution
 * Fires the Apify Actor to scrape and download up to 'limit' candidates.
 */
exports.executeDeepScrape = async (query, limit) => {
  try {
    const cookie = await AdminSetting.getValue('apify_naukri_cookie', '');
    const token = process.env.APIFY_API_TOKEN;
    
    const actorId = await getApifyActorId();
    if (!cookie || !token || !actorId) {
      throw new Error("Missing Apify Token, Actor ID, or Naukri Cookie in configuration.");
    }

    console.log(`[ApifyDeepScrape] Firing deep scrape for '${query}' with limit ${limit}`);

    // This would actually trigger the Apify Actor via REST API:
    /*
    const response = await axios.post(
      `${APIFY_BASE_URL}/acts/${APIFY_ACTOR_ID}/runs?token=${token}`,
      {
        startUrls: [{ url: `https://www.naukri.com/search?keywords=${encodeURIComponent(query)}` }],
        cookie: cookie,
        maxItems: limit
      }
    );
    return response.data;
    */
    
    // Simulating the scrape and return formatting for now
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulated payload of scraped candidates to be sent to Staging DB
    const scrapedData = Array.from({ length: Math.min(limit, 5) }).map((_, i) => ({
      name: `Candidate ${i + 1} (${query})`,
      email: `candidate${i+1}@example.com`,
      phone: `+91999999999${i}`,
      jobTitle: query,
      skills: query.split(' '),
      location: "India"
    }));

    return {
      success: true,
      data: scrapedData,
      runId: 'mock-run-id-12345'
    };

  } catch (error) {
    console.error('[ApifyDeepScrape] Error:', error.message);
    return { success: false, error: error.message };
  }
};
