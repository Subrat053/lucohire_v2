const axios = require('axios');
const CountryPipelineConfig = require('../../models/pipeline/CountryPipelineConfig');
const QuerySeedHistory = require('../../models/pipeline/QuerySeedHistory');

/**
 * Service to generate queries before JSearch.
 */

const getFixedSeedQueries = async (countryCode) => {
  const config = await CountryPipelineConfig.findOne({ countryCode, isEnabled: true });
  if (!config) return [];

  // fallback to fixed seeds
  return config.seedQueries
    .filter(sq => sq.isEnabled && sq.sourceType === 'fixed_seed')
    .map(sq => ({ query: sq.query, location: sq.location }));
};

const getHistoricalSuccessfulQueries = async (countryCode) => {
  const config = await CountryPipelineConfig.findOne({ countryCode, isEnabled: true });
  if (!config) return [];

  return config.seedQueries
    .filter(sq => sq.isEnabled && sq.sourceType === 'historical_success')
    .map(sq => ({ query: sq.query, location: sq.location }));
};

const normalizeQueryLocation = (rawLocation) => {
  // Simple mapping, can be expanded to use LocationMaster later
  const normalized = rawLocation.trim().toLowerCase();
  
  const expansions = {
    'delhi ncr': ['Delhi', 'Noida', 'Gurugram', 'Ghaziabad'],
    'nyc': ['New York']
  };

  if (expansions[normalized]) {
    return expansions[normalized];
  }
  
  return [rawLocation.trim()];
};

const combineTermWithLocation = (term, location) => {
  // If the term already includes the location naturally (like from Autocomplete), we can just use the term directly.
  // We'll still append it if it doesn't seem to include " in " to ensure geographic targeting.
  if (term.toLowerCase().includes(' in ')) {
    return term.trim();
  }
  return `${term.trim()} in ${location.trim()}`;
};

const fetchGoogleAutocompleteSeeds = async (baseTerm) => {
  try {
    const response = await axios.get(`http://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(baseTerm)}`, {
      timeout: 5000
    });
    if (response.data && Array.isArray(response.data[1])) {
      return response.data[1]; // Array of suggested strings
    }
    return [];
  } catch (error) {
    console.warn(`[QueryGenerationService] Google Autocomplete failed for term "${baseTerm}": ${error.message}`);
    return []; // Best-effort fallback
  }
};

const generateQueriesForCountry = async (countryCode) => {
  let queriesToRun = [];

  const fixedSeeds = await getFixedSeedQueries(countryCode);
  const historySeeds = await getHistoricalSuccessfulQueries(countryCode);

  const uniqueLocations = [...new Set([...fixedSeeds, ...historySeeds].map(s => s.location).filter(Boolean))];
  
  // If no locations defined, use country as fallback
  if (uniqueLocations.length === 0) {
    uniqueLocations.push(countryCode === 'IN' ? 'India' : countryCode);
  }

  let dynamicSeeds = [];
  
  // Discover new job terms via Google Autocomplete (Seed Discovery Source)
  for (const loc of uniqueLocations) {
    // We search for "jobs in <city> " (trailing space) to prompt Google for roles like "for freshers", "for nurses", etc.
    const suggestions = await fetchGoogleAutocompleteSeeds(`jobs in ${loc} `);
    
    for (const suggestion of suggestions) {
       dynamicSeeds.push({
         query: suggestion, 
         location: loc,
         sourceType: 'google_autocomplete'
       });
    }
  }

  const allSeeds = [
    ...fixedSeeds.map(s => ({...s, sourceType: 'fixed_seed'})), 
    ...historySeeds.map(s => ({...s, sourceType: 'historical_success'})), 
    ...dynamicSeeds
  ];

  for (const seed of allSeeds) {
    const locations = normalizeQueryLocation(seed.location);
    for (const loc of locations) {
      const combined = combineTermWithLocation(seed.query, loc);
      queriesToRun.push({
        rawTerm: seed.query,
        normalizedQuery: combined,
        location: loc,
        sourceType: seed.sourceType
      });
    }
  }

  // Deduplicate generated queries
  const uniqueQueries = [];
  const seen = new Set();
  for (const q of queriesToRun) {
    const key = `${q.normalizedQuery}-${q.location}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueQueries.push(q);
    }
  }

  return uniqueQueries;
};

module.exports = {
  generateQueriesForCountry,
  getFixedSeedQueries,
  getHistoricalSuccessfulQueries,
  normalizeQueryLocation,
  combineTermWithLocation,
  fetchGoogleAutocompleteSeeds
};
