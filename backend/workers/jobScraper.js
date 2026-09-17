const cron = require('node-cron');
const axios = require('axios');
const https = require('https');
const JobPost = require('../models/JobPost');
const ProviderProfile = require('../models/ProviderProfile');
const { notifyProvidersOfNewJob, sendExternalRecruiterMatchEmail } = require('../services/notificationService');

function extractEmail(text) {
  if (!text) return null;
  const match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Create an insecure HTTPS agent for APIs with local SSL issues,
// avoiding process-wide NODE_TLS_REJECT_UNAUTHORIZED = '0'.
const insecureAgent = new https.Agent({
  rejectUnauthorized: false
});

// Adzuna API Example Credentials
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

// Jooble API Key
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY;

// RapidAPI Google Jobs
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Indeed Scraper RapidAPI Key
const INDEED_RAPIDAPI_KEY = process.env.INDEED_RAPIDAPI_KEY;

// Simple delay helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


const getDynamicSkills = async () => {
  try {
    // Get all skills from active provider profiles
    const profiles = await ProviderProfile.find().select('skills').lean();
    const allSkills = profiles.flatMap(p => p.skills || []);
    
    // Normalize and get unique skills
    const uniqueSkills = [...new Set(allSkills.map(s => s.toLowerCase().trim()))].filter(Boolean);
    
    // If database is empty, fallback to a default
    if (uniqueSkills.length === 0) return ['developer'];

    // Limit to 5 skills per run to avoid hitting API rate limits
    return uniqueSkills.slice(0, 5); 
  } catch (error) {
    console.error('Error fetching dynamic skills:', error);
    return ['developer']; // Fallback
  }
};

const fetchAdzunaJobs = async (skill, location = 'India') => {
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=5&what=${encodeURIComponent(skill)}&where=${encodeURIComponent(location)}`;
    const response = await axios.get(url, { httpsAgent: insecureAgent, timeout: 8000 });
    const jobs = response.data.results || [];
    // console.log(`Fetched ${jobs.length} jobs for skill "${skill}":`, jobs.map(j => j.title));
    
    return jobs.map(job => ({
      title: job.title,
      companyName: job.company?.display_name || 'Unknown',
      description: job.description || '',
      city: job.location?.display_name || 'Remote',
      latitude: job.latitude || null,
      longitude: job.longitude || null,
      externalUrl: job.redirect_url,
      source: 'adzuna',
      isExternal: true,
      skill: skill, 
    }));
  } catch (error) {
    console.error(`Adzuna fetch failed for skill "${skill}":`, error.message);
    return [];
  }
};

const fetchJoobleJobs = async (skill, location = 'India') => {
  try {
    const joobleDomains = {
      'US': 'jooble.org',
      'IN': 'in.jooble.org',
      'GB': 'uk.jooble.org',
      'CA': 'ca.jooble.org',
      'AU': 'au.jooble.org',
      'AE': 'ae.jooble.org'
    };
    
    // Parse the country out of location if possible, or fallback to India since it's the default in the old code
    let countryCode = 'IN';
    if (location.toLowerCase().includes('us') || location.toLowerCase().includes('states')) countryCode = 'US';
    else if (location.toLowerCase().includes('canada')) countryCode = 'CA';
    else if (location.toLowerCase().includes('uk') || location.toLowerCase().includes('kingdom')) countryCode = 'GB';
    else if (location.toLowerCase().includes('australia')) countryCode = 'AU';
    
    const domain = joobleDomains[countryCode] || 'jooble.org';
    const url = `https://${domain}/api/${JOOBLE_API_KEY}`;
    
    const response = await axios.post(url, {
      keywords: skill,
      location: location
    }, {
      headers: { 'Content-Type': 'application/json' },
      httpsAgent: insecureAgent,
      timeout: 10000
    });

    const rawJobs = response.data.jobs || response.data.results || [];

    return rawJobs.map((job) => ({
      title: job.title,
      companyName: job.company || 'Jooble Company',
      description: job.snippet || job.description || 'Jooble job posting',
      city: job.location || location,
      externalUrl: job.link || job.url || '',
      source: 'jooble',
      isExternal: true,
      skill: skill,
    }));
  } catch (error) {
    console.error(`Jooble fetch failed for skill "${skill}":`, error.message);
    return [];
  }
};

const fetchRapidApiJobs = async (skill, location = 'India') => {
  try {
    const encodedParams = new URLSearchParams();
    encodedParams.set('query', `${skill} in ${location}`);
    encodedParams.set('count', '5');
    encodedParams.set('location', location);
    encodedParams.set('device', 'undefined');
    encodedParams.set('employment_type', 'undefined');

    const options = {
      method: 'POST',
      url: 'https://google-jobs-api1.p.rapidapi.com/jobs',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'google-jobs-api1.p.rapidapi.com',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: encodedParams,
      httpsAgent: insecureAgent,
      timeout: 8000
    };

    const response = await axios.request(options);
    const jobs = response.data.jobs || response.data.data || [];
    console.log(`Fetched ${jobs.length} jobs for skill "${skill}":`, jobs.map(j => j.title));

    return jobs.map(job => ({
      title: job.title,
      companyName: job.company_name || 'Unknown',
      description: job.description || job.snippet || '',
      city: job.location || location,
      externalUrl: job.link || job.url || '',
      source: 'rapidapi_google',
      isExternal: true,
      skill: skill,
    }));
  } catch (error) {
    console.error(`RapidAPI fetch failed for skill "${skill}":`, error.message);
    return [];
  }
};

const fetchIndeedJobs = async (skill, location = 'India') => {
  try {
    const countryCode = location.toLowerCase().includes('us') || location.toLowerCase().includes('united states') || location.toLowerCase().includes('san francisco') ? 'us' : 'in';
    const options = {
      method: 'POST',
      url: 'https://indeed-scraper-api.p.rapidapi.com/api/job',
      headers: {
        'x-rapidapi-key': INDEED_RAPIDAPI_KEY,
        'x-rapidapi-host': 'indeed-scraper-api.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      data: {
        scraper: {
          maxRows: 15,
          query: skill,
          location: location,
          jobType: 'fulltime',
          radius: '50',
          sort: 'relevance',
          fromDays: '7',
          country: countryCode
        }
      },
      httpsAgent: insecureAgent,
      timeout: 12000
    };

    const response = await axios.request(options);
    const jobs = response.data.returnvalue?.data || [];
    // console.log(`Fetched ${jobs.length} Indeed jobs for skill "${skill}":`, jobs.map(j => j.title));

    return jobs.map(job => ({
      title: job.title,
      companyName: job.companyName || 'Unknown',
      description: job.descriptionText || job.descriptionHtml || '',
      city: typeof job.location === 'object' ? (job.location?.formattedAddressShort || job.location?.city || location) : (job.location || location),
      externalUrl: job.jobUrl || job.applyUrl || '',
      source: 'indeed',
      isExternal: true,
      skill: skill,
    }));
  } catch (error) {
    console.error(`Indeed fetch failed for skill "${skill}":`, error.message);
    return [];
  }
};

const runJobScraper = async (overrideSkills = null, targetCity = null) => {
  console.log('Starting job scraper...');
  
  const skillsToScrape = overrideSkills || await getDynamicSkills();
  console.log('Skills to scrape:', skillsToScrape);

  let insertedCount = 0;
  const locationParam = targetCity || 'India';

  for (const skill of skillsToScrape) {
    console.log(`Fetching external jobs for: ${skill} in ${locationParam}`);
    
    const allJobsForSkill = [];
    
    const indeedJobs = await fetchIndeedJobs(skill, locationParam);
    allJobsForSkill.push(...indeedJobs);

    const adzunaJobs = await fetchAdzunaJobs(skill, locationParam);
    allJobsForSkill.push(...adzunaJobs);
    
    // const joobleJobs = await fetchJoobleJobs(skill);
    // allJobsForSkill.push(...joobleJobs);

    // const rapidApiJobs = await fetchRapidApiJobs(skill);
    // allJobsForSkill.push(...rapidApiJobs);
    
    if (allJobsForSkill.length > 0) {
      try {
        const jobsToInsert = allJobsForSkill.filter(j => j.externalUrl).map(jobData => ({
          title: String(jobData.title || '').substring(0, 100),
          skill: String(jobData.skill || 'general').toLowerCase(),
          description: jobData.description || 'No description provided.',
          city: jobData.city || 'Remote',
          companyName: jobData.companyName || 'External Company',
          isExternal: true,
          source: jobData.source,
          externalUrl: jobData.externalUrl,
          status: 'active',
          location: {
            latitude: jobData.latitude || null,
            longitude: jobData.longitude || null,
            city: jobData.city || '',
          }
        }));

        const insertedJobs = await JobPost.insertMany(jobsToInsert, { ordered: false });
        insertedCount += insertedJobs.length;

        // Process side effects for successfully inserted (non-duplicate) jobs
        for (const newJob of insertedJobs) {
          const recruiterEmail = extractEmail(newJob.description) || extractEmail(newJob.title);
          const matchedUserIds = await notifyProvidersOfNewJob(newJob);
          if (matchedUserIds && matchedUserIds.length > 0 && recruiterEmail) {
            await sendExternalRecruiterMatchEmail(newJob, recruiterEmail, matchedUserIds.length);
          }
        }

      } catch (err) {
        // Expected duplicate keys will throw an error when ordered: false, but insertedDocs contains successful ones
        if (err.code === 11000 || err.writeErrors) {
           const successfullyInserted = err.insertedDocs || [];
           insertedCount += successfullyInserted.length;
           for (const newJob of successfullyInserted) {
             const recruiterEmail = extractEmail(newJob.description) || extractEmail(newJob.title);
             const matchedUserIds = await notifyProvidersOfNewJob(newJob);
             if (matchedUserIds && matchedUserIds.length > 0 && recruiterEmail) {
               await sendExternalRecruiterMatchEmail(newJob, recruiterEmail, matchedUserIds.length);
             }
           }
        } else {
           console.error('Error saving external jobs batch:', err.message);
        }
      }
    }

    // Delay 2 seconds between skill requests to respect API rate limits
    await delay(2000); 
  }
  
  console.log(`Job scraper finished. Inserted ${insertedCount} new external jobs.`);
};

let scheduledScrape = null;

// Run every night at 2:00 AM, but only when the HTTP entry point explicitly
// enables crawler cron jobs. Importing this module must remain side-effect free.
function startJobScraperCron() {
  if (scheduledScrape) return scheduledScrape;
  scheduledScrape = cron.schedule('0 2 * * *', runJobScraper);
  return scheduledScrape;
}

// Allow manual execution: node workers/jobScraper.js
if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
  const connectDB = require('../config/db');
  const prisma = require('../config/prisma');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing. Make sure .env is accessible.');
    process.exit(1);
  }

  connectDB()
    .then(() => {
      console.log('Connected to PostgreSQL for manual scraping...');
      return runJobScraper();
    })
    .then(async () => {
      await prisma.$disconnect();
      console.log('Manual scraping complete. Exiting.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error during manual scrape:', err);
      process.exit(1);
    });
}

module.exports = {
  runJobScraper,
  startJobScraperCron,
};
