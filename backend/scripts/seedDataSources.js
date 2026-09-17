const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const DataSourceConfig = require('../legacy-mongoose-models/DataSourceConfig');

const predefinedSources = [
  // ================= INDIA =================
  {
    name: 'Naukri Resdex', country: 'India', type: 'csv_upload',
    endpointOrActorId: 'naukri-resdex-integration',
    status: 'Paid / Subscription Required',
    aiPromptTemplate: 'Extract candidate details from Naukri CSV upload: name, email, phone, jobTitle, skills, location, resumeUpdatedAt. Return JSON array.'
  },
  {
    name: 'Apna Employer', country: 'India', type: 'rest_api',
    endpointOrActorId: 'https://api.apna.co/employer/v1/applicants',
    status: 'Paid / Business Access Dependent',
    aiPromptTemplate: 'Extract applicants from Apna API response: name, phone, city, jobTitle, skills. Return JSON array.'
  },
  {
    name: 'foundit Recruiter India', country: 'India', type: 'csv_upload',
    endpointOrActorId: 'foundit-india-integration',
    status: 'Paid / Subscription Required',
    aiPromptTemplate: 'Extract candidates from foundit CSV. Find name, email, phone, skills. Return JSON array.'
  },
  {
    name: 'Shine Recruiter', country: 'India', type: 'csv_upload',
    endpointOrActorId: 'shine-india-integration',
    status: 'Paid / Subscription Required',
    aiPromptTemplate: 'Extract candidate details from Shine CSV. Return JSON array.'
  },
  {
    name: 'TimesJobs Recruiter', country: 'India', type: 'csv_upload',
    endpointOrActorId: 'timesjobs-india-integration',
    status: 'Paid / Subscription Required',
    aiPromptTemplate: 'Extract candidate details from TimesJobs CSV. Return JSON array.'
  },
  {
    name: 'Indeed Apply India', country: 'India', type: 'rest_api',
    endpointOrActorId: 'https://api.indeed.com/v1/applicants',
    status: 'Partner/API Approval Required',
    aiPromptTemplate: 'Extract Indeed applicant data: name, email, phone, location, jobTitle. Return JSON array.'
  },
  {
    name: 'LinkedIn Talent API India', country: 'India', type: 'rest_api',
    endpointOrActorId: 'https://api.linkedin.com/v2/talent',
    status: 'Partner/API Approval Required',
    aiPromptTemplate: 'Extract approved LinkedIn talent profile data. NO SCRAPING. Return JSON array.'
  },
  {
    name: 'Apify India', country: 'India', type: 'apify_actor',
    endpointOrActorId: 'some-actor/naukri-scraper',
    status: 'Usage-Based',
    aiPromptTemplate: 'Extract candidates from Apify run: name, jobTitle, skills, location, openToWork. Return JSON array.'
  },

  // ================= USA =================
  {
    name: 'Dice', country: 'USA', type: 'rest_api',
    endpointOrActorId: 'https://api.dice.com/v1/resumes',
    status: 'Paid / Subscription Required',
    aiPromptTemplate: 'Extract tech candidates from Dice API: name, email, tech skills, location, work authorization. Return JSON array.'
  },
  {
    name: 'Resume-Library USA', country: 'USA', type: 'rest_api',
    endpointOrActorId: 'https://api.resume-library.com/v1/search',
    status: 'Paid / Subscription Required',
    aiPromptTemplate: 'Extract candidates from Resume-Library: name, email, skills, experience. Return JSON array.'
  },
  {
    name: 'Indeed Apply USA', country: 'USA', type: 'rest_api',
    endpointOrActorId: 'https://api.indeed.com/v1/applicants',
    status: 'Partner/API Approval Required',
    aiPromptTemplate: 'Extract Indeed applicant data: name, email, phone, location, jobTitle. Return JSON array.'
  },
  {
    name: 'LinkedIn Talent API USA', country: 'USA', type: 'rest_api',
    endpointOrActorId: 'https://api.linkedin.com/v2/talent',
    status: 'Partner/API Approval Required',
    aiPromptTemplate: 'Extract approved LinkedIn talent profile data. NO SCRAPING. Return JSON array.'
  },
  {
    name: 'Google Search Discovery USA', country: 'USA', type: 'rest_api',
    endpointOrActorId: 'https://customsearch.googleapis.com/customsearch/v1',
    status: 'Limited Free / Query-Based Billing',
    aiPromptTemplate: 'Extract candidate details from Google Search results snippets. Return JSON array.'
  },
  {
    name: 'Apify USA', country: 'USA', type: 'apify_actor',
    endpointOrActorId: 'some-actor/usa-jobs',
    status: 'Usage-Based',
    aiPromptTemplate: 'Extract candidates from Apify run: name, jobTitle, skills, location, openToWork. Return JSON array.'
  },

  // ================= UK =================
  {
    name: 'Reed.co.uk Recruiter API', country: 'UK', type: 'rest_api',
    endpointOrActorId: 'https://www.reed.co.uk/api/1.0/search',
    status: 'Account/API Access Required',
    aiPromptTemplate: 'Extract candidates from Reed API. Return JSON array.'
  },
  {
    name: 'CV-Library', country: 'UK', type: 'rest_api',
    endpointOrActorId: 'https://api.cv-library.co.uk/v1',
    status: 'Paid / Subscription Required',
    aiPromptTemplate: 'Extract candidates from CV-Library API. Return JSON array.'
  },
  {
    name: 'Indeed Apply UK', country: 'UK', type: 'rest_api',
    endpointOrActorId: 'https://api.indeed.com/v1/applicants',
    status: 'Partner/API Approval Required',
    aiPromptTemplate: 'Extract Indeed applicant data. Return JSON array.'
  },
  {
    name: 'LinkedIn Talent API UK', country: 'UK', type: 'rest_api',
    endpointOrActorId: 'https://api.linkedin.com/v2/talent',
    status: 'Partner/API Approval Required',
    aiPromptTemplate: 'Extract approved LinkedIn talent profile data. NO SCRAPING. Return JSON array.'
  },
  {
    name: 'Google Search Discovery UK', country: 'UK', type: 'rest_api',
    endpointOrActorId: 'https://customsearch.googleapis.com/customsearch/v1',
    status: 'Query-Based Billing',
    aiPromptTemplate: 'Extract candidate details from Google Search results snippets. Return JSON array.'
  },
  {
    name: 'Apify UK', country: 'UK', type: 'apify_actor',
    endpointOrActorId: 'some-actor/uk-jobs',
    status: 'Usage-Based',
    aiPromptTemplate: 'Extract candidates from Apify run: name, jobTitle, skills, location. Return JSON array.'
  },

  // ================= CANADA =================
  {
    name: 'Job Bank Canada', country: 'Canada', type: 'rest_api',
    endpointOrActorId: 'https://jobbank.gc.ca/api',
    status: 'Mostly Free / Public Data',
    aiPromptTemplate: 'Extract candidate/applicant details. Note: private data may be masked. Return JSON array.'
  },
  {
    name: 'Indeed Apply Canada', country: 'Canada', type: 'rest_api',
    endpointOrActorId: 'https://api.indeed.com/v1/applicants',
    status: 'Partner/API Approval Required',
    aiPromptTemplate: 'Extract Indeed applicant data. Return JSON array.'
  },
  {
    name: 'LinkedIn Talent API Canada', country: 'Canada', type: 'rest_api',
    endpointOrActorId: 'https://api.linkedin.com/v2/talent',
    status: 'Partner/API Approval Required',
    aiPromptTemplate: 'Extract approved LinkedIn talent profile data. NO SCRAPING. Return JSON array.'
  },
  {
    name: 'Google Search Discovery Canada', country: 'Canada', type: 'rest_api',
    endpointOrActorId: 'https://customsearch.googleapis.com/customsearch/v1',
    status: 'Query-Based Billing',
    aiPromptTemplate: 'Extract candidate details from Google Search results snippets. Return JSON array.'
  },
  {
    name: 'Apify Canada', country: 'Canada', type: 'apify_actor',
    endpointOrActorId: 'some-actor/canada-jobs',
    status: 'Usage-Based',
    aiPromptTemplate: 'Extract candidates from Apify run: name, jobTitle, skills, location. Return JSON array.'
  },

  // ================= UAE =================
  {
    name: 'Bayt Employer / CV Search', country: 'UAE', type: 'csv_upload',
    endpointOrActorId: 'bayt-uae-integration',
    status: 'Paid / Subscription Required',
    aiPromptTemplate: 'Extract candidates from Bayt CSV or API. Find name, email, phone, location, skills. Return JSON array.'
  },
  {
    name: 'foundit Gulf', country: 'UAE', type: 'csv_upload',
    endpointOrActorId: 'founditgulf-uae-integration',
    status: 'Paid / Subscription Required',
    aiPromptTemplate: 'Extract candidates from foundit Gulf. Find name, email, phone, skills. Return JSON array.'
  },
  {
    name: 'LinkedIn Talent API UAE', country: 'UAE', type: 'rest_api',
    endpointOrActorId: 'https://api.linkedin.com/v2/talent',
    status: 'Partner/API Approval Required',
    aiPromptTemplate: 'Extract approved LinkedIn talent profile data. NO SCRAPING. Return JSON array.'
  },
  {
    name: 'Indeed Apply UAE', country: 'UAE', type: 'rest_api',
    endpointOrActorId: 'https://api.indeed.com/v1/applicants',
    status: 'Partner/API Approval Required',
    aiPromptTemplate: 'Extract Indeed applicant data. Return JSON array.'
  },
  {
    name: 'Google Search Discovery UAE', country: 'UAE', type: 'rest_api',
    endpointOrActorId: 'https://customsearch.googleapis.com/customsearch/v1',
    status: 'Query-Based Billing',
    aiPromptTemplate: 'Extract candidate details from Google Search results snippets. Return JSON array.'
  },
  {
    name: 'Apify UAE', country: 'UAE', type: 'apify_actor',
    endpointOrActorId: 'some-actor/uae-jobs',
    status: 'Usage-Based',
    aiPromptTemplate: 'Extract candidates from Apify run: name, jobTitle, skills, location. Return JSON array.'
  }
];

async function seedDataSources() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/servicehub', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB.");

    for (const source of predefinedSources) {
      const exists = await DataSourceConfig.findOne({ name: source.name, country: source.country });
      if (!exists) {
        await DataSourceConfig.create(source);
        console.log(`Created: ${source.name} (${source.country})`);
      } else {
        // Optional: update status if it changed
        await DataSourceConfig.updateOne({ _id: exists._id }, { $set: { status: source.status }});
        console.log(`Exists (Updated Status): ${source.name} (${source.country})`);
      }
    }
    console.log("Database Seeding Complete.");
    process.exit(0);
  } catch (err) {
    console.error("Error during seeding:", err.message);
    process.exit(1);
  }
}

seedDataSources();
