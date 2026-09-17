const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const CountryConfig = require('../legacy-mongoose-models/CountryConfig');
const JobSourceConfig = require('../legacy-mongoose-models/JobSourceConfig');

const seedCountries = [
  {
    countryCode: 'IN',
    countryName: 'India',
    slug: 'india',
    currency: 'INR',
    currencySymbol: '₹',
    phoneCode: '+91',
    timezone: 'Asia/Kolkata',
    isActive: false,
    isJobSyncEnabled: false,
    isSeoEnabled: false,
    isNotificationEnabled: false,
    isPricingEnabled: false,
    supportedJobSources: ['adzuna', 'jooble', 'themuse', 'arbeitnow', 'remoteok', 'remotive'],
    supportedAtsSources: ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable'],
    defaultLanguage: 'en',
    allowedLanguages: ['en', 'hi'],
    salaryFormat: { type: 'monthly', minSalary: 10000, maxSalary: 500000 },
    jobTypes: ['full_time', 'part_time', 'remote', 'internship'],
    categories: ['IT & Software', 'Marketing', 'Sales', 'Customer Service'],
    skills: ['react', 'node', 'javascript', 'python', 'sales'],
    seoRules: { generateCountryPages: true, generateCityPages: true, generateSkillPages: true, generateCategoryPages: true, minimumJobsForSeoPage: 10 },
    notificationRules: { dailyDigestEnabled: true, jobAlertEnabled: true, whatsappEnabled: true, smsEnabled: false, emailEnabled: true },
    pricingRules: { providerPlansEnabled: true, recruiterPlansEnabled: true, defaultCurrency: 'INR', taxName: 'GST', taxPercentage: 18 },
    syncRules: { dailySyncEnabled: true, syncFrequencyHours: 24, maxJobsPerSource: 500, maxPagesPerSource: 5, inactiveJobRetentionDays: 30 },
    validationStatus: 'setup_incomplete'
  },
  {
    countryCode: 'US',
    countryName: 'United States',
    slug: 'usa',
    currency: 'USD',
    currencySymbol: '$',
    phoneCode: '+1',
    timezone: 'America/New_York',
    isActive: false,
    isJobSyncEnabled: false,
    isSeoEnabled: false,
    isNotificationEnabled: false,
    isPricingEnabled: false,
    supportedJobSources: ['adzuna', 'jooble', 'usajobs', 'themuse', 'arbeitnow', 'remoteok', 'remotive'],
    supportedAtsSources: ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable'],
    defaultLanguage: 'en',
    allowedLanguages: ['en', 'es'],
    salaryFormat: { type: 'yearly', minSalary: 30000, maxSalary: 250000 },
    jobTypes: ['full_time', 'part_time', 'remote', 'internship'],
    categories: ['IT & Software', 'Healthcare', 'Finance', 'Engineering'],
    skills: ['react', 'java', 'management', 'nursing', 'sales'],
    seoRules: { generateCountryPages: true, generateCityPages: true, generateSkillPages: true, generateCategoryPages: true, minimumJobsForSeoPage: 10 },
    notificationRules: { dailyDigestEnabled: true, jobAlertEnabled: true, whatsappEnabled: false, smsEnabled: true, emailEnabled: true },
    pricingRules: { providerPlansEnabled: true, recruiterPlansEnabled: true, defaultCurrency: 'USD', taxName: 'Sales Tax', taxPercentage: 8 },
    syncRules: { dailySyncEnabled: true, syncFrequencyHours: 24, maxJobsPerSource: 500, maxPagesPerSource: 5, inactiveJobRetentionDays: 30 },
    validationStatus: 'setup_incomplete'
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    slug: 'uk',
    currency: 'GBP',
    currencySymbol: '£',
    phoneCode: '+44',
    timezone: 'Europe/London',
    isActive: false,
    isJobSyncEnabled: false,
    isSeoEnabled: false,
    isNotificationEnabled: false,
    isPricingEnabled: false,
    supportedJobSources: ['adzuna', 'jooble', 'themuse', 'arbeitnow', 'remoteok', 'remotive'],
    supportedAtsSources: ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable'],
    defaultLanguage: 'en',
    allowedLanguages: ['en'],
    salaryFormat: { type: 'yearly', minSalary: 20000, maxSalary: 150000 },
    jobTypes: ['full_time', 'part_time', 'remote', 'internship'],
    categories: ['IT & Software', 'Education', 'Finance', 'Admin'],
    skills: ['javascript', 'teacher', 'admin', 'accounting'],
    seoRules: { generateCountryPages: true, generateCityPages: true, generateSkillPages: true, generateCategoryPages: true, minimumJobsForSeoPage: 10 },
    notificationRules: { dailyDigestEnabled: true, jobAlertEnabled: true, whatsappEnabled: true, smsEnabled: false, emailEnabled: true },
    pricingRules: { providerPlansEnabled: true, recruiterPlansEnabled: true, defaultCurrency: 'GBP', taxName: 'VAT', taxPercentage: 20 },
    syncRules: { dailySyncEnabled: true, syncFrequencyHours: 24, maxJobsPerSource: 500, maxPagesPerSource: 5, inactiveJobRetentionDays: 30 },
    validationStatus: 'setup_incomplete'
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    slug: 'canada',
    currency: 'CAD',
    currencySymbol: 'C$',
    phoneCode: '+1',
    timezone: 'America/Toronto',
    isActive: false,
    isJobSyncEnabled: false,
    isSeoEnabled: false,
    isNotificationEnabled: false,
    isPricingEnabled: false,
    supportedJobSources: ['adzuna', 'jooble', 'themuse', 'arbeitnow', 'remoteok', 'remotive'],
    supportedAtsSources: ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable'],
    defaultLanguage: 'en',
    allowedLanguages: ['en', 'fr'],
    salaryFormat: { type: 'yearly', minSalary: 30000, maxSalary: 180000 },
    jobTypes: ['full_time', 'part_time', 'remote', 'internship'],
    categories: ['IT & Software', 'Retail', 'Logistics', 'Manufacturing'],
    skills: ['developer', 'warehouse', 'driver', 'customer service'],
    seoRules: { generateCountryPages: true, generateCityPages: true, generateSkillPages: true, generateCategoryPages: true, minimumJobsForSeoPage: 10 },
    notificationRules: { dailyDigestEnabled: true, jobAlertEnabled: true, whatsappEnabled: false, smsEnabled: false, emailEnabled: true },
    pricingRules: { providerPlansEnabled: true, recruiterPlansEnabled: true, defaultCurrency: 'CAD', taxName: 'GST/HST', taxPercentage: 13 },
    syncRules: { dailySyncEnabled: true, syncFrequencyHours: 24, maxJobsPerSource: 500, maxPagesPerSource: 5, inactiveJobRetentionDays: 30 },
    validationStatus: 'setup_incomplete'
  },
  {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    slug: 'uae',
    currency: 'AED',
    currencySymbol: 'AED',
    phoneCode: '+971',
    timezone: 'Asia/Dubai',
    isActive: false,
    isJobSyncEnabled: false,
    isSeoEnabled: false,
    isNotificationEnabled: false,
    isPricingEnabled: false,
    supportedJobSources: ['jooble', 'themuse', 'arbeitnow', 'remoteok', 'remotive'],
    supportedAtsSources: ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable'],
    defaultLanguage: 'en',
    allowedLanguages: ['en', 'ar'],
    salaryFormat: { type: 'monthly', minSalary: 3000, maxSalary: 80000 },
    jobTypes: ['full_time', 'part_time', 'remote'],
    categories: ['IT & Software', 'Sales', 'Real Estate', 'Hospitality'],
    skills: ['sales', 'developer', 'agent', 'receptionist'],
    seoRules: { generateCountryPages: true, generateCityPages: true, generateSkillPages: true, generateCategoryPages: true, minimumJobsForSeoPage: 10 },
    notificationRules: { dailyDigestEnabled: true, jobAlertEnabled: true, whatsappEnabled: true, smsEnabled: false, emailEnabled: true },
    pricingRules: { providerPlansEnabled: true, recruiterPlansEnabled: true, defaultCurrency: 'AED', taxName: 'VAT', taxPercentage: 5 },
    syncRules: { dailySyncEnabled: true, syncFrequencyHours: 24, maxJobsPerSource: 500, maxPagesPerSource: 5, inactiveJobRetentionDays: 30 },
    validationStatus: 'setup_incomplete'
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    slug: 'australia',
    currency: 'AUD',
    currencySymbol: 'A$',
    phoneCode: '+61',
    timezone: 'Australia/Sydney',
    isActive: false,
    isJobSyncEnabled: false,
    isSeoEnabled: false,
    isNotificationEnabled: false,
    isPricingEnabled: false,
    supportedJobSources: ['adzuna', 'jooble', 'themuse', 'arbeitnow', 'remoteok', 'remotive'],
    supportedAtsSources: ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable'],
    defaultLanguage: 'en',
    allowedLanguages: ['en'],
    salaryFormat: { type: 'yearly', minSalary: 45000, maxSalary: 220000 },
    jobTypes: ['full_time', 'part_time', 'remote', 'internship'],
    categories: ['IT & Software', 'Construction', 'Healthcare', 'Mining'],
    skills: ['react', 'carpenter', 'nurse', 'engineer'],
    seoRules: { generateCountryPages: true, generateCityPages: true, generateSkillPages: true, generateCategoryPages: true, minimumJobsForSeoPage: 10 },
    notificationRules: { dailyDigestEnabled: true, jobAlertEnabled: true, whatsappEnabled: true, smsEnabled: false, emailEnabled: true },
    pricingRules: { providerPlansEnabled: true, recruiterPlansEnabled: true, defaultCurrency: 'AUD', taxName: 'GST', taxPercentage: 10 },
    syncRules: { dailySyncEnabled: true, syncFrequencyHours: 24, maxJobsPerSource: 500, maxPagesPerSource: 5, inactiveJobRetentionDays: 30 },
    validationStatus: 'setup_incomplete'
  }
];

const seedSources = [
  { sourceName: 'greenhouse', sourceType: 'ats', isActive: true, supportedCountries: ['US', 'IN', 'GB', 'CA', 'AE', 'AU'], requiresApiKey: false },
  { sourceName: 'lever', sourceType: 'ats', isActive: true, supportedCountries: ['US', 'IN', 'GB', 'CA', 'AE', 'AU'], requiresApiKey: false },
  { sourceName: 'ashby', sourceType: 'ats', isActive: true, supportedCountries: ['US', 'IN', 'GB', 'CA', 'AE', 'AU'], requiresApiKey: false },
  { sourceName: 'smartrecruiters', sourceType: 'ats', isActive: true, supportedCountries: ['US', 'IN', 'GB', 'CA', 'AE', 'AU'], requiresApiKey: false },
  { sourceName: 'workable', sourceType: 'ats', isActive: true, supportedCountries: ['US', 'IN', 'GB', 'CA', 'AE', 'AU'], requiresApiKey: false },
  { sourceName: 'adzuna', sourceType: 'aggregator', isActive: true, supportedCountries: ['US', 'IN', 'GB', 'CA', 'AU'], requiresApiKey: true, apiCredentialsRef: 'ADZUNA_APP_KEY' },
  { sourceName: 'jooble', sourceType: 'aggregator', isActive: true, supportedCountries: ['US', 'IN', 'GB', 'CA', 'AE', 'AU'], requiresApiKey: true, apiCredentialsRef: 'JOOBLE_API_KEY' },
  { sourceName: 'usajobs', sourceType: 'government', isActive: true, supportedCountries: ['US'], requiresApiKey: true, apiCredentialsRef: 'USAJOBS_API_KEY' },
  { sourceName: 'themuse', sourceType: 'aggregator', isActive: true, supportedCountries: ['US', 'IN', 'GB', 'CA', 'AE', 'AU'], requiresApiKey: false },
  { sourceName: 'arbeitnow', sourceType: 'aggregator', isActive: true, supportedCountries: ['US', 'IN', 'GB', 'CA', 'AE', 'AU'], requiresApiKey: false },
  { sourceName: 'remoteok', sourceType: 'aggregator', isActive: true, supportedCountries: ['US', 'IN', 'GB', 'CA', 'AE', 'AU'], requiresApiKey: false },
  { sourceName: 'remotive', sourceType: 'aggregator', isActive: true, supportedCountries: ['US', 'IN', 'GB', 'CA', 'AE', 'AU'], requiresApiKey: false }
];

const runSeeder = async () => {
  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI environment variable not configured.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    // 1. Seed Countries
    for (const c of seedCountries) {
      const existing = await CountryConfig.findOne({ countryCode: c.countryCode });
      if (!existing) {
        await CountryConfig.create(c);
        console.log(`Seeded Country Config for: ${c.countryName} (${c.countryCode})`);
      } else {
        console.log(`Country Config for ${c.countryName} already exists. Skipping.`);
      }
    }

    // 2. Seed Sources
    for (const s of seedSources) {
      const existing = await JobSourceConfig.findOne({ sourceName: s.sourceName });
      if (!existing) {
        await JobSourceConfig.create(s);
        console.log(`Seeded Job Source Config for: ${s.sourceName}`);
      } else {
        console.log(`Job Source Config for ${s.sourceName} already exists. Skipping.`);
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

runSeeder();
