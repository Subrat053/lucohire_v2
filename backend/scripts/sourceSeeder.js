const mongoose = require('mongoose');
const dotenv = require('dotenv');
const DataSourceConfig = require('../legacy-mongoose-models/DataSourceConfig');

// Load env vars if running as standalone script
dotenv.config();

const defaultSources = [
  // GLOBAL
  {
    name: 'LinkedIn Talent API',
    country: 'Global',
    type: 'rest_api',
    endpointOrActorId: 'https://api.linkedin.com/v2/talent',
    apiMethod: 'GET',
    aiPromptTemplate: 'Extract name, email, phone, jobTitle, skills(array) from LinkedIn Talent response.',
    status: 'Approval-Based API',
    isActive: false
  },
  {
    name: 'Indeed Apply',
    country: 'Global',
    type: 'rest_api',
    endpointOrActorId: 'https://api.indeed.com/v2/apply',
    apiMethod: 'GET',
    aiPromptTemplate: 'Extract candidate details from Indeed format.',
    status: 'Approval-Based API',
    isActive: false
  },
  {
    name: 'Google Search Discovery (Apify)',
    country: 'Global',
    type: 'apify_actor',
    endpointOrActorId: 'apify/google-search-scraper',
    aiPromptTemplate: 'Extract candidate details from Google Search results. Look for LinkedIn, GitHub, or Portfolio links in snippets.',
    status: 'Ready / Free',
    isActive: true
  },
  // INDIA
  {
    name: 'Naukri Resdex',
    country: 'India',
    type: 'rest_api',
    endpointOrActorId: 'https://api.naukri.com/v1/resdex',
    apiMethod: 'POST',
    aiPromptTemplate: 'Extract from Naukri Resdex JSON: name, email, phone, jobTitle, skills.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  {
    name: 'Apna',
    country: 'India',
    type: 'apify_actor',
    endpointOrActorId: 'apify/apna-scraper',
    aiPromptTemplate: 'Extract candidate profile from Apna scraper output.',
    status: 'Locked Until Credentials Added',
    isActive: false
  },
  {
    name: 'foundit India',
    country: 'India',
    type: 'rest_api',
    endpointOrActorId: 'https://api.foundit.in/v1/search',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse foundit JSON payload to standard schema.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  {
    name: 'Shine',
    country: 'India',
    type: 'rest_api',
    endpointOrActorId: 'https://api.shine.com/v1/search',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse Shine JSON payload to standard schema.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  {
    name: 'TimesJobs',
    country: 'India',
    type: 'rest_api',
    endpointOrActorId: 'https://api.timesjobs.com/v1/search',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse TimesJobs JSON payload to standard schema.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  // USA
  {
    name: 'Dice',
    country: 'USA',
    type: 'rest_api',
    endpointOrActorId: 'https://api.dice.com/v1/search',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse Dice candidates.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  {
    name: 'ZipRecruiter',
    country: 'USA',
    type: 'rest_api',
    endpointOrActorId: 'https://api.ziprecruiter.com/v1/resume',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse ZipRecruiter candidates.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  {
    name: 'CareerBuilder',
    country: 'USA',
    type: 'rest_api',
    endpointOrActorId: 'https://api.careerbuilder.com/v1/resume',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse CareerBuilder candidates.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  // UK
  {
    name: 'CV-Library',
    country: 'UK',
    type: 'rest_api',
    endpointOrActorId: 'https://api.cv-library.co.uk/v1/resume',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse CV-Library candidates.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  {
    name: 'Reed',
    country: 'UK',
    type: 'rest_api',
    endpointOrActorId: 'https://api.reed.co.uk/v1/resume',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse Reed candidates.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  {
    name: 'Totaljobs',
    country: 'UK',
    type: 'rest_api',
    endpointOrActorId: 'https://api.totaljobs.com/v1/resume',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse Totaljobs candidates.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  // UAE
  {
    name: 'Bayt',
    country: 'UAE',
    type: 'rest_api',
    endpointOrActorId: 'https://api.bayt.com/v1/resume',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse Bayt candidates.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  {
    name: 'foundit Gulf',
    country: 'UAE',
    type: 'rest_api',
    endpointOrActorId: 'https://api.founditgulf.com/v1/search',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse foundit Gulf candidates.',
    status: 'Paid / Subscription Required',
    isActive: false
  },
  {
    name: 'Gulftalent',
    country: 'UAE',
    type: 'rest_api',
    endpointOrActorId: 'https://api.gulftalent.com/v1/search',
    apiMethod: 'POST',
    aiPromptTemplate: 'Parse Gulftalent candidates.',
    status: 'Paid / Subscription Required',
    isActive: false
  }
];

const seedSources = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lucohire', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB');
    }

    let addedCount = 0;
    for (const source of defaultSources) {
      const exists = await DataSourceConfig.findOne({ name: source.name, country: source.country });
      if (!exists) {
        await DataSourceConfig.create(source);
        addedCount++;
        console.log(`+ Added: ${source.name} (${source.country})`);
      }
    }
    console.log(`Seeding complete. Added ${addedCount} new sources.`);
    
    if (require.main === module) {
      process.exit(0);
    }
  } catch (err) {
    console.error('Seeding error:', err);
    if (require.main === module) {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  seedSources();
}

module.exports = seedSources;
