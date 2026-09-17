const connectDB = require('../config/db');
const dotenv = require('dotenv');
const CountryPipelineConfig = require('../models/pipeline/CountryPipelineConfig');
const Category = require('../models/pipeline/Category');
const SourceConfidence = require('../models/pipeline/SourceConfidence');

dotenv.config();

const seedCountries = async () => {
  const countries = [
    { countryCode: 'IN', countryName: 'India', defaultLocations: ['Delhi NCR', 'Mumbai', 'Bangalore'] },
    { countryCode: 'US', countryName: 'USA', defaultLocations: ['New York', 'San Francisco', 'Austin'] },
    { countryCode: 'UK', countryName: 'UK', defaultLocations: ['London', 'Manchester'] },
    { countryCode: 'CA', countryName: 'Canada', defaultLocations: ['Toronto', 'Vancouver'] },
    { countryCode: 'AE', countryName: 'UAE', defaultLocations: ['Dubai', 'Abu Dhabi'] }
  ];

  for (const c of countries) {
    await CountryPipelineConfig.findOneAndUpdate(
      { countryCode: c.countryCode },
      { $setOnInsert: { ...c, isEnabled: c.countryCode === 'IN' ? true : false } },
      { upsert: true }
    );
  }
  console.log('Seeded Countries.');
};

const seedCategories = async () => {
  const categories = [
    { name: 'IT', keywords: ['developer', 'software', 'react', 'node', 'engineer'] },
    { name: 'Healthcare', keywords: ['nurse', 'hospital', 'medical', 'doctor'] },
    { name: 'Finance', keywords: ['accountant', 'finance', 'audit', 'bank'] },
    { name: 'Sales', keywords: ['sales', 'business development', 'b2b'] },
    { name: 'Marketing', keywords: ['marketing', 'seo', 'social media'] },
    { name: 'Education', keywords: ['teacher', 'education', 'tutor'] },
    { name: 'Hospitality', keywords: ['hotel', 'restaurant', 'chef', 'waiter'] },
    { name: 'Logistics', keywords: ['logistics', 'delivery', 'warehouse'] },
    { name: 'Admin', keywords: ['admin', 'receptionist', 'assistant'] },
    { name: 'Customer Support', keywords: ['support', 'customer service', 'call center'] },
    { name: 'Other', keywords: [] }
  ];

  for (const cat of categories) {
    await Category.findOneAndUpdate(
      { name: cat.name },
      { $setOnInsert: { ...cat, isSystemDefault: true } },
      { upsert: true }
    );
  }
  console.log('Seeded Categories.');
};

const seedConfidenceScores = async () => {
  const scores = [
    { sourceName: 'Company Career Page', sourceType: 'company_career', confidenceScore: 100 },
    { sourceName: 'Workday', sourceType: 'ats', confidenceScore: 98 },
    { sourceName: 'Greenhouse', sourceType: 'ats', confidenceScore: 97 },
    { sourceName: 'Lever', sourceType: 'ats', confidenceScore: 97 },
    { sourceName: 'Ashby', sourceType: 'ats', confidenceScore: 95 },
    { sourceName: 'SmartRecruiters', sourceType: 'ats', confidenceScore: 94 },
    { sourceName: 'Workable', sourceType: 'ats', confidenceScore: 93 },
    { sourceName: 'JSearch Aggregated', sourceType: 'aggregated', confidenceScore: 90 }
  ];

  for (const score of scores) {
    await SourceConfidence.findOneAndUpdate(
      { sourceName: score.sourceName },
      { $setOnInsert: score },
      { upsert: true }
    );
  }
  console.log('Seeded Source Confidence Scores.');
};

const runSeeder = async () => {
  try {
    await connectDB();
    await seedCountries();
    await seedCategories();
    await seedConfidenceScores();
    console.log('Seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

runSeeder();
